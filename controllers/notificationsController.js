const pool = require('../config/database');
const { timeAgo } = require('../utils/helpers');

// Create notification helper function
exports.createNotification = async (
  userId,
  type,
  title,
  description = null,
  referenceId = null
) => {
  try {
    const query = `
      INSERT INTO notifications (user_id, type, title, description, reference_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, type, title, description, referenceId];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    // console.error('Error creating notification:', error);
    throw error;
  }
};

exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { unreadOnly } = req.query;

    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params = [userId];

    if (unreadOnly === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const notificationsResult = await pool.query(query, params);

    const { rows } = await pool.query(query, params);

    const notifications = rows.map((notif) => ({
      ...notif,
      timeAgo: timeAgo(notif.created_at),
    }));

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      data: {
        unreadCount: rows[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { rowCount } = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (rowCount.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { rowCount } = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (rowCount.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};
