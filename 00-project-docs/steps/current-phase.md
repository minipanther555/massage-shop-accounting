# Current Phase: 🔴 STALLED - Refactoring Core Authentication

## Phase Overview
This phase has been redefined to address a critical, blocking bug in the core authentication and session management system. The previous goal of "Live Operations" is on hold until this is resolved. The primary objective is to refactor the entire session management mechanism from a non-standard, `localStorage`/`Authorization` header implementation to a standard, secure, cookie-based system.

## Current Status: 🔴 STALLED

### What Was Accomplished (Problem Diagnosis)
- **Production Environment**: The production server is stable and deployed at `https://109.123.238.197.sslip.io`.
- **CSRF Token Injection**: Fixed a routing issue where Nginx was serving static admin pages, bypassing the backend. Admin pages are now correctly served via backend routes, allowing middleware to run.
- **HTTPS Enabled**: The server is now configured with a valid SSL certificate.
- **Root Cause Identified**: The application's reliance on `localStorage` and `Authorization` headers for session management is fundamentally flawed. It prevents authenticated browser navigation and is the root cause of the `401 Unauthorized` and subsequent `403 Forbidden` CSRF errors. A detailed analysis is available in `00-project-docs/known-bugs/csrf-token-not-sent-for-admin-pages.md`.

### Current Blocker
- **The application's session management is not compatible with standard browser behavior.** This prevents users from accessing any authenticated page after login, which in turn prevents the CSRF token from being delivered, blocking all administrative actions.

## Immediate Objective: Implement Cookie-Based Session Management

### Key Technical Plan
1.  **Introduce `cookie-parser`**: Add the necessary middleware to handle HTTP cookies.
2.  **Refactor Login Endpoint**: Modify `/api/auth/login` in `backend/routes/auth.js` to set a secure, `httpOnly` session cookie upon successful login.
3.  **Refactor Authentication Middleware**: Modify `backend/middleware/auth.js` to read the session ID from the incoming cookie (`req.cookies.sessionId`) instead of the `Authorization` header.
4.  **Simplify Frontend**: Remove the now-redundant manual session token handling from `web-app/api.js`.
5.  **Validate**: Use the `test_advanced_browser_csrf.js` script to provide definitive, end-to-end proof that the new cookie-based system works correctly for login, subsequent page navigation, CSRF token delivery, and authenticated API calls.

### Dependencies
- None. This is a self-contained backend and frontend refactoring task.

### Success Metrics
- The `test_advanced_browser_csrf.js` script passes completely.
- A user can log in, navigate to the staff admin page, and successfully add a new staff member without any `401` or `403` errors.
