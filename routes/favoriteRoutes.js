const express = require('express');
const favoritesController = require('../controllers/favoritesController');
const ensureAuth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Get user's favorites
router.get('/', favoritesController.getUserFavorites);

// Get favorites count
router.get('/count', favoritesController.getFavoritesCount);

// Check if listing is favorited
router.get('/check/:listingId', favoritesController.checkFavorite);

// Add to favorites
router.post('/', favoritesController.addFavorite);

// Remove from favorites
router.delete('/:listingId', favoritesController.removeFavorite);

module.exports = router;

// Remove from favorites
router.delete('/:listingId', favoritesController.removeFavorite);

module.exports = router;
