/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 */

const crypto = require('crypto');

const csrfTokens = new Map();

function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, {
    token: token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  console.log('🔐 CSRF: Generated new token for session:', sessionId);
  return token;
}

function addCSRFToken(req, res, next) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  console.log(`[CSRF-SERVER] addCSRFToken middleware triggered for session: ${sessionId ? sessionId.substring(0, 8) + '...' : 'None'}`);

  if (!sessionId) {
    console.log('[CSRF-SERVER] No session ID, skipping token generation.');
    return next();
  }

  let tokenData = csrfTokens.get(sessionId);
  if (!tokenData || new Date() > tokenData.expiresAt) {
    const token = generateCSRFToken(sessionId);
    tokenData = csrfTokens.get(sessionId);
    console.log(`[CSRF-SERVER] Generated NEW token for session ${sessionId.substring(0, 8)}... Token: ${token}`);
  } else {
    console.log(`[CSRF-SERVER] Reusing EXISTING token for session ${sessionId.substring(0, 8)}...`);
  }

  res.setHeader('X-CSRF-Token', tokenData.token);
  console.log(`[CSRF-SERVER] Set 'X-CSRF-Token' header to: ${tokenData.token}`);
  
  next();
}

function validateCSRFToken(req, res, next) {
  console.log(`[CSRF-SERVER] validateCSRFToken middleware triggered for ${req.method} ${req.path}`);

  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  const csrfTokenFromHeader = req.headers['x-csrf-token'];
  
  console.log('[CSRF-SERVER] Inspecting all incoming request headers:', req.headers);

  if (!csrfTokenFromHeader) {
    console.log('[CSRF-SERVER] VALIDATION FAILED: No "x-csrf-token" header found.');
    return res.status(403).json({ error: 'CSRF token required' });
  }

  if (!sessionId) {
    console.log('[CSRF-SERVER] VALIDATION FAILED: No session ID (Authorization header) found.');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const storedTokenData = csrfTokens.get(sessionId);

  if (!storedTokenData) {
    console.log(`[CSRF-SERVER] VALIDATION FAILED: No token stored on server for session ${sessionId.substring(0,8)}...`);
    return res.status(403).json({ error: 'Invalid CSRF token session' });
  }

  console.log(`[CSRF-SERVER] Comparing client token '${csrfTokenFromHeader}' with server token '${storedTokenData.token}'`);

  try {
    const clientTokenBuffer = Buffer.from(csrfTokenFromHeader);
    const serverTokenBuffer = Buffer.from(storedTokenData.token);

    if (clientTokenBuffer.length !== serverTokenBuffer.length) {
        console.log('[CSRF-SERVER] VALIDATION FAILED: Token length mismatch.');
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    const isTokenValid = crypto.timingSafeEqual(clientTokenBuffer, serverTokenBuffer);

    if (!isTokenValid) {
      console.log('[CSRF-SERVER] VALIDATION FAILED: Token mismatch.');
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  } catch (e) {
      console.log('[CSRF-SERVER] VALIDATION FAILED: Error during token comparison.', e);
      return res.status(403).json({ error: 'Invalid CSRF token format' });
  }

  if (new Date() > storedTokenData.expiresAt) {
    csrfTokens.delete(sessionId);
    console.log('[CSRF-SERVER] VALIDATION FAILED: Token expired.');
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  console.log(`[CSRF-SERVER] SUCCESS: Token validated for session ${sessionId.substring(0,8)}...`);
  next();
}

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

setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

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