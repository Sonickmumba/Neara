const express = require('express');
const activityController = require('../controllers/activitiesController');
const ensureAuth = require('../middleware/auth');
const { validateActivityQuery } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Get recent activity feed
router.get(
  '/recent',
  validateActivityQuery,
  activityController.getRecentActivity
);

// Get user activity stats
router.get('/stats', activityController.getUserActivityStats);

// Get trending listings
router.get(
  '/trending',
  validateActivityQuery,
  activityController.getTrendingListings
);

module.exports = router;
