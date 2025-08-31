/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * This implementation uses cookie-mode CSRF protection for consistency and reliability.
 * 1. Generate a unique, cryptographically strong token for each request.
 * 2. Store the token in a secure, httpOnly cookie.
 * 3. Client reads the token from the cookie and sends it in the X-CSRF-Token header.
 * 4. Server validates the token from the header against the one stored in the cookie.
 */

const csrf = require('csurf');

// Cookie-mode CSRF protection (no session dependency)
const csrfProtection = csrf({
  cookie: {
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    path: '/'
  }
});

// Enhanced CSRF protection with debugging
const enhancedCsrfProtection = (req, res, next) => {
  console.log('🔒 CSRF: Middleware called for', req.method, req.path);
  console.log('🔒 CSRF: Cookie present:', !!req.headers.cookie);
  
  // Add debugging to the request
  const originalCsrfToken = req.csrfToken;
  req.csrfToken = function() {
    const token = originalCsrfToken.call(this);
    console.log('🔒 CSRF: Token generated:', token);
    return token;
  };
  
  // Add debugging to the response
  const originalNext = next;
  next = function(err) {
    if (err && err.code === 'EBADCSRFTOKEN') {
      console.log('❌ CSRF: Validation failed');
      console.log('❌ CSRF: Request headers:', req.headers);
      console.log('❌ CSRF: Error details:', err.message);
    }
    originalNext.call(this, err);
  };
  
  csrfProtection(req, res, next);
};

// A wrapper to bypass CSRF protection in the test environment.
const conditionalCsrfProtection = (req, res, next) => {
  if (process.env.NODE_ENV === 'testing') {
    // If testing, just skip the middleware.
    return next();
  }
  // Otherwise, apply the enhanced CSRF protection with debugging.
  enhancedCsrfProtection(req, res, next);
};

module.exports = {
  csrfProtection: conditionalCsrfProtection,
};
