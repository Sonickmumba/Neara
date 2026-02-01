const express = require('express');
const conversationsController = require('../controllers/conversationsController');
const ensureAuth = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Get user's conversations
router.get('/', conversationsController.getUserConversations);

// Get or create conversation
router.post('/', conversationsController.getOrCreateConversation);

// Get messages in conversation
router.get('/:conversationId/messages', conversationsController.getMessages);

// Send message
router.post('/messages', conversationsController.sendMessage);

module.exports = router;
