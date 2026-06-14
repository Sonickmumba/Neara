const pool = require('../config/database');
const { generateId } = require('./helpers');
const {
  distanceKmExpression,
  hasPostgisLocationColumns,
  haversineDistanceKmExpression,
  haversineWithinRadiusKmExpression,
  withinRadiusKmExpression,
} = require('./spatial');

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

  const usePostgis = await hasPostgisLocationColumns(pool);
  const distanceExpression = usePostgis
    ? distanceKmExpression('location_geog', '$1', '$2')
    : haversineDistanceKmExpression(
        '$1',
        '$2',
        'location_lat',
        'location_lng'
      );
  const locationNotNull = usePostgis
    ? 'location_geog IS NOT NULL'
    : 'location_lat IS NOT NULL AND location_lng IS NOT NULL';
  const withinRadiusExpression = usePostgis
    ? withinRadiusKmExpression('location_geog', '$1', '$2', '10')
    : haversineWithinRadiusKmExpression(
        '$1',
        '$2',
        '10',
        'location_lat',
        'location_lng'
      );

  const { rows: users } = await pool.query(
    `
    SELECT
      id,
      (${distanceExpression}) AS distance
    FROM users
    WHERE id <> $3
      AND ${locationNotNull}
      AND ${withinRadiusExpression}
    ORDER BY distance ASC
    LIMIT 50
    `,
    [listingLat, listingLng, creatorId]
  );

  return Promise.all(
    users.map((user) =>
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
