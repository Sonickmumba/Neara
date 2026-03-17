const express = require('express');
const notificationsController = require('../controllers/notificationsController');
const ensureAuth = require('../middleware/auth');
const { validateNotificationId } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Get user notifications
router.get('/', notificationsController.getUserNotifications);

// Get unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// Mark notification as read
router.patch(
  '/:id/read',
  validateNotificationId,
  notificationsController.markAsRead
);

// Delete notification
router.delete(
  '/:id',
  validateNotificationId,
  notificationsController.deleteNotification
);

// Mark all as read
router.patch('/read-all', notificationsController.markAllAsRead);

module.exports = router;
