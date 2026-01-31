const pool = require('../config/database');
const { calculateUserBadges } = require('../utils/helpers');


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
    const userId = req.user.userId;
    const { name, bio, neighborhood, profile_image_url } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
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
      SELECT id, name, email, bio, neighborhood, profile_image_url
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
