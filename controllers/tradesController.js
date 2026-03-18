const pool = require('../config/database');
const { generateId } = require('../utils/helpers');

// - Create trade proposal
exports.createTrade = async (req, res, next) => {
  try {
    const requesterId = req.user.id;
    const {
      listingId,
      ownerId,
      requesterOffer,
      tradeDate,
      tradeTime,
      location,
      notes,
    } = req.body;

    if (
      !listingId ||
      !ownerId ||
      !requesterOffer ||
      !tradeDate ||
      !tradeTime ||
      !location
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields' });
    }

    if (requesterId === ownerId) {
      return res
        .status(400)
        .json({ success: false, message: 'Cannot trade with yourself' });
    }

    // check if listing exists and is available
    const listingResult = await pool.query(
      'SELECT * FROM listings WHERE id = $1 AND status = $2',
      [listingId, 'active']
    );
    if (listingResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Listing not found' });
    }

    // create trade proposal now
    const tradeId = generateId();
    try {
      await pool.query(
        `INSERT INTO trades
     (id, listing_id, requester_id, owner_id, requester_offer,
      trade_date, trade_time, location, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          tradeId,
          listingId,
          requesterId,
          ownerId,
          requesterOffer,
          tradeDate,
          tradeTime,
          location,
          notes,
        ]
      );
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'You already have a pending trade for this listing',
        });
      }
      throw err;
    }

    // create notification for this created trade
    const notificationId = generateId();

    await pool.query(
      `INSERT INTO notifications (id, user_id, type, title, description, reference_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        notificationId,
        ownerId,
        'trade',
        'Trade proposal received',
        'Someone wants to trade with you',
        tradeId,
      ]
    );

    const newTrade = await pool.query('SELECT * FROM trades WHERE id = $1', [
      tradeId,
    ]);
    res.status(201).json({
      success: true,
      message: 'Trade created successfully',
      trade: newTrade.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// - Get trade by ID

exports.getTradeById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const tradeResult = await pool.query(
      `SELECT t.*, l.title AS listing_title, l.type AS listing_type, u1.name AS requester_name, u1.rating as requester_rating, u2.name AS owner_name, u2.rating as owner_rating FROM trades t JOIN listings l ON t.listing_id = l.id JOIN users u1 ON t.requester_id = u1.id JOIN users u2 ON t.owner_id = u2.id WHERE t.id = $1 AND (t.requester_id = $2 OR t.owner_id = $2)`,
      [id, userId]
    );

    if (tradeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Trade not found' });
    }

    res.status(200).json({
      success: true,
      trade: tradeResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Get user's trades
exports.getUserTrades = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = `
      SELECT t.*, 
             l.title as listing_title,
             CASE 
               WHEN t.requester_id = $1 THEN u2.name
               ELSE u1.name
             END as partner_name,
             CASE 
               WHEN t.requester_id = $1 THEN t.owner_id
               ELSE t.requester_id
             END as partner_id
      FROM trades t
      JOIN listings l ON t.listing_id = l.id
      JOIN users u1 ON t.requester_id = u1.id
      JOIN users u2 ON t.owner_id = u2.id
      WHERE t.requester_id = $1 OR t.owner_id = $1
    `;
    const params = [userId];

    if (status) {
      query += ' AND t.status = $2';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const trades = await pool.query(query, params);

    res.json({
      success: true,
      count: trades.rows.length,
      data: trades.rows,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTradeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate status
    const allowedStatuses = ['pending', 'accepted', 'cancelled', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    // Get trade with transaction for consistency
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tradeResult = await client.query(
        `SELECT * FROM trades 
         WHERE id = $1 
         AND (requester_id = $2 OR owner_id = $2)
         FOR UPDATE`,
        [id, userId]
      );

      if (tradeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Trade not found or access denied',
        });
      }

      const trade = tradeResult.rows[0];

      // Validate status transition
      if (!isValidStatusTransition(trade.status, status)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot change status from ${trade.status} to ${status}`,
        });
      }

      // Update trade status
      const updateQuery = `
        UPDATE trades 
        SET status = $1, 
            updated_at = NOW()
            ${status === 'completed' ? ', completed_at = NOW()' : ''}
        WHERE id = $2
        RETURNING *
      `;

      const updatedTrade = await client.query(updateQuery, [status, id]);

      // Handle completed status
      if (status === 'completed') {
        // Update users' completed trades count
        await client.query(
          `UPDATE users 
           SET completed_trades = completed_trades + 1 
           WHERE id IN ($1, $2)`,
          [trade.requester_id, trade.owner_id]
        );

        // Update listing status
        await client.query(
          `UPDATE listings 
           SET status = 'completed' 
           WHERE id = $1`,
          [trade.listing_id]
        );
      }

      // Create notification
      const partnerId =
        trade.requester_id === userId ? trade.owner_id : trade.requester_id;

      const notificationTitles = {
        accepted: 'Trade accepted',
        completed: 'Trade completed',
        cancelled: 'Trade cancelled',
      };

      if (notificationTitles[status]) {
        const notificationId = generateId();
        await client.query(
          `INSERT INTO notifications 
           (id, user_id, type, title, description, reference_id, created_at)
           VALUES ($1, $2, 'trade', $3, '', $4, NOW())`,
          [notificationId, partnerId, notificationTitles[status], id]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Trade status updated successfully',
        data: updatedTrade.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// Helper function for status validation
function isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = {
    pending: ['accepted', 'cancelled'],
    accepted: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}
