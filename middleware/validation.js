const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
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
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array')
    .custom((arr) =>
      arr.every((id) => typeof id === 'string' || typeof id === 'number')
    )
    .withMessage('Each interest must be a valid ID'),
  body('location_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('location_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('neighborhood')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Neighborhood name too long'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
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
  body('category_id')
    .optional()
    .notEmpty()
    .withMessage('Category is required')
    .isUUID()
    .withMessage('Invalid category ID'),
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
  body('image_url').optional().trim().isURL().withMessage('Invalid image URL'),
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
  body('participant_id')
    .notEmpty()
    .withMessage('Participant ID is required')
    .isUUID()
    .withMessage('Invalid participant ID'),
  handleValidationErrors,
];

const validateSendMessage = [
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Message too long'),
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
