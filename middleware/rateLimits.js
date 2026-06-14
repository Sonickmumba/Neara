const rateLimitModule = require('express-rate-limit');

const rateLimit = rateLimitModule.rateLimit || rateLimitModule;

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

const verificationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts. Please try again later.',
});

const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Too many password reset attempts. Please try again later.',
});

const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many upload attempts. Please try again later.',
});

const pushLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many push subscription attempts. Please try again later.',
});

module.exports = {
  authLimiter,
  verificationLimiter,
  passwordResetLimiter,
  uploadLimiter,
  pushLimiter,
};
