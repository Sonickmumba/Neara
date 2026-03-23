const express = require('express');
const usersController = require('../controllers/usersController');
const ensureAuth = require('../middleware/auth');
const { upload } = require('../utils/imageService');
const {
  validateUpdateUser,
  validateUpdateUserSettings,
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Get own settings
router.get('/settings', usersController.getUserSettings);

// Update own settings
router.patch(
  '/settings',
  validateUpdateUserSettings,
  usersController.updateUserSettings
);

// Get user profile
router.get('/:userId', usersController.getUserProfile);

// Update user profile
router.patch('/profile', validateUpdateUser, usersController.updateUserProfile);

// Upload / replace avatar
router.post('/avatar', upload.single('avatar'), usersController.updateAvatar);

// Delete own account
router.delete('/profile', usersController.deleteOwnAccount);

// Get user stats
router.get('/:userId/stats', usersController.getUserStats);

// Get user listings
router.get('/:userId/listings', usersController.getUserListings);

// Get user reviews
router.get('/:userId/reviews', usersController.getUserReviews);

// Get user badges
router.get('/:userId/badges', usersController.getUserBadges);

module.exports = router;
