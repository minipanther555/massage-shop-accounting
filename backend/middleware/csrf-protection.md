# `backend/middleware/csrf-protection.js`

## 1. Header Section

*   **Overall Purpose:** This module wraps the `csurf` cookie-mode middleware used by the Express app. It provides CSRF protection for browser state-changing requests while allowing deterministic local/test preview runs outside production.
*   **End-to-End Data Flow:** `backend/server.js` imports `csrfProtection` and installs it globally after parsing cookies and request bodies. In production and normal development, the request enters `conditionalCsrfProtection()`, which calls `enhancedCsrfProtection()`, then the underlying `csurf` middleware validates or creates the cookie-mode CSRF token. `server.js` later exposes the current token to templates through `res.locals.csrfToken` and `/csrf`. In local preview/testing only, the middleware bypasses `csurf` when `NODE_ENV !== "production"` and either `NODE_ENV === "testing"` or `PWTEST=1`; production never bypasses CSRF because of PWTEST.

## 2. Module API & Logic Breakdown

### `csrfProtection`
- **Purpose:** Cookie-mode `csurf` middleware configured with `sameSite: "Lax"`, production-only secure cookies, `httpOnly: true`, and root path.
- **Parameters:** Standard Express `req`, `res`, and `next`.
- **Returns:** No direct return value; calls `next()` or passes a CSRF error to downstream error handling.
- **Raises / Throws:** `EBADCSRFTOKEN` is passed through `next(err)` by `csurf` when token validation fails.
- **Usage & Logic Notes:** This internal middleware is called by `enhancedCsrfProtection()` and is not exported directly.

### `enhancedCsrfProtection(req, res, next)`
- **Purpose:** Add debug logging around the underlying `csurf` middleware.
- **Parameters:** Standard Express `req`, `res`, and `next`.
- **Returns:** No direct return value; delegates to `csrfProtection`.
- **Raises / Throws:** Passes CSRF validation errors to the caller's `next`.
- **Usage & Logic Notes:** It wraps `req.csrfToken()` and `next()` so CSRF token creation and failures are visible in local logs.

### `conditionalCsrfProtection(req, res, next)`
- **Purpose:** Exported middleware installed by `backend/server.js`.
- **Parameters:** Standard Express `req`, `res`, and `next`.
- **Returns:** No direct return value; either calls `next()` for allowed test/preview bypass or delegates to `enhancedCsrfProtection()`.
- **Raises / Throws:** Passes `EBADCSRFTOKEN` through to the server error handler in protected modes.
- **Usage & Logic Notes:** Test bypass is deliberately non-production only: `NODE_ENV !== "production"` and (`NODE_ENV === "testing"` or `PWTEST=1`). This keeps local preview flows reliable while preventing production deployments from disabling CSRF through an environment flag.

## 3. Dependency Mapping

### Upstream Dependencies
- `backend/server.js`: Imports `{ csrfProtection }` and installs it globally.
- `cookie-parser`, `express.json`, and `express.urlencoded`: Must run before this middleware so cookies/body fields are available.
- Browser/API clients: Must send valid CSRF token data for protected state-changing requests outside local preview/test bypass.

### Downstream Dependencies
- `csurf`: Performs cookie-mode CSRF validation.
- `backend/server.js` EBADCSRFTOKEN handler: Converts CSRF failures to `{ error: "Invalid CSRF token." }` with HTTP 403.

## 4. Bug & Resolution History

### Stale Documentation Described Removed Custom Token Store (2026-07-13)
- **Bug Summary:** The co-located docs described a custom synchronizer-token map with helpers that no longer exist in the source file.
- **Validated Hypothesis:** The implementation had moved to `csurf` cookie mode, but the docs were not updated.
- **Invalidated Hypotheses:** The source still exported `generateCSRFToken`, `validateCSRFToken`, or `addCSRFToken`.
- **Resolution:** Rewrote the module spec around the actual exported middleware and cookie-mode `csurf` flow.

### PWTEST Could Disable CSRF Outside Intended Preview Scope (2026-07-13)
- **Bug Summary:** Checkpoint security review found the CSRF wrapper skipped protection whenever `PWTEST=1`, even if a production environment accidentally carried that variable.
- **Validated Hypothesis:** `conditionalCsrfProtection()` checked `process.env.PWTEST === "1"` directly.
- **Invalidated Hypotheses:** The server-level PWTEST request flag alone controlled CSRF bypass.
- **Resolution:** CSRF bypass now uses the same non-production guard as the server preview shim: production never bypasses CSRF because of PWTEST.
