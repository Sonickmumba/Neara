const express = require('express');
const listingsController = require('../controllers/listingsController');
const ensureAuth = require('../middleware/auth');
const {
  validateCreateListing,
  validateUpdateListing,
  validateListingId,
} = require('../middleware/validation');

const router = express.Router();

// GET /api/listings - Get all listings (with filters)
router.get('/', listingsController.getAllListings);

// GET /api/listings/:id - Get listing by ID
router.get('/:id', validateListingId, listingsController.getListingsById);

// POST /api/listings - Create listing (protected)
router.post(
  '/',
  ensureAuth,
  validateCreateListing,
  listingsController.createListing
);

// PUT /api/listings/:id - Update listing (protected)
router.put(
  '/:id',
  ensureAuth,
  validateUpdateListing,
  listingsController.updateListing
);

// DELETE /api/listings/:id - Delete listing (protected)
router.delete(
  '/:id',
  ensureAuth,
  validateListingId,
  listingsController.deleteListing
);

module.exports = router;
