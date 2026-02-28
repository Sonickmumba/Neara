const express = require('express');
const tradesController = require('../controllers/tradesController');
const ensureAuth = require('../middleware/auth');
const {
  validateCreateTrade,
  validateUpdateTradeStatus,
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Create trade proposal
router.post('/', validateCreateTrade, tradesController.createTrade);

// Get trade by ID
router.get('/:id', tradesController.getTradeById);

// Get user's trades
router.get('/', tradesController.getUserTrades);

// Update trade status
router.patch(
  '/:id/status',
  validateUpdateTradeStatus,
  tradesController.updateTradeStatus
);

module.exports = router;
