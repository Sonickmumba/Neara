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
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('location_lat').optional(),
  body('location_lng').optional(),
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
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  handleValidationErrors,
];

const validateVerifyEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
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
    .isIn(['available', 'pending', 'traded'])
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
    .isIn(['available', 'pending', 'traded'])
    .withMessage('Invalid status'),
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
  body('listing_id')
    .notEmpty()
    .withMessage('Listing ID is required')
    .isUUID()
    .withMessage('Invalid listing ID'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Comment must be between 5 and 1000 characters'),
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
  body().custom((_, { req }) => {
    const value = req.body.content || req.body.message;
    if (!value || !String(value).trim()) {
      throw new Error('Message cannot be empty');
    }
    return true;
  }),
  handleValidationErrors,
];

/**
 * TRADE VALIDATIONS
 */
const validateCreateTrade = [
  body('offered_listing_id')
    .notEmpty()
    .withMessage('Offered listing ID is required')
    .isUUID()
    .withMessage('Invalid listing ID'),
  body('requested_listing_id')
    .notEmpty()
    .withMessage('Requested listing ID is required')
    .isUUID()
    .withMessage('Invalid listing ID'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message too long'),
  handleValidationErrors,
];

const validateUpdateTradeStatus = [
  param('id').isUUID().withMessage('Invalid trade ID'),
  body('status')
    .isIn(['pending', 'accepted', 'rejected', 'completed', 'cancelled'])
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

  // Conversations
  validateCreateConversation,
  validateSendMessage,

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
