const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array()); // Log for debugging
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * AUTH VALIDATIONS
 */
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  // .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  body('phone').optional().trim(),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('location_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('neighborhood').optional().trim(),
  handleValidationErrors,
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  // .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const validateSendVerificationEmail = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  // .normalizeEmail(),
  handleValidationErrors,
];

const validateVerifyEmail = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  // .normalizeEmail(),
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be exactly 6 digits'),
  handleValidationErrors,
];

/**
 * LISTING VALIDATIONS
 */
const validateCreateListing = [
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['offer', 'need'])
    .withMessage('Type must be either "offer" or "need"'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['skills', 'goods', 'services'])
    .withMessage('Category must be one of: skills, goods, services'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 150 })
    .withMessage('Title must be between 5 and 150 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('condition')
    .optional()
    .trim()
    .isIn(['new', 'like-new', 'good', 'fair', 'poor'])
    .withMessage('Invalid condition'),
  body('status')
    .optional()
    .trim()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('image_url').optional().trim(),
  body('image_urls')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty
      try {
        const urls = JSON.parse(value);
        if (!Array.isArray(urls)) return false;
        // Validate each URL is a proper HTTP/HTTPS URL
        return urls.every(
          (url) => typeof url === 'string' && /^https?:\/\/.+/.test(url)
        );
      } catch {
        return false;
      }
    })
    .withMessage('image_urls must be a valid JSON array of URLs'),
  body('location_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  handleValidationErrors,
];

const validateUpdateListing = [
  param('id').isUUID().withMessage('Invalid listing ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage('Title must be between 5 and 150 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('condition')
    .optional()
    .trim()
    .isIn(['new', 'like-new', 'good', 'fair', 'poor'])
    .withMessage('Invalid condition'),
  body('status')
    .optional()
    .trim()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('image_urls')
    .optional()
    .custom((value) => {
      const urls = Array.isArray(value) ? value : JSON.parse(value);
      return (
        Array.isArray(urls) &&
        urls.every(
          (url) => typeof url === 'string' && /^https?:\/\/.+/.test(url)
        )
      );
    })
    .withMessage('image_urls must be a valid array of URLs'),
  handleValidationErrors,
];

const validateListingId = [
  param('id').isUUID().withMessage('Invalid listing ID'),
  handleValidationErrors,
];

/**
 * REVIEW VALIDATIONS
 */
const validateCreateReview = [
  body('tradeId')
    .notEmpty()
    .withMessage('Trade ID is required')
    .isUUID()
    .withMessage('Invalid trade ID'),
  body('revieweeId')
    .notEmpty()
    .withMessage('Reviewee ID is required')
    .isUUID()
    .withMessage('Invalid reviewee ID'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('content')
    .customSanitizer((value) => (value == null ? '' : value))
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review content must be at most 1000 characters'),
  body('tags')
    .optional({ nullable: true })
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with up to 10 items'),
  handleValidationErrors,
];

const validateUpdateReview = [
  param('id').isUUID().withMessage('Invalid review ID'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Comment must be between 5 and 1000 characters'),
  handleValidationErrors,
];

/**
 * USER VALIDATIONS
 */
const validateUpdateUser = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('location_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('location_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  handleValidationErrors,
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  handleValidationErrors,
];

const validateUpdateUserSettings = [
  body('notifications')
    .optional()
    .isObject()
    .withMessage('notifications must be an object'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('notifications.push must be boolean'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('notifications.email must be boolean'),
  body('notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('notifications.sms must be boolean'),
  body('notifications.messages')
    .optional()
    .isBoolean()
    .withMessage('notifications.messages must be boolean'),
  body('notifications.trades')
    .optional()
    .isBoolean()
    .withMessage('notifications.trades must be boolean'),
  body('notifications.reviews')
    .optional()
    .isBoolean()
    .withMessage('notifications.reviews must be boolean'),
  body('notifications.community')
    .optional()
    .isBoolean()
    .withMessage('notifications.community must be boolean'),
  body('privacy')
    .optional()
    .isObject()
    .withMessage('privacy must be an object'),
  body('privacy.showEmail')
    .optional()
    .isBoolean()
    .withMessage('privacy.showEmail must be boolean'),
  body('privacy.showPhone')
    .optional()
    .isBoolean()
    .withMessage('privacy.showPhone must be boolean'),
  body('privacy.showLocation')
    .optional()
    .isBoolean()
    .withMessage('privacy.showLocation must be boolean'),
  body('privacy.publicProfile')
    .optional()
    .isBoolean()
    .withMessage('privacy.publicProfile must be boolean'),
  handleValidationErrors,
];

/**
 * CONVERSATION/MESSAGE VALIDATIONS
 */
const validateCreateConversation = [
  body('listingId').optional().isUUID().withMessage('Invalid listing ID'),
  body('listing_id').optional().isUUID().withMessage('Invalid listing ID'),
  body('participantId')
    .optional()
    .isUUID()
    .withMessage('Invalid participant ID'),
  body('participant_id')
    .optional()
    .isUUID()
    .withMessage('Invalid participant ID'),
  body().custom((_, { req }) => {
    if (!req.body.listingId && !req.body.listing_id) {
      throw new Error('Listing ID is required');
    }
    if (!req.body.participantId && !req.body.participant_id) {
      throw new Error('Participant ID is required');
    }
    return true;
  }),
  handleValidationErrors,
];

const validateSendMessage = [
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message too long'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Message too long'),
  body('attachment_url')
    .optional()
    .isURL()
    .withMessage('Invalid attachment URL'),
  body('attachment_type')
    .optional()
    .isIn(['image', 'document'])
    .withMessage('attachment_type must be "image" or "document"'),
  body().custom((_, { req }) => {
    const textValue = req.body.content || req.body.message;
    const hasText = textValue && String(textValue).trim();
    const hasAttachment = req.body.attachment_url;
    if (!hasText && !hasAttachment) {
      throw new Error('Message must have content or an attachment');
    }
    return true;
  }),
  handleValidationErrors,
];

const validateConversationId = [
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  handleValidationErrors,
];

/**
 * TRADE VALIDATIONS
 */
const validateCreateTrade = [
  body('listingId')
    .notEmpty()
    .withMessage('Listing ID is required')
    .isUUID()
    .withMessage('Invalid listing ID'),
  body('ownerId')
    .notEmpty()
    .withMessage('Owner ID is required')
    .isUUID()
    .withMessage('Invalid owner ID'),
  body('requesterOffer')
    .trim()
    .notEmpty()
    .withMessage('Offer details are required')
    .isLength({ max: 2000 })
    .withMessage('Offer details too long'),
  body('tradeDate')
    .notEmpty()
    .withMessage('Trade date is required')
    .isISO8601()
    .withMessage('Invalid trade date'),
  body('tradeTime')
    .notEmpty()
    .withMessage('Trade time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid trade time format'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 255 })
    .withMessage('Location is too long'),
  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes too long'),
  handleValidationErrors,
];

const validateUpdateTradeStatus = [
  param('id').isUUID().withMessage('Invalid trade ID'),
  body('status')
    .isIn(['pending', 'accepted', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  handleValidationErrors,
];

/**
 * NOTIFICATION VALIDATIONS
 */
const validateNotificationId = [
  param('id').isUUID().withMessage('Invalid notification ID'),
  handleValidationErrors,
];

/**
 * ACTIVITY VALIDATIONS
 */
const validateActivityQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  handleValidationErrors,
];

/**
 * FAVORITE VALIDATIONS
 */
const validateFavoriteId = [
  param('listingId').isUUID().withMessage('Invalid listing ID'),
  handleValidationErrors,
];

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  validateSendVerificationEmail,
  validateVerifyEmail,

  // Listings
  validateCreateListing,
  validateUpdateListing,
  validateListingId,

  // Reviews
  validateCreateReview,
  validateUpdateReview,

  // Users
  validateUpdateUser,
  validateChangePassword,
  validateUpdateUserSettings,

  // Conversations
  validateCreateConversation,
  validateSendMessage,
  validateConversationId,

  // Trades
  validateCreateTrade,
  validateUpdateTradeStatus,

  // Notifications
  validateNotificationId,

  // Activity
  validateActivityQuery,

  // Favorites
  validateFavoriteId,

  // Utility
  handleValidationErrors,
};
