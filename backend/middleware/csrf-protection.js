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
  console.log('🔐 [CSRF-GENERATE-START] Generating new CSRF token');
  console.log('🔐 [CSRF-GENERATE-SESSION] Session ID:', sessionId);
  console.log('🔐 [CSRF-GENERATE-SESSION-LENGTH]:', sessionId?.length);
  console.log('🔐 [CSRF-GENERATE-SESSION-TYPE]:', typeof sessionId);
  console.log('🔐 [CSRF-GENERATE-MAP-BEFORE] Map size before:', csrfTokens.size);
  console.log('🔐 [CSRF-GENERATE-MAP-KEYS-BEFORE]:', Array.from(csrfTokens.keys()).map(k => k.substring(0, 10) + '...'));
  
  // Create a random token using crypto.randomBytes for security
  const token = crypto.randomBytes(32).toString('hex');
  console.log('🔐 [CSRF-GENERATE-TOKEN] Generated token:', token.substring(0, 20) + '...');
  
  // Store token with session ID and expiration (24 hours)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  console.log('🔐 [CSRF-GENERATE-EXPIRY] Token expires at:', expiresAt);
  
  csrfTokens.set(sessionId, {
    token: token,
    expiresAt: expiresAt
  });
  
  console.log('🔐 [CSRF-GENERATE-MAP-AFTER] Map size after:', csrfTokens.size);
  console.log('🔐 [CSRF-GENERATE-MAP-KEYS-AFTER]:', Array.from(csrfTokens.keys()).map(k => k.substring(0, 10) + '...'));
  console.log('🔐 [CSRF-GENERATE-STORED] Stored token data:', { token: token.substring(0, 20) + '...', expiresAt });
  console.log('🔐 [CSRF-GENERATE-END] Generated new token for session:', sessionId.substring(0, 10) + '...');
  
  return token;
}

/**
 * Validate CSRF token for a request
 */
function validateCSRFToken(req, res, next) {
  console.log('🔐 [CSRF-VALIDATE-START] Starting CSRF token validation');
  console.log('🔐 [CSRF-VALIDATE-METHOD]:', req.method);
  console.log('🔐 [CSRF-VALIDATE-PATH]:', req.path);
  console.log('🔐 [CSRF-VALIDATE-HEADERS]:', Object.keys(req.headers));
  console.log('🔐 [CSRF-VALIDATE-AUTH-HEADER]:', req.headers.authorization?.substring(0, 20) + '...');
  
  // Only check CSRF for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    console.log('🔐 [CSRF-VALIDATE-SKIP] Skipping CSRF for method:', req.method);
    return next();
  }
  
  // Skip CSRF check for login endpoint (chicken and egg problem)
  if (req.path === '/api/auth/login') {
    console.log('🔐 [CSRF-VALIDATE-SKIP] Skipping CSRF for login endpoint');
    return next();
  }
  
  // Get session ID from cookies
  const sessionId = req.cookies?.sessionId;
  console.log('🔐 [CSRF-VALIDATE-COOKIE-SESSION] Extracted session ID from cookies:', sessionId);
  console.log('🔐 [CSRF-VALIDATE-SESSION-LENGTH]:', sessionId?.length);
  console.log('🔐 [CSRF-VALIDATE-SESSION-TYPE]:', typeof sessionId);
  
  if (!sessionId) {
    console.log('❌ [CSRF-VALIDATE-ERROR] No session ID provided');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Get CSRF token from request
  const csrfTokenHeader = req.headers['x-csrf-token'];
  const csrfTokenBody = req.body?._csrf;
  console.log('🔐 [CSRF-VALIDATE-TOKEN-HEADER]:', csrfTokenHeader?.substring(0, 20) + '...');
  console.log('🔐 [CSRF-VALIDATE-TOKEN-BODY]:', csrfTokenBody?.substring(0, 20) + '...');
  
  const csrfToken = csrfTokenHeader || csrfTokenBody;
  console.log('🔐 [CSRF-VALIDATE-TOKEN-FINAL]:', csrfToken?.substring(0, 20) + '...');
  
  if (!csrfToken) {
    console.log('❌ [CSRF-VALIDATE-ERROR] No CSRF token provided');
    return res.status(403).json({ error: 'CSRF token required' });
  }
  
  // Get stored token data
  console.log('🔐 [CSRF-VALIDATE-LOOKUP] Looking up session in Map:', sessionId.substring(0, 10) + '...');
  console.log('🔐 [CSRF-VALIDATE-MAP-SIZE]:', csrfTokens.size);
  console.log('🔐 [CSRF-VALIDATE-MAP-KEYS]:', Array.from(csrfTokens.keys()).map(k => k.substring(0, 10) + '...'));
  
  const storedTokenData = csrfTokens.get(sessionId);
  console.log('🔐 [CSRF-VALIDATE-STORED]:', storedTokenData ? 'FOUND' : 'NOT FOUND');
  
  if (storedTokenData) {
    console.log('🔐 [CSRF-VALIDATE-STORED-TOKEN]:', storedTokenData.token.substring(0, 20) + '...');
    console.log('🔐 [CSRF-VALIDATE-STORED-EXPIRY]:', storedTokenData.expiresAt);
  }
  
  if (!storedTokenData) {
    console.log('❌ [CSRF-VALIDATE-ERROR] No stored token found for session:', sessionId.substring(0, 10) + '...');
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Check if token has expired
  const now = new Date();
  console.log('🔐 [CSRF-VALIDATE-TIME-NOW]:', now);
  console.log('🔐 [CSRF-VALIDATE-TIME-EXPIRES]:', storedTokenData.expiresAt);
  console.log('🔐 [CSRF-VALIDATE-TIME-EXPIRED]:', now > storedTokenData.expiresAt);
  
  if (now > storedTokenData.expiresAt) {
    console.log('❌ [CSRF-VALIDATE-ERROR] Token expired for session:', sessionId.substring(0, 10) + '...');
    csrfTokens.delete(sessionId);
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  // Compare tokens (use timing-safe comparison to prevent timing attacks)
  console.log('🔐 [CSRF-VALIDATE-COMPARE] Comparing tokens...');
  console.log('🔐 [CSRF-VALIDATE-COMPARE-PROVIDED]:', csrfToken.substring(0, 20) + '...');
  console.log('🔐 [CSRF-VALIDATE-COMPARE-STORED]:', storedTokenData.token.substring(0, 20) + '...');
  
  try {
    const tokensMatch = crypto.timingSafeEqual(
      Buffer.from(csrfToken, 'hex'),
      Buffer.from(storedTokenData.token, 'hex')
    );
    console.log('🔐 [CSRF-VALIDATE-COMPARE-RESULT]:', tokensMatch);
    
    if (!tokensMatch) {
      console.log('❌ [CSRF-VALIDATE-ERROR] Token mismatch for session:', sessionId.substring(0, 10) + '...');
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  } catch (error) {
    console.log('❌ [CSRF-VALIDATE-ERROR] Token comparison error:', error.message);
    return res.status(403).json({ error: 'Invalid CSRF token format' });
  }
  
  console.log('✅ [CSRF-VALIDATE-SUCCESS] Token validated successfully for session:', sessionId.substring(0, 10) + '...');
  next();
}

/**
 * Middleware to add CSRF token to response
 * This should be called after authentication to add token to user's session
 */
function addCSRFToken(req, res, next) {
  console.log('🔐 [CSRF-ADD-START] Starting addCSRFToken middleware');
  console.log('🔐 [CSRF-ADD-METHOD]:', req.method);
  console.log('🔐 [CSRF-ADD-PATH]:', req.path);
  console.log('🔐 [CSRF-ADD-URL]:', req.url);
  console.log('🔐 [CSRF-ADD-HEADERS]:', Object.keys(req.headers));
  console.log('🔐 [CSRF-ADD-USER-AGENT]:', req.headers['user-agent']);
  console.log('🔐 [CSRF-ADD-REFERER]:', req.headers.referer);
  
  // Get session ID from cookies
  const sessionId = req.cookies?.sessionId;
  console.log('🔐 [CSRF-ADD-COOKIE-SESSION] Extracted session ID from cookies:', sessionId);
  console.log('🔐 [CSRF-ADD-SESSION-LENGTH]:', sessionId?.length);
  console.log('🔐 [CSRF-ADD-SESSION-TYPE]:', typeof sessionId);
  console.log('🔐 [CSRF-ADD-SESSION-EXACT]:', JSON.stringify(sessionId));
  
  if (!sessionId) {
    console.log('🔐 [CSRF-ADD-SKIP] No session ID found, skipping CSRF token generation');
    return next();
  }
  
  // Map state logging
  console.log('🔐 [CSRF-ADD-MAP-BEFORE] Map size before lookup:', csrfTokens.size);
  console.log('🔐 [CSRF-ADD-MAP-KEYS-BEFORE]:', Array.from(csrfTokens.keys()).map(k => ({
    key: k.substring(0, 10) + '...',
    length: k.length,
    type: typeof k,
    exact: JSON.stringify(k.substring(0, 15))
  })));
  
  // Check if this session exists in our sessions store (import from auth.js)
  // For now, we'll generate a token for any valid session ID format
  // The token will be validated later when the request is made
  
  // Generate or get existing CSRF token
  console.log('🔐 [CSRF-ADD-LOOKUP] Looking up token for session:', sessionId.substring(0, 10) + '...');
  let tokenData = csrfTokens.get(sessionId);
  console.log('🔐 [CSRF-ADD-LOOKUP-RESULT]:', tokenData ? 'FOUND' : 'NOT FOUND');
  
  if (tokenData) {
    console.log('🔐 [CSRF-ADD-FOUND-TOKEN]:', tokenData.token.substring(0, 20) + '...');
    console.log('🔐 [CSRF-ADD-FOUND-EXPIRY]:', tokenData.expiresAt);
    console.log('🔐 [CSRF-ADD-FOUND-EXPIRED]:', new Date() > tokenData.expiresAt);
  }
  
  const now = new Date();
  if (!tokenData || now > tokenData.expiresAt) {
    console.log('🔐 [CSRF-ADD-GENERATE] Need to generate new token');
    console.log('🔐 [CSRF-ADD-GENERATE-REASON]:', !tokenData ? 'NO_TOKEN' : 'EXPIRED');
    if (tokenData) {
      console.log('🔐 [CSRF-ADD-GENERATE-EXPIRY-CHECK] Now:', now, 'Expires:', tokenData.expiresAt);
    }
    
    const token = generateCSRFToken(sessionId);
    tokenData = csrfTokens.get(sessionId);
    console.log('🔐 [CSRF-ADD-GENERATED] Generated new token for session:', sessionId.substring(0, 10) + '...');
  } else {
    console.log('🔐 [CSRF-ADD-REUSE] Reusing existing token for session:', sessionId.substring(0, 10) + '...');
  }
  
  // Add CSRF token to response headers
  console.log('🔐 [CSRF-ADD-RESPONSE] Adding token to response headers');
  console.log('🔐 [CSRF-ADD-RESPONSE-TOKEN]:', tokenData.token.substring(0, 20) + '...');
  
  res.setHeader('X-CSRF-Token', tokenData.token);
  console.log('🔐 [CSRF-ADD-HEADER-SET] X-CSRF-Token header set');
  
  // Also add to response body for forms that need it
  if (req.method === 'GET') {
    res.locals.csrfToken = tokenData.token;
    console.log('🔐 [CSRF-ADD-LOCALS] Added token to res.locals for GET request');
  }
  
  console.log('🔐 [CSRF-ADD-END] addCSRFToken middleware completed for session:', sessionId.substring(0, 10) + '...');
  next();
}

/**
 * Clean up expired CSRF tokens
 * Run this periodically (every hour) to prevent memory leaks
 */
function cleanupExpiredTokens() {
  console.log('🧹 [CSRF-CLEANUP-START] Starting token cleanup');
  const now = new Date();
  let cleanedCount = 0;
  
  console.log('🧹 [CSRF-CLEANUP-MAP-BEFORE] Map size before cleanup:', csrfTokens.size);
  console.log('🧹 [CSRF-CLEANUP-TIME]:', now);
  
  for (const [sessionId, tokenData] of csrfTokens.entries()) {
    console.log('🧹 [CSRF-CLEANUP-CHECK] Session:', sessionId.substring(0, 10) + '...', 'Expires:', tokenData.expiresAt, 'Expired:', now > tokenData.expiresAt);
    if (now > tokenData.expiresAt) {
      csrfTokens.delete(sessionId);
      cleanedCount++;
      console.log('🧹 [CSRF-CLEANUP-DELETED] Deleted expired token for session:', sessionId.substring(0, 10) + '...');
    }
  }
  
  console.log('🧹 [CSRF-CLEANUP-MAP-AFTER] Map size after cleanup:', csrfTokens.size);
  console.log('🧹 [CSRF-CLEANUP-END] Cleanup completed, removed:', cleanedCount, 'tokens');
  
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
