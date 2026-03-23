const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const pushController = require('../controllers/pushController');

// Public — frontend needs the VAPID public key before the user is logged in
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Authenticated
router.post('/subscribe', ensureAuth, pushController.subscribe);
router.delete('/unsubscribe', ensureAuth, pushController.unsubscribe);

module.exports = router;
