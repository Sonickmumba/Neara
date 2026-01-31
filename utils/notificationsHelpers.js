const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a notification for a user (PostgreSQL)
 */
async function createNotification(
  userId,
  type,
  title,
  description,
  referenceId = null,
  referenceType = null,
  data = null
) {
  try {
    // 1. Check notification settings
    const settingsResult = await pool.query(
      `
      SELECT push_enabled
      FROM notification_settings
      WHERE user_id = $1
      `,
      [userId]
    );

    const pushEnabled =
      settingsResult.rows.length === 0 ||
      settingsResult.rows[0].push_enabled === true;

    if (!pushEnabled) return null;

    // 2. Insert notification
    const notificationId = uuidv4();

    const insertResult = await pool.query(
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
      RETURNING id
      `,
      [
        notificationId,
        userId,
        type,
        title,
        description,
        referenceId,
        referenceType,
        data, // JSONB (NO stringify)
      ]
    );

    return insertResult.rows[0].id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

async function notifyNewMessage(recipientId, senderId, senderName, conversationId) {
  return createNotification(
    recipientId,
    'message',
    'New Message',
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
    statusMessages[status] || 'Trade Update',
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
    'New Review',
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
  const usersResult = await pool.query(
    `
    SELECT u.id,
           ST_Distance(
             geography(ST_MakePoint(u.location_lng, u.location_lat)),
             geography(ST_MakePoint($2, $1))
           ) AS distance
    FROM users u
    WHERE ST_DWithin(
      geography(ST_MakePoint(u.location_lng, u.location_lat)),
      geography(ST_MakePoint($2, $1)),
      10000
    )
    AND u.id != $3
    `,
    [listingLat, listingLng, creatorId]
  );

  for (const user of usersResult.rows) {
    await createNotification(
      user.id,
      'listing',
      'New Listing Nearby',
      `"${listingTitle}" posted ${(user.distance / 1000).toFixed(1)} km from you`,
      listingId,
      'listing',
      {
        listingTitle,
        distance: user.distance,
      }
    );
  }
}


