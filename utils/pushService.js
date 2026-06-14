const webpush = require('web-push');
const pool = require('../config/database');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const typePreferenceColumn = {
  message: 'new_messages',
  trade: 'trade_updates',
  review: 'review_alerts',
  listing: 'new_listings',
};

async function shouldSendPush(userId, type) {
  try {
    const { rows } = await pool.query(
      `
      SELECT push_enabled, new_messages, trade_updates, review_alerts, new_listings
      FROM notification_settings
      WHERE user_id = $1
      `,
      [userId]
    );

    if (!rows.length) return true;

    const settings = rows[0];
    if (settings.push_enabled === false) return false;

    const preferenceColumn = typePreferenceColumn[type];
    if (preferenceColumn && settings[preferenceColumn] === false) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('[push] settings fetch error:', err.message);
    return true;
  }
}

/**
 * Send a push notification to all subscribed devices for a user.
 * Fire-and-forget — never throws; expired subscriptions are auto-deleted.
 *
 * @param {string} userId
 * @param {{ type?: string, title: string, body: string, url?: string, conversationId?: string }} payload
 */
async function sendPushToUser(userId, payload) {
  if (!(await shouldSendPush(userId, payload?.type))) return;

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
