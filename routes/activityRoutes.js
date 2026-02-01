const express = require('express');
const activityController = require('../controllers/activitiesController');
const ensureAuth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Get recent activity feed
router.get('/recent', activityController.getRecentActivity);

// Get user activity stats
router.get('/stats', activityController.getUserActivityStats);

// Get trending listings
router.get('/trending', activityController.getTrendingListings);

module.exports = router;
