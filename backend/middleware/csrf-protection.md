# `backend/middleware/csrf-protection.md`

## 1. Header Section

*   **Overall Purpose:** This module implements the Synchronizer Token Pattern to defend against Cross-Site Request Forgery (CSRF) attacks. It is responsible for generating, storing, validating, and refreshing unique, session-specific CSRF tokens. This ensures that only requests originating from the legitimate frontend application can modify state on the server.
*   **End-to-End Data Flow:**
    1.  **Token Generation:** After a user successfully logs in (via `routes/auth.js`), the `addCSRFToken` middleware is called. It generates a cryptographically secure random token, associates it with the user's `sessionId` (from cookies), and stores this pair in an in-memory `Map` with a 24-hour expiration. The generated token is then sent back to the client in the `X-CSRF-Token` response header.
    2.  **Token Submission:** The frontend client-side code is responsible for storing this token and including it in the `X-CSRF-Token` header of all subsequent state-changing requests (POST, PUT, DELETE, PATCH).
    3.  **Token Validation:** When a state-changing request arrives at the server, the `validateCSRFToken` middleware (placed before the route handler in `server.js`) intercepts it. It extracts the `sessionId` from the cookie and the token from the `X-CSRF-Token` header. It then looks up the expected token in the in-memory `Map` using the `sessionId`. If the tokens match and the token has not expired, the request is allowed to proceed to the route handler. Otherwise, a 403 Forbidden error is returned, blocking the request.

## 2. Module API & Logic Breakdown

*   **`generateCSRFToken(sessionId)`:**
    *   **Purpose:** The core function for creating a new, secure CSRF token.
    *   **Parameters:**
        *   `sessionId` (string, required): The user's session identifier.
    *   **Returns:** A 64-character hexadecimal string representing the new token.
    *   **Logic Notes:** Uses `crypto.randomBytes` for strong randomness. Stores the token and a 24-hour expiration date in the `csrfTokens` Map, keyed by the `sessionId`.

*   **`validateCSRFToken(req, res, next)` (Express Middleware):**
    *   **Purpose:** To protect endpoints by validating the CSRF token on incoming requests.
    *   **Logic Notes:**
        *   Skips validation for safe methods (`GET`, `HEAD`, `OPTIONS`).
        *   Extracts the session ID from `req.cookies.sessionId` and the token from the `req.headers['x-csrf-token']`.
        *   Retrieves the stored token from the `csrfTokens` map.
        *   Checks for token existence, expiration, and performs a timing-safe comparison using `crypto.timingSafeEqual` to prevent timing attacks.
        *   If any check fails, it sends a 403 response. Otherwise, it calls `next()`.

*   **`addCSRFToken(req, res, next)` (Express Middleware):**
    *   **Purpose:** To generate a new CSRF token if one doesn't exist or has expired, and attach it to the outgoing response.
    *   **Logic Notes:**
        *   Typically used right after authentication or on routes that render a page with a form.
        *   Checks for an existing, valid token for the session. If one isn't found, it calls `generateCSRFToken`.
        *   Sets the token on the response via `res.setHeader('X-CSRF-Token', ...)`.
        *   Also attaches the token to `res.locals.csrfToken` for potential server-side rendering use cases.

*   **`cleanupExpiredTokens()`:**
    *   **Purpose:** A maintenance function to prevent the `csrfTokens` map from growing indefinitely in memory.
    *   **Logic Notes:** Iterates through the map and deletes any entries where the expiration date is in the past. It is automatically run every hour via `setInterval`.

*   **`getCSRFToken(sessionId)`:**
    *   **Purpose:** A utility/testing function to retrieve the current token for a given session ID.
    *   **Returns:** The token string, or `null` if no valid token exists.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:**
        *   `server.js`: Applies the `validateCSRFToken` middleware to protected routes.
        *   `routes/auth.js`: Applies the `addCSRFToken` middleware after successful login.
    *   **Input Data Contracts / Schemas:** Standard Express `req` and `res` objects. Expects `req.cookies.sessionId` to be populated by the `cookie-parser` middleware and `req.headers['x-csrf-token']` to be provided by the client.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:** None. It is self-contained and uses the native `crypto` module.
    *   **Output Data Contracts / Schemas:** Modifies the Express `res` object by setting the `X-CSRF-Token` header. Does not return a body, but calls `next()` or sends a JSON error response.

## 4. Bug & Resolution History
*   (This section will be populated as bugs are identified and resolved.)

