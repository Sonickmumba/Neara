const helmet = require('helmet');

// Use SECURE_COOKIE as the source of truth for "we are behind real HTTPS".
// NODE_ENV=production alone is not sufficient — you can run in production mode
// locally over plain HTTP (e.g. for testing the production build), in which case
// sending HSTS or upgrade-insecure-requests would break Safari permanently.
const behindHttps = process.env.SECURE_COOKIE === 'true';

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      // Only upgrade HTTP→HTTPS when actually behind a real HTTPS terminator.
      // Sending this over plain HTTP causes Safari to block all sub-resources.
      upgradeInsecureRequests: behindHttps ? [] : null,
    },
  },
  // HSTS tells browsers "never use HTTP for this domain again".
  // Only send it when the server is genuinely behind HTTPS (SECURE_COOKIE=true).
  // Sending it over plain HTTP permanently breaks Safari for localhost.
  hsts: behindHttps
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

module.exports = securityHeaders;
