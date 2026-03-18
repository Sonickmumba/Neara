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

router.post('/register', validateRegister, authController.register);

router.post(
  '/login',
  validateLogin,
  passport.authenticate('local'),
  authController.login
);

router.post(
  '/send-verification',
  validateSendVerificationEmail,
  authController.sendVerificationEmail
);

router.post('/verify-email', validateVerifyEmail, authController.verifyEmail);

router.get('/me', ensureAuth, authController.getCurrentUser);

router.get('/user/:id', ensureAuth, authController.getUserById);

router.post('/logout', ensureAuth, authController.logout);

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

router.post(
  '/phone/send-code',
  ensureAuth,
  [body('phone').notEmpty().withMessage('Phone is required')],
  authController.sendPhoneVerificationCode
);

router.post(
  '/phone/verify-code',
  ensureAuth,
  [
    body('phone').notEmpty().withMessage('Phone is required'),
    body('code')
      .trim()
      .matches(/^\d{6}$/)
      .withMessage('Code must be exactly 6 digits'),
  ],
  authController.verifyPhoneCode
);

module.exports = router;
