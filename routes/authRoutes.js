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

const hasStrategy = (name) => Boolean(passport?._strategies?.[name]);

const socialUnavailable = (res, provider) => {
  return authController.socialAuthFailureRedirect(
    {
      query: {
        reason: 'provider_not_configured',
        provider,
      },
    },
    res
  );
};

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

router.get('/social/failure', authController.socialAuthFailureRedirect);

router.get('/google', (req, res, next) => {
  if (!hasStrategy('google')) {
    return socialUnavailable(res, 'google');
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: true,
    session: true,
    prompt: 'select_account',
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!hasStrategy('google')) {
    return socialUnavailable(res, 'google');
  }

  return passport.authenticate('google', { session: true }, (err, user) => {
    if (err) {
      return authController.socialAuthFailureRedirect(
        {
          query: {
            reason: err.code || 'oauth_callback_error',
            provider: 'google',
          },
        },
        res
      );
    }

    if (!user) {
      return authController.socialAuthFailureRedirect(
        {
          query: { reason: 'oauth_denied', provider: 'google' },
        },
        res
      );
    }

    return req.logIn(user, (loginErr) => {
      if (loginErr) {
        return authController.socialAuthFailureRedirect(
          {
            query: { reason: 'login_session_failed', provider: 'google' },
          },
          res
        );
      }

      return authController.socialAuthSuccessRedirect(req, res);
    });
  })(req, res, next);
});

router.get('/facebook', (req, res, next) => {
  if (!hasStrategy('facebook')) {
    return socialUnavailable(res, 'facebook');
  }

  return passport.authenticate('facebook', {
    scope: ['email'],
    state: true,
    session: true,
  })(req, res, next);
});

router.get('/facebook/callback', (req, res, next) => {
  if (!hasStrategy('facebook')) {
    return socialUnavailable(res, 'facebook');
  }

  return passport.authenticate('facebook', { session: true }, (err, user) => {
    if (err) {
      return authController.socialAuthFailureRedirect(
        {
          query: {
            reason: err.code || 'oauth_callback_error',
            provider: 'facebook',
          },
        },
        res
      );
    }

    if (!user) {
      return authController.socialAuthFailureRedirect(
        {
          query: { reason: 'oauth_denied', provider: 'facebook' },
        },
        res
      );
    }

    return req.logIn(user, (loginErr) => {
      if (loginErr) {
        return authController.socialAuthFailureRedirect(
          {
            query: { reason: 'login_session_failed', provider: 'facebook' },
          },
          res
        );
      }

      return authController.socialAuthSuccessRedirect(req, res);
    });
  })(req, res, next);
});

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
