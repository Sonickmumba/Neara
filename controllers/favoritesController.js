const pool = require('../config/database');
const { generateId } = require('../utils/helpers');

// Add listing to favorites
exports.addFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID is required',
      });
    }

    /* 1️⃣ Check if listing exists */
    const listingResult = await pool.query(
      'SELECT id FROM listings WHERE id = $1',
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    /* 2️⃣ Insert favorite (DB enforces uniqueness) */
    const favoriteId = generateId();

    try {
      await pool.query(
        `
        INSERT INTO favorites (id, user_id, listing_id)
        VALUES ($1, $2, $3)
        `,
        [favoriteId, userId, listingId]
      );
    } catch (err) {
      // Unique violation: already favorited
      if (err.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Listing already in favorites',
        });
      }
      throw err;
    }

    res.status(201).json({
      success: true,
      message: 'Added to favorites',
      data: {
        id: favoriteId,
        listingId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Remove listing from favorites
exports.removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    const result = await pool.query(
      `
      DELETE FROM favorites
      WHERE user_id = $1 AND listing_id = $2
      `,
      [userId, listingId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    res.json({
      success: true,
      message: 'Removed from favorites',
    });
  } catch (error) {
    next(error);
  }
};

// Get user's favorite listings
exports.getUserFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        f.id AS favorite_id,
        f.created_at AS favorited_at,
        l.*,
        u.name AS author_name,
        u.neighborhood AS author_neighborhood,
        u.rating AS author_rating
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE f.user_id = $1
        AND l.status = 'active'
      ORDER BY f.created_at DESC
      `,
      [userId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Get count of user's favorites
exports.getFavoritesCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
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
        count: result.rows[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Check if a listing is favorited by the user
exports.checkFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    const result = await pool.query(
      `
      SELECT 1
      FROM favorites
      WHERE user_id = $1 AND listing_id = $2
      LIMIT 1
      `,
      [userId, listingId]
    );

    res.json({
      success: true,
      data: {
        isFavorited: result.rows.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};


