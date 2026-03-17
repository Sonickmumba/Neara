const pool = require('../config/database');
const { generateId, timeAgo } = require('../utils/helpers');

// Create notification helper function
exports.createNotification = async (
  userId,
  type,
  title,
  description = null,
  referenceId = null
) => {
  try {
    const notificationId = generateId();
    const query = `
      INSERT INTO notifications (id, user_id, type, title, description, reference_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      notificationId,
      userId,
      type,
      title,
      description,
      referenceId,
    ];

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
    const { unreadOnly, before, beforeId, type } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

    const params = [userId];
    let whereClause = 'WHERE user_id = $1';

    if (unreadOnly === 'true') {
      whereClause += ' AND is_read = false';
    }

    if (type && ['message', 'trade', 'review', 'listing'].includes(type)) {
      params.push(type);
      whereClause += ` AND type = $${params.length}`;
    }

    if (before && beforeId) {
      params.push(before, beforeId);
      whereClause += ` AND (created_at, id) < ($${params.length - 1}::timestamp, $${params.length})`;
    }

    params.push(limit + 1);

    const query = `
      SELECT *
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length}
    `;

    const { rows: rawRows } = await pool.query(query, params);

    const hasMore = rawRows.length > limit;
    const rows = hasMore ? rawRows.slice(0, limit) : rawRows;

    const notifications = rows.map((notif) => ({
      ...notif,
      timeAgo: timeAgo(notif.created_at),
    }));

    const unreadCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    const nextCursor = notifications.length
      ? {
          before: notifications[notifications.length - 1].created_at,
          beforeId: notifications[notifications.length - 1].id,
        }
      : null;

    res.json({
      success: true,
      count: notifications.length,
      hasMore,
      nextCursor,
      unreadCount: unreadCountResult.rows[0]?.count || 0,
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

    if (rowCount === 0) {
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

    if (rowCount === 0) {
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
