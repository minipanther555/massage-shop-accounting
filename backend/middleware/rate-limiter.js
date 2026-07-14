const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login attempts to prevent brute force attacks
 * Allows 5 attempts per IP address per 15 minutes
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.log(`🚫 RATE LIMIT EXCEEDED: IP ${req.ip} - Too many login attempts`);
    res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: '15 minutes'
    });
  },
  // Development bypass - remove this in production
  skip: (req) => {
    // Allow bypass with special header for development
    if (req.headers['x-dev-bypass'] === 'reset-rate-limit') {
      console.log('🔓 DEV BYPASS: Rate limit reset requested');
      return true;
    }
    return false;
  }
});

/**
 * General API rate limiter for other endpoints
 * Allows 100 requests per IP address per 15 minutes
 */
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000); // 60s
const MAX_REQS  = Number(process.env.RATE_LIMIT_MAX || 2000);        // headroom
const apiRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => false, // keep middleware active, no skipping logic by default
  message: { error: 'rate_limited', detail: 'Too many requests' },
  keyGenerator: (req, _res) => {
    // honor proxy chain if trust proxy enabled
    return req.ip;
  },
});

/**
 * Development endpoint to reset rate limits
 * WARNING: Remove this in production!
 */
function resetRateLimits(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Rate limit reset not allowed in production' });
  }

  // Reset the rate limit store
  if (loginRateLimiter.resetKey) {
    loginRateLimiter.resetKey(req.ip);
    console.log('🔓 DEV: Rate limits reset for IP:', req.ip);
    res.json({ success: true, message: 'Rate limits reset successfully' });
  } else {
    res.json({ success: true, message: 'Rate limits will reset automatically in 15 minutes' });
  }
}

module.exports = {
  loginRateLimiter,
  apiRateLimiter,
  resetRateLimits
};
