const pool = require('../config/database');
const { generateId } = require('../utils/helpers');

exports.createReview = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const reviewerId = req.user.id;
    const { tradeId, revieweeId, rating, content, tags } = req.body;

    /* -----------------------------
           Basic validation for the above
        ------------------------------ */
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (content && content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Review message must be at most 1000 characters',
      });
    }

    if (tags && (!Array.isArray(tags) || tags.length > 10)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array of at most 10 items',
      });
    }

    await client.query('BEGIN');

    /* -----------------------------
           We verify if the trade exits & access
        ------------------------------ */
    const tradeResult = await client.query(
      `SELECT id, owner_id, requester_id
             FROM trades
             WHERE id = $1
               AND status = 'completed'
               AND (owner_id = $2 OR requester_id = $2)`,
      [tradeId, reviewerId]
    );

    if (tradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Trade not found, not completed, or access denied',
      });
    }

    const trade = tradeResult.rows[0];

    const expectedReviewee =
      trade.owner_id === reviewerId ? trade.requester_id : trade.owner_id;

    if (revieweeId !== expectedReviewee) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid reviewee',
      });
    }

    /* -----------------------------
           Insert review
           (DB must enforce UNIQUE(trade_id, reviewer_id))
        ------------------------------ */
    const reviewId = generateId();

    let newReview;
    try {
      const insertResult = await client.query(
        `INSERT INTO reviews
                 (id, trade_id, reviewer_id, reviewee_id, rating, content, tags)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
        [
          reviewId,
          tradeId,
          reviewerId,
          revieweeId,
          rating,
          content ?? null,
          JSON.stringify(tags ?? []),
        ]
      );

      newReview = insertResult.rows[0];
    } catch (err) {
      // Unique violation: which is already reviewed
      if (err.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'You have already reviewed this trade',
        });
      }
      throw err;
    }

    /* ---Recalculate the rating--------- */
    const ratingAggResult = await client.query(
      `SELECT
                AVG(rating)::numeric(3,2) AS avg_rating,
                COUNT(*)::int AS total_ratings
             FROM reviews
             WHERE reviewee_id = $1`,
      [revieweeId]
    );

    const ratingData = ratingAggResult.rows[0];

    await client.query(
      `UPDATE users
             SET rating = $1,
                 total_ratings = $2
             WHERE id = $3`,
      [ratingData.avg_rating, ratingData.total_ratings, revieweeId]
    );

    /* -----------------------------
           Create notification for this review created
        ------------------------------ */
    const notificationId = generateId();

    await client.query(
      `INSERT INTO notifications
             (id, user_id, type, title, description, reference_id)
             VALUES ($1, $2, 'review', 'New review received',
                     'Someone left you a review', $3)`,
      [notificationId, revieweeId, reviewId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: newReview,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// - Get user's reviews
exports.getUserReviews = async (req, res, next) => {
  try {
    let userId  = req.params.userId;

    if (userId === 'me') {
      userId = req.user.id;
    }

    const reviewsResult = await pool.query(
      `SELECT r.*, u.name as reviewer_name, t.listing_id, l.title as listing_title
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       JOIN trades t ON r.trade_id = t.id
       JOIN listings l ON t.listing_id = l.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const reviews = reviewsResult.rows;

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
