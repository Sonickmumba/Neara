const crypto = require('crypto');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const toBuffer = (value) => Buffer.from(String(value || ''), 'utf8');

const tokensMatch = (actual, expected) => {
  const actualBuffer = toBuffer(actual);
  const expectedBuffer = toBuffer(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const ensureCsrfToken = (req) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('base64url');
  }

  return req.session.csrfToken;
};

const getCsrfToken = (req, res, next) => {
  try {
    const token = ensureCsrfToken(req);
    req.session.save((err) => {
      if (err) return next(err);
      return res.json({ success: true, csrfToken: token });
    });
  } catch (error) {
    next(error);
  }
};

const csrfProtection = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const expectedToken = req.session?.csrfToken;
  const actualToken =
    req.get('X-CSRF-Token') || req.get('X-XSRF-Token') || req.body?._csrf;

  if (!expectedToken || !actualToken || !tokensMatch(actualToken, expectedToken)) {
    const csrfToken = ensureCsrfToken(req);

    return req.session.save((err) => {
      if (err) return next(err);

      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
        csrfToken,
      });
    });
  }

  return next();
};

module.exports = {
  csrfProtection,
  getCsrfToken,
};
