const webpush = require('web-push');
const pool = require('../config/database');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to all subscribed devices for a user.
 * Fire-and-forget — never throws; expired subscriptions are auto-deleted.
 *
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, conversationId?: string }} payload
 */
async function sendPushToUser(userId, payload) {
  let subscriptions;
  try {
    const result = await pool.query(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    subscriptions = result.rows;
  } catch (err) {
    console.error('[push] DB fetch error:', err.message);
    return;
  }

  if (!subscriptions.length) return;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSub, JSON.stringify(payload));
      } catch (err) {
        // 410 Gone or 404 = subscription expired or revoked → delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [
            sub.id,
          ]);
        } else {
          throw err;
        }
      }
    })
  );

  results.forEach((r) => {
    if (r.status === 'rejected') {
      console.error('[push] send error:', r.reason?.message);
    }
  });
}

module.exports = { sendPushToUser };
