const express = require('express');
const { body } = require('express-validator');
const ensureAuth = require('../middleware/auth');
const authController = require('../controllers/authController');
const passport = require('passport');
const {
  validateRegister,
  validateLogin,
  validateSendVerificationEmail,
  validateVerifyEmail,
} = require('../middleware/validation');
require('../config/passport');

const router = express.Router();

// register user
router.post('/register', authController.register);

// user login
router.post(
  '/login',
  validateLogin,
  passport.authenticate('local'),
  authController.login
);

// send verification email
router.post(
  '/send-verification',
  validateSendVerificationEmail,
  authController.sendVerificationEmail
);

// verify email code
router.post('/verify-email', validateVerifyEmail, authController.verifyEmail);

// logout
router.post('/logout', ensureAuth, authController.logout);

module.exports = router;

// verify email
router.post(
  '/verify-email',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code').trim().notEmpty().withMessage('Verification code is required'),
  ],
  authController.verifyEmail
);

router.get('/user/:id', ensureAuth, authController.getUserById);

// get currrent user
router.get('/me', ensureAuth, authController.getCurrentUser);

router.post('/logout', authController.logout);

router.post(
  '/request-password-reset',
  [body('email').isEmail().withMessage('Valid email is required')],
  authController.requestPasswordReset
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  ],
  authController.resetPassword
);

router.post('/verify-email', authController.verifyEmail);

module.exports = router;
