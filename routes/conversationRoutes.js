const express = require('express');
const conversationsController = require('../controllers/conversationsController');
const ensureAuth = require('../middleware/auth');
const {
  validateCreateConversation,
  validateSendMessage,
  validateConversationId,
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(ensureAuth);

// Get user's conversations
router.get('/', conversationsController.getUserConversations);

// Get or create conversation
router.post(
  '/',
  validateCreateConversation,
  conversationsController.getOrCreateConversation
);

// Get messages in conversation
router.get('/:conversationId', conversationsController.getConversationById);

// Get messages in conversation
router.get('/:conversationId/messages', conversationsController.getMessages);

// Send message
router.post(
  '/:conversationId/messages',
  validateSendMessage,
  conversationsController.sendMessage
);

// Delete conversation
router.delete(
  '/:conversationId',
  validateConversationId,
  conversationsController.deleteConversation
);

module.exports = router;
