const rateLimit = require('express-rate-limit');

/**
 * Login Rate Limiting Middleware
 * Restricts excessive failed authentication attempts per IP address
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per windowMs per IP
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    errors: ['Rate limit exceeded. Temporary lock in place for security.'],
  },
  statusCode: 429,
});

module.exports = {
  loginRateLimiter,
};
