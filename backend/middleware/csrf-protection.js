/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 * 
 * What is CSRF?
 * - An attacker tricks a logged-in user into performing actions they didn't intend
 * - Example: User visits malicious site while logged into your app
 * - Malicious site sends request to your app using user's session
 * - Your app thinks it's the legitimate user making the request
 * 
 * How CSRF Protection Works:
 * - Generate unique token for each user session
 * - Require token in all state-changing requests (POST, PUT, DELETE)
 * - Verify token matches before processing request
 * - Reject requests with invalid/missing tokens
 */

const crypto = require('crypto');

// Store CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map();

/**
 * Generate a new CSRF token for a user session
 */
function generateCSRFToken(sessionId) {
  // Create a random token using crypto.randomBytes for security
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store token with session ID and expiration (24 hours)
  csrfTokens.set(sessionId, {
    token: token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  
  console.log('🔐 CSRF: Generated new token for session:', sessionId);
  return token;
}

/**
 * Validate CSRF token for a request
 */
function validateCSRFToken(req, res, next) {
  // Only check CSRF for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF check for login endpoint (chicken and egg problem)
  if (req.path === '/api/auth/login') {
    return next();
  }
  
  // Get session ID from authorization header
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId) {
    console.log('❌ CSRF: No session ID provided');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Get CSRF token from request
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  if (!csrfToken) {
    console.log('❌ CSRF: No CSRF token provided');
    return res.status(403).json({ error: 'CSRF token required' });
  }
  
  // Get stored token data
  const storedTokenData = csrfTokens.get(sessionId);
  if (!storedTokenData) {
    console.log('❌ CSRF: No stored token found for session:', sessionId);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Check if token has expired
  if (new Date() > storedTokenData.expiresAt) {
    console.log('❌ CSRF: Token expired for session:', sessionId);
    csrfTokens.delete(sessionId);
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  // Compare tokens (use timing-safe comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(
    Buffer.from(csrfToken, 'hex'),
    Buffer.from(storedTokenData.token, 'hex')
  )) {
    console.log('❌ CSRF: Token mismatch for session:', sessionId);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  console.log('✅ CSRF: Token validated successfully for session:', sessionId);
  next();
}

/**
 * Middleware to add CSRF token to response
 * This should be called after authentication to add token to user's session
 */
function addCSRFToken(req, res, next) {
  // Only add token if user is authenticated
  if (!req.user) {
    return next();
  }
  
  // Get session ID from authorization header
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId) {
    return next();
  }
  
  // Generate or get existing CSRF token
  let tokenData = csrfTokens.get(sessionId);
  if (!tokenData || new Date() > tokenData.expiresAt) {
    const token = generateCSRFToken(sessionId);
    tokenData = csrfTokens.get(sessionId);
  }
  
  // Add CSRF token to response headers
  res.setHeader('X-CSRF-Token', tokenData.token);
  
  // Also add to response body for forms that need it
  if (req.method === 'GET') {
    res.locals.csrfToken = tokenData.token;
  }
  
  next();
}

/**
 * Clean up expired CSRF tokens
 * Run this periodically (every hour) to prevent memory leaks
 */
function cleanupExpiredTokens() {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [sessionId, tokenData] of csrfTokens.entries()) {
    if (now > tokenData.expiresAt) {
      csrfTokens.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 CSRF: Cleaned up ${cleanedCount} expired tokens`);
  }
}

// Clean up expired tokens every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

/**
 * Get CSRF token for a session (useful for testing)
 */
function getCSRFToken(sessionId) {
  const tokenData = csrfTokens.get(sessionId);
  return tokenData && new Date() <= tokenData.expiresAt ? tokenData.token : null;
}

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  addCSRFToken,
  getCSRFToken,
  cleanupExpiredTokens
};
