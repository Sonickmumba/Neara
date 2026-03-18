const pool = require('../config/database');
const { timeAgo } = require('../utils/helpers');

// Get recent activity feed (new listings near user)
exports.getRecentActivity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const hours = Number.parseInt(req.query.hours ?? 24, 10) || 24;
    const limit = Number.parseInt(req.query.limit ?? 20, 10) || 20;
    const offset = Number.parseInt(req.query.offset ?? 0, 10) || 0;
    const cappedLimit = Math.min(Math.max(limit, 1), 100);

    /* 1️⃣ Get user's location */
    const userResult = await pool.query(
      `SELECT location_lat, location_lng
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (
      userResult.rows.length === 0 ||
      !userResult.rows[0].location_lat ||
      !userResult.rows[0].location_lng
    ) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const { location_lat: userLat, location_lng: userLng } = userResult.rows[0];

    /* 2️⃣ Nearby recent listings */
    const listingsResult = await pool.query(
      `
      SELECT *
      FROM (
        SELECT
          l.*,
          u.name AS author_name,
          u.neighborhood AS author_neighborhood,
          u.rating AS author_rating,
          u.profile_image_url AS author_image,

          (
            6371 * acos(
              cos(radians($1)) * cos(radians(l.location_lat)) *
              cos(radians(l.location_lng) - radians($2)) +
              sin(radians($1)) * sin(radians(l.location_lat))
            )
          ) AS distance_km

        FROM listings l
        JOIN users u ON l.user_id = u.id
        WHERE l.status = 'active'
          AND l.user_id <> $3
          AND l.created_at >= NOW() - ($4 || ' hours')::interval
          AND l.location_lat IS NOT NULL
          AND l.location_lng IS NOT NULL
      ) sub
      WHERE distance_km <= 10
      ORDER BY created_at DESC
      LIMIT $5
      OFFSET $6
      `,
      [userLat, userLng, userId, hours, cappedLimit + 1, offset]
    );

    const hasMore = listingsResult.rows.length > cappedLimit;
    const pageRows = hasMore
      ? listingsResult.rows.slice(0, cappedLimit)
      : listingsResult.rows;

    const listings = pageRows.map((listing) => ({
      ...listing,
      timeAgo: timeAgo(listing.created_at),
      distance: `${Number(listing.distance_km).toFixed(1)} km`,
    }));

    res.json({
      success: true,
      count: listings.length,
      hasMore,
      nextOffset: offset + listings.length,
      data: listings,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's activity stats
exports.getUserActivityStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const activeListings = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM listings
      WHERE user_id = $1 AND status = 'active'
      `,
      [userId]
    );

    const completedTrades = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM trades
      WHERE status = 'completed'
        AND (requester_id = $1 OR owner_id = $1)
      `,
      [userId]
    );

    const totalMessages = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM messages
      WHERE sender_id = $1
      `,
      [userId]
    );

    const favoriteCount = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM favorites
      WHERE user_id = $1
      `,
      [userId]
    );

    res.json({
      success: true,
      data: {
        activeListings: activeListings.rows[0].count,
        completedTrades: completedTrades.rows[0].count,
        totalMessages: totalMessages.rows[0].count,
        savedFavorites: favoriteCount.rows[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get trending listings (most responses)
exports.getTrendingListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit ?? 10, 10);

    const result = await pool.query(
      `
      SELECT
        l.*,
        u.name AS author_name,
        u.neighborhood AS author_neighborhood,
        u.rating AS author_rating,
        u.profile_image_url AS author_image
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
      ORDER BY l.responses_count DESC, l.created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    const listings = result.rows.map((listing) => ({
      ...listing,
      timeAgo: timeAgo(listing.created_at),
    }));

    res.json({
      success: true,
      count: listings.length,
      data: listings,
    });
  } catch (error) {
    next(error);
  }
};
