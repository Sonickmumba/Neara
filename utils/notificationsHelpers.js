const pool = require('../config/database');
const { generateId } = require('./helpers');

async function createNotification(
  userId,
  type,
  title,
  description,
  referenceId = null,
  referenceType = null,
  data = null
) {
  const { rows } = await pool.query(
    `
    INSERT INTO notifications (
      id,
      user_id,
      type,
      title,
      description,
      reference_id,
      reference_type,
      data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      generateId(),
      userId,
      type,
      title,
      description,
      referenceId,
      referenceType,
      data,
    ]
  );

  return rows[0];
}

async function notifyNewMessage(
  recipientId,
  senderId,
  senderName,
  conversationId
) {
  return createNotification(
    recipientId,
    'message',
    `New message from ${senderName}`,
    `${senderName} sent you a message`,
    conversationId,
    'conversation',
    { senderId, senderName }
  );
}

async function notifyTradeUpdate(userId, tradeId, status, listingTitle) {
  const statusMessages = {
    pending: 'New trade request',
    accepted: 'Trade accepted',
    completed: 'Trade completed',
    cancelled: 'Trade cancelled',
  };

  return createNotification(
    userId,
    'trade',
    statusMessages[status] || 'Trade update',
    `Trade for "${listingTitle}" has been ${status}`,
    tradeId,
    'trade',
    { status, listingTitle }
  );
}

async function notifyNewReview(userId, reviewerId, reviewerName, rating, tradeId) {
  return createNotification(
    userId,
    'review',
    'New review received',
    `${reviewerName} left you a ${rating}-star review`,
    tradeId,
    'review',
    { reviewerId, reviewerName, rating }
  );
}

async function notifyUsersNearbyListing(
  listingId,
  listingTitle,
  listingLat,
  listingLng,
  creatorId
) {
  if (listingLat == null || listingLng == null) return [];

  const { rows: users } = await pool.query(
    `
    SELECT
      id,
      (
        6371 * acos(
          LEAST(
            1,
            GREATEST(
              -1,
              cos(radians($1)) *
              cos(radians(location_lat)) *
              cos(radians(location_lng) - radians($2)) +
              sin(radians($1)) *
              sin(radians(location_lat))
            )
          )
        )
      ) AS distance
    FROM users
    WHERE id <> $3
      AND location_lat IS NOT NULL
      AND location_lng IS NOT NULL
    ORDER BY distance ASC
    LIMIT 50
    `,
    [listingLat, listingLng, creatorId]
  );

  const nearbyUsers = users.filter((user) => Number(user.distance) <= 10);

  return Promise.all(
    nearbyUsers.map((user) =>
      createNotification(
        user.id,
        'listing',
        'New listing nearby',
        `"${listingTitle}" posted ${Number(user.distance).toFixed(1)} km from you`,
        listingId,
        'listing',
        {
          listingTitle,
          distance: Number(user.distance),
        }
      )
    )
  );
}

module.exports = {
  createNotification,
  notifyNewMessage,
  notifyTradeUpdate,
  notifyNewReview,
  notifyUsersNearbyListing,
};
