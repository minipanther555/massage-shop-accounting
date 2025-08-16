# CSRF Token Not Sent for Admin Pages

## Bug Description
- **Date**: August 16, 2025
- **Status**: 🔴 ACTIVE
- **Priority**: CRITICAL - Blocks all administrative POST/PUT/DELETE actions.
- **Root Cause**: Nginx serves administrative HTML pages as static files, bypassing the Node.js backend and the `addCSRFToken` middleware.

## Problem Description
When a manager logs in and navigates to the Staff Administration page (`/admin-staff.html`), the page loads correctly. However, when they attempt to perform any action that requires a CSRF token (such as adding a new staff member), the action fails with a `403 Forbidden` error and the message `CSRF token required`.

This occurs because the server never sends the `X-CSRF-Token` in the first place when the HTML page is loaded.

## Investigation Timeline & Findings
1.  **Initial Report**: User reported a "CSRF error" when adding staff.
2.  **Misdiagnosis 1: Database Schema**: The issue was incorrectly identified as a database schema problem (missing columns). This led to a lengthy and ultimately incorrect debugging path.
3.  **Regression to 500 Error**: Attempts to fix the schema and modify Nginx led to a `500 Internal Server Error` on the staff page, which was a separate issue caused by an incomplete database migration. This further masked the original CSRF problem.
4.  **Resolution of 500 Error**: The `500 Internal Server Error` was definitively traced to missing `last_payment_date` columns in the `staff_roster` table. A migration script (`fix_database.js`) was created and executed on the server, successfully resolving the database schema and the 500 error.
5.  **Return to CSRF Error**: With the database fixed, the application returned to the original behavior: a `403 Forbidden` on POST requests.
6.  **Definitive Diagnostic Test**: A new test script (`debug_csrf_post_workflow.js`) was created to simulate the full user workflow: Login -> GET Page -> POST Data.
7.  **Root Cause Confirmed**: The diagnostic test proved conclusively that the server **does not** include the `X-CSRF-Token` header in its response when serving `/admin-staff.html`.

## Why is the Token Missing?
The `addCSRFToken` middleware is part of the Node.js/Express application. The Nginx configuration has been set up to serve `.html` files directly from the `/opt/massage-shop/web-app/` directory for performance and to avoid "Route not found" errors for static content.

As a result, when a request for `/admin-staff.html` comes in, Nginx handles it directly and never passes it to the Node.js backend. Since the backend never sees the request, the `addCSRFToken` middleware is never executed, and no token is generated or sent to the client.

## Resolution Plan
The fix requires routing requests for protected pages through the backend so that middleware can be applied, without reintroducing the old "Route not found" errors for static assets.

1.  **Create New Backend Routes**: Create specific routes in `backend/routes/admin.js` (e.g., `/api/admin/staff-page`) that are responsible for serving the HTML files for protected admin pages.
2.  **Apply Middleware**: Protect these new routes with the `isAuthenticated` and `addCSRFToken` middleware.
3.  **Update Frontend Links**: Modify the frontend navigation to point to these new backend routes (e.g., change links from `/admin-staff.html` to `/api/admin/staff-page`). This ensures that accessing the page requires authentication and triggers the CSRF token generation.
4.  **No Nginx Changes**: This approach requires no changes to the stable Nginx configuration, avoiding past regressions.
