const express = require('express');
const reviewsController = require('../controllers/reviewsController');
const ensureAuth = require('../middleware/auth');
const { validateCreateReview } = require('../middleware/validation');

const router = express.Router();

// Get user's reviews (public)
router.get('/user/:userId', reviewsController.getUserReviews);

// Create review (protected)
router.post(
  '/',
  ensureAuth,
  validateCreateReview,
  reviewsController.createReview
);

module.exports = router;
