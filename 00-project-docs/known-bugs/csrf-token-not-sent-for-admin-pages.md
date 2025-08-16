# Critical Bug: CSRF Token and Session Management Failure

- **Date Identified**: Approx. 2025-08-15
- **Status**: 🔴 **UNRESOLVED & CRITICAL**
- **Priority**: BLOCKER
- **Impact**: Prevents all authenticated `POST`, `PUT`, `DELETE` operations for managers, making staff, service, and payment type management impossible. The application is not usable for its core administrative purpose.

## 1. Bug Description
Users with the "manager" role receive a `403 Forbidden: CSRF token required` error when attempting to perform any action that modifies data (e.g., adding a new staff member). Subsequent investigation revealed a deeper issue: the authentication system does not use HTTP cookies for session management, leading to `401 Unauthorized` errors on page navigations after login, which in turn prevents the CSRF token from ever being delivered.

## 2. Initial Investigation & Misdiagnoses (The Rabbit Hole)

The debugging process for this issue was complex and involved several incorrect paths before the true root cause was identified.

### Misdiagnosis A: Nginx Static File Serving
- **Symptom**: The CSRF token was not being injected into the admin HTML pages.
- **Initial Hypothesis**: Nginx was serving the admin pages (`admin-staff.html`, etc.) as static files directly from the filesystem. This bypassed the Node.js backend entirely, meaning the `addCSRFToken` middleware never had a chance to run.
- **Actions Taken**:
    1.  Created new backend routes in `backend/routes/admin.js` (e.g., `/api/admin/staff-page`) to serve the HTML files.
    2.  Updated all frontend navigation links in `index.html` and other admin pages to point to these new backend routes instead of the `.html` files.
    3.  This correctly routed the page requests through the backend, and logging confirmed the `addCSRFToken` middleware was executing.
- **Outcome**: This was a **correct and necessary fix** for the token injection problem, but it revealed the next layer of the issue.

### Misdiagnosis B: Browser Caching
- **Symptom**: After fixing the Nginx routing, manual browser tests still failed to get a CSRF token.
- **Hypothesis**: Aggressive browser or Nginx caching was serving an old, token-less version of the page.
- **Actions Taken**: Added aggressive cache-busting headers (`Cache-Control: no-store`, etc.) to the backend page-serving routes.
- **Outcome**: This had **no effect**, proving caching was not the root cause.

### Misdiagnosis C: HTTPS Redirects & HSTS
- **Symptom**: An automated test using a headless browser (Puppeteer) consistently failed with a `307 Temporary Redirect` from HTTP to HTTPS, followed by a `net::ERR_BLOCKED_BY_CLIENT` error.
- **Hypothesis**: A misconfigured HSTS (HTTP Strict Transport Security) header, likely from the `helmet` middleware, was incorrectly forcing the test environment to HTTPS.
- **Actions Taken**:
    1.  Spent significant time setting up a valid SSL certificate for the server using `certbot` and `sslip.io`.
    2.  Updated all application URLs and test scripts to use `https://`.
- **Outcome**: This was a **major diversion**. While setting up HTTPS is a good practice, it did not solve the underlying problem. The redirect was a red herring specific to the test environment's state and not the core issue affecting real users. The test *still* failed after moving to HTTPS.

## 3. Root Cause Analysis: Cookie-less Session Management

After the diversions above, the automated test provided the critical insight.

- **The Revealing Symptom**: The Puppeteer test successfully logged in but then immediately received a `401 Unauthorized` error when trying to navigate to the `/api/admin/staff-page`.
- **The "Aha!" Moment**: A real browser would store a session cookie after login and automatically send it with every subsequent request. The test failed because **the server never sent a cookie.**
- **The True Root Cause**: The `/api/auth/login` endpoint was designed to return the `sessionId` in the JSON response body. It does not set a `Set-Cookie` header. The entire application relies on the frontend JavaScript to:
    1.  Receive the JSON response.
    2.  Manually store the `sessionId` in `localStorage`.
    3.  Manually add an `Authorization: Bearer <sessionId>` header to every subsequent API request.
- **Why This Fails**: This is a fragile, non-standard implementation. While the JavaScript might handle API calls correctly, it does nothing for browser navigation. When the user logs in and then clicks a link to `admin-staff.html` (now served by `/api/admin/staff-page`), the browser makes a simple `GET` request. It does **not** automatically add the `Authorization` header from `localStorage`. The backend, therefore, sees an unauthenticated request and correctly returns `401 Unauthorized`, preventing the user from ever receiving the page that contains the CSRF token.

## 4. Resolution Plan
The entire session management system must be refactored to use standard, secure, `httpOnly` cookies.

1.  **Install `cookie-parser`**: Add the `cookie-parser` middleware to the project.
2.  **Update `server.js`**: Add `cookie-parser` to the global middleware stack.
3.  **Refactor Login Endpoint**: Modify `backend/routes/auth.js` so the `/login` route sets a secure, `httpOnly` cookie containing the `sessionId` instead of returning it in the JSON body.
    ```javascript
    // Change from this:
    res.json({ success: true, sessionId });

    // To this:
    res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    res.json({ success: true });
    ```
4.  **Refactor Authentication Middleware**: Modify `backend/middleware/auth.js` to extract the `sessionId` from `req.cookies.sessionId` instead of the `Authorization` header.
5.  **Refactor Frontend**: Update `web-app/api.js` to remove the logic that manually adds the `Authorization` header, as the browser will now handle session cookies automatically.

## 5. Status
- **Next Action**: Begin the refactoring process by installing `cookie-parser` and modifying `server.js`.
