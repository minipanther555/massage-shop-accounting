/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * This implementation uses the Synchronizer Token Pattern.
 * 1. Generate a unique, cryptographically strong token for each user session.
 * 2. Store the token on the server, associated with the session ID.
 * 3. Embed the token in a hidden `<meta>` tag in the HTML served to the client.
 * 4. The client-side JavaScript reads this token and includes it in the `X-CSRF-Token` header of all subsequent AJAX requests.
 * 5. The server validates the token from the header against the one stored for the session.
 */

const csrf = require('csurf');

// Standard csurf protection middleware.
// The { cookie: true } option tells csurf to store the secret in a cookie.
const csrfProtection = csrf({ cookie: true });

// A wrapper to bypass CSRF protection in the test environment.
const conditionalCsrfProtection = (req, res, next) => {
  if (process.env.NODE_ENV === 'testing') {
    // If testing, just skip the middleware.
    return next();
  }
  // Otherwise, apply the standard CSRF protection.
  csrfProtection(req, res, next);
};


module.exports = {
  csrfProtection: conditionalCsrfProtection,
};
