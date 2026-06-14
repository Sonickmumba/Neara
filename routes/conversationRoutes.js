const express = require('express');
const conversationsController = require('../controllers/conversationsController');
const ensureAuth = require('../middleware/auth');
const { uploadChatAttachment } = require('../utils/imageService');
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

// Mark conversation messages and related message notifications as read
router.patch(
  '/:conversationId/read',
  validateConversationId,
  conversationsController.markConversationAsRead
);

// Upload attachment (image or document) to Cloudinary
router.post(
  '/:conversationId/attachments',
  validateConversationId,
  conversationsController.ensureConversationParticipant,
  uploadChatAttachment.single('file'),
  conversationsController.sendAttachment
);

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
