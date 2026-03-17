const pool = require('../config/database');
const { calculateUserBadges } = require('../utils/helpers');

const DEFAULT_NOTIFICATION_SETTINGS = {
  push: true,
  email: true,
  sms: false,
  messages: true,
  trades: true,
  reviews: true,
  community: false,
};

const DEFAULT_PRIVACY_SETTINGS = {
  showEmail: false,
  showPhone: false,
  showLocation: true,
  publicProfile: true,
};

let settingsSchemaReadyPromise = null;

const ensureSettingsSchema = async () => {
  if (!settingsSchemaReadyPromise) {
    settingsSchemaReadyPromise = (async () => {
      await pool.query(`
        ALTER TABLE notification_settings
        ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS review_alerts BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS community_updates BOOLEAN DEFAULT FALSE;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_privacy_settings (
          user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          show_email BOOLEAN DEFAULT FALSE,
          show_phone BOOLEAN DEFAULT FALSE,
          show_location BOOLEAN DEFAULT TRUE,
          public_profile BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        DROP TRIGGER IF EXISTS trg_user_privacy_settings_updated
        ON user_privacy_settings;
      `);

      await pool.query(`
        CREATE TRIGGER trg_user_privacy_settings_updated
        BEFORE UPDATE ON user_privacy_settings
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    })();
  }

  return settingsSchemaReadyPromise;
};

const mapNotificationRow = (row) => ({
  push: row?.push_enabled ?? DEFAULT_NOTIFICATION_SETTINGS.push,
  email: row?.email_enabled ?? DEFAULT_NOTIFICATION_SETTINGS.email,
  sms: row?.sms_enabled ?? DEFAULT_NOTIFICATION_SETTINGS.sms,
  messages: row?.new_messages ?? DEFAULT_NOTIFICATION_SETTINGS.messages,
  trades: row?.trade_updates ?? DEFAULT_NOTIFICATION_SETTINGS.trades,
  reviews: row?.review_alerts ?? DEFAULT_NOTIFICATION_SETTINGS.reviews,
  community: row?.community_updates ?? DEFAULT_NOTIFICATION_SETTINGS.community,
});

const mapPrivacyRow = (row) => ({
  showEmail: row?.show_email ?? DEFAULT_PRIVACY_SETTINGS.showEmail,
  showPhone: row?.show_phone ?? DEFAULT_PRIVACY_SETTINGS.showPhone,
  showLocation: row?.show_location ?? DEFAULT_PRIVACY_SETTINGS.showLocation,
  publicProfile: row?.public_profile ?? DEFAULT_PRIVACY_SETTINGS.publicProfile,
});

const ensureUserSettingsRows = async (userId) => {
  await pool.query(
    `
    INSERT INTO notification_settings (
      user_id,
      push_enabled,
      email_enabled,
      sms_enabled,
      new_messages,
      trade_updates,
      review_alerts,
      community_updates
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id) DO NOTHING
    `,
    [
      userId,
      DEFAULT_NOTIFICATION_SETTINGS.push,
      DEFAULT_NOTIFICATION_SETTINGS.email,
      DEFAULT_NOTIFICATION_SETTINGS.sms,
      DEFAULT_NOTIFICATION_SETTINGS.messages,
      DEFAULT_NOTIFICATION_SETTINGS.trades,
      DEFAULT_NOTIFICATION_SETTINGS.reviews,
      DEFAULT_NOTIFICATION_SETTINGS.community,
    ]
  );

  await pool.query(
    `
    INSERT INTO user_privacy_settings (
      user_id,
      show_email,
      show_phone,
      show_location,
      public_profile
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id) DO NOTHING
    `,
    [
      userId,
      DEFAULT_PRIVACY_SETTINGS.showEmail,
      DEFAULT_PRIVACY_SETTINGS.showPhone,
      DEFAULT_PRIVACY_SETTINGS.showLocation,
      DEFAULT_PRIVACY_SETTINGS.publicProfile,
    ]
  );
};

exports.getUserSettings = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await ensureSettingsSchema();
    await ensureUserSettingsRows(userId);

    const [notificationResult, privacyResult] = await Promise.all([
      pool.query(
        `
        SELECT
          push_enabled,
          email_enabled,
          sms_enabled,
          new_messages,
          trade_updates,
          review_alerts,
          community_updates
        FROM notification_settings
        WHERE user_id = $1
        `,
        [userId]
      ),
      pool.query(
        `
        SELECT show_email, show_phone, show_location, public_profile
        FROM user_privacy_settings
        WHERE user_id = $1
        `,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        notifications: mapNotificationRow(notificationResult.rows[0]),
        privacy: mapPrivacyRow(privacyResult.rows[0]),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserSettings = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notifications = req.body?.notifications;
    const privacy = req.body?.privacy;

    if (!notifications && !privacy) {
      return res.status(400).json({
        success: false,
        message: 'No settings payload provided',
      });
    }

    await ensureSettingsSchema();
    await ensureUserSettingsRows(userId);

    if (notifications) {
      await pool.query(
        `
        UPDATE notification_settings
        SET
          push_enabled = COALESCE($2, push_enabled),
          email_enabled = COALESCE($3, email_enabled),
          sms_enabled = COALESCE($4, sms_enabled),
          new_messages = COALESCE($5, new_messages),
          trade_updates = COALESCE($6, trade_updates),
          review_alerts = COALESCE($7, review_alerts),
          community_updates = COALESCE($8, community_updates),
          updated_at = NOW()
        WHERE user_id = $1
        `,
        [
          userId,
          notifications.push,
          notifications.email,
          notifications.sms,
          notifications.messages,
          notifications.trades,
          notifications.reviews,
          notifications.community,
        ]
      );
    }

    if (privacy) {
      await pool.query(
        `
        UPDATE user_privacy_settings
        SET
          show_email = COALESCE($2, show_email),
          show_phone = COALESCE($3, show_phone),
          show_location = COALESCE($4, show_location),
          public_profile = COALESCE($5, public_profile),
          updated_at = NOW()
        WHERE user_id = $1
        `,
        [
          userId,
          privacy.showEmail,
          privacy.showPhone,
          privacy.showLocation,
          privacy.publicProfile,
        ]
      );
    }

    const [notificationResult, privacyResult] = await Promise.all([
      pool.query(
        `
        SELECT
          push_enabled,
          email_enabled,
          sms_enabled,
          new_messages,
          trade_updates,
          review_alerts,
          community_updates
        FROM notification_settings
        WHERE user_id = $1
        `,
        [userId]
      ),
      pool.query(
        `
        SELECT show_email, show_phone, show_location, public_profile
        FROM user_privacy_settings
        WHERE user_id = $1
        `,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        notifications: mapNotificationRow(notificationResult.rows[0]),
        privacy: mapPrivacyRow(privacyResult.rows[0]),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { rows } = await pool.query(
      `
      SELECT 
        id, name, email, phone, neighborhood,
        location_lat, location_lng,
        profile_image_url, bio,
        rating, total_ratings, completed_trades,
        phone_verified, email_verified, created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = rows[0];

    const { rows: activeListings } = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM listings
      WHERE user_id = $1 AND status = 'active'
      `,
      [userId]
    );

    user.activeListings = activeListings[0].count;
    user.memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    user.badges = calculateUserBadges(user);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { name, phone, bio, neighborhood, profile_image_url } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone || null);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${idx++}`);
      values.push(bio);
    }
    if (neighborhood) {
      updates.push(`neighborhood = $${idx++}`);
      values.push(neighborhood);
    }
    if (profile_image_url) {
      updates.push(`profile_image_url = $${idx++}`);
      values.push(profile_image_url);
    }

    if (!updates.length) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided',
      });
    }

    values.push(userId);

    await pool.query(
      `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}
      `,
      values
    );

    const { rows } = await pool.query(
      `
      SELECT id, name, email, phone, bio, neighborhood, profile_image_url
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteOwnAccount = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [
      userId,
    ]);

    if (!rowCount) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.logout) {
      req.logout(() => {});
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.userId;

    const { rows } = await pool.query(
      `
      SELECT rating, total_ratings, completed_trades, created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = rows[0];

    const { rows: activeListings } = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM listings
      WHERE user_id = $1 AND status = 'active'
      `,
      [userId]
    );

    const { rows: responseTime } = await pool.query(
      `
      SELECT AVG(
        EXTRACT(EPOCH FROM (m.created_at - c.created_at)) / 3600
      ) AS avg_hours
      FROM conversations c
      JOIN (
        SELECT conversation_id, MIN(created_at) AS created_at
        FROM messages
        WHERE sender_id = $1
        GROUP BY conversation_id
      ) m ON c.id = m.conversation_id
      WHERE c.participant1_id = $1 OR c.participant2_id = $1
      `,
      [userId]
    );

    res.json({
      success: true,
      data: {
        rating: Number(user.rating) || 0,
        totalRatings: user.total_ratings || 0,
        completedTrades: user.completed_trades || 0,
        activeListings: activeListings[0].count,
        averageResponseTime: responseTime[0].avg_hours
          ? `${Math.round(responseTime[0].avg_hours)}h`
          : 'N/A',
        memberSince: new Date(user.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserListings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status = 'active' } = req.query;

    let query = `
      SELECT *
      FROM listings
      WHERE user_id = $1
    `;
    const params = [userId];

    if (status !== 'all') {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const { rows } = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { rows } = await pool.query(
      `
      SELECT
        r.*,
        u.name AS reviewer_name,
        u.profile_image_url AS reviewer_image
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
      `,
      [userId]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserBadges = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const dbBadgesResult = await pool.query(
      `
      SELECT id, badge_id, badge_name, earned_at
      FROM user_badges
      WHERE user_id = $1
      ORDER BY earned_at DESC
      `,
      [userId]
    );

    if (dbBadgesResult.rows.length > 0) {
      const iconByBadgeId = {
        'trusted-trader': '⭐',
        'top-rated': '🏆',
        'early-adopter': '🌟',
        'active-trader': '🔥',
        verified: '✓',
      };

      const badges = dbBadgesResult.rows.map((row) => ({
        id: row.badge_id || row.id,
        name: row.badge_name,
        icon: iconByBadgeId[row.badge_id] || '🏅',
        earnedAt: row.earned_at,
      }));

      return res.json({
        success: true,
        count: badges.length,
        data: badges,
      });
    }

    const { rows } = await pool.query(
      `
      SELECT
        completed_trades,
        rating,
        total_ratings,
        phone_verified,
        email_verified,
        created_at
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const badges = calculateUserBadges(rows[0]);

    res.json({
      success: true,
      count: badges.length,
      data: badges,
    });
  } catch (error) {
    next(error);
  }
};
