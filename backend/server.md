# `backend/server.md`

## 1. Header Section

*   **Overall Purpose:** This module serves as the main entry point and central nervous system for the Massage Shop POS backend application. It initializes the Express.js server, configures and applies all global middleware (for security, logging, parsing, and error handling), connects to the database, and orchestrates the routing of all incoming API requests to their respective handler modules.
*   **End-to-End Data Flow:** An HTTP request from a client browser first hits this server. The server's first action is to initialize the Sentry error monitoring SDK via `instrument.js`. The request then passes sequentially through a chain of middleware: logging, timeout enforcement, size limiting, security headers, and input validation. Based on its URL path (e.g., `/api/transactions`), the request is directed by the router to the appropriate route handler file (e.g., `routes/transactions.js`). Specific routes are also protected by CSRF token validation middleware. The route handler processes the request, interacts with the database via the `models/database.js` module, and sends a response back to the client. If any error occurs during this process, it is caught by the Sentry error handling middleware (`Sentry.setupExpressErrorHandler(app)`) and sent to Sentry.io before being passed to the final custom error handler.

## 2. Module API & Logic Breakdown

This module does not export any functions or classes. It sets up and runs the Express server instance directly.

*   **Sentry Initialization:**
    *   **Purpose:** To configure and enable Sentry error and performance monitoring for the entire application.
    *   **Logic Notes:** This is the very first action the server takes. It `require`s the `instrument.js` module, which contains the `Sentry.init()` call. This ensures that Sentry can capture any potential errors that occur during the application's startup and initialization phase.

*   **Server Initialization:**
    *   **Purpose:** To create and configure the Express application instance.
    *   **Logic Notes:** It dynamically configures middleware like `cors` and `rateLimit` based on the `NODE_ENV` environment variable, applying stricter rules for 'production'. It uses `dotenv` to load environment variables from a `.env` file. Security headers are now handled by the custom `security-headers.js` middleware instead of helmet.js.

*   **Middleware Chain:**
    *   **Purpose:** To process and secure all incoming requests before they reach the route handlers.
    *   **Execution Order & Logic:**
        1.  `Sentry.setupExpressErrorHandler(app)`: This is the most critical piece of the Sentry integration. It replaces the older, separate `requestHandler`, `tracingHandler`, and `errorHandler` middlewares. It must be placed **after** all routes but **before** any other custom error handling middleware. It automatically captures errors from routes and sends them to Sentry.
        2.  `cors`: Handles Cross-Origin Resource Sharing based on a configurable list of allowed origins.
        3.  `rateLimit` (production only): Protects against brute-force attacks by limiting request frequency.
        4.  `express.json`, `express.urlencoded`: Parses incoming JSON and URL-encoded request bodies.
        5.  `cookieParser`: Parses `Cookie` header and populates `req.cookies`.
        6.  `requestLogger`: Custom middleware to log request details.
        7.  `requestTimeout`: Sets a 30-second timeout for all requests.
        8.  `requestSizeLimits`: Enforces limits on request body size.
        9.  `securityHeaders`: Adds various security-related HTTP headers.
        10. `express.static('web-app')`: **(Newly Added)** This crucial middleware is responsible for serving static files (HTML, CSS, JS) from the `web-app` directory. It is placed **before** the API routers to ensure that requests for frontend assets are handled by serving the file, rather than being passed to the API 404 handler.
        11. `validateInput`: A placeholder for input sanitization/validation.
        12. `errorHandler`: A final, catch-all middleware to handle errors.
        13. `notFoundHandler`: Catches any requests that don't match a defined route and returns a 404.

*   **Routing:**
    *   **Purpose:** To map API endpoints to their corresponding logic handlers.
    *   **Logic Notes:** The server defines base paths for different resources (e.g., `/api/auth`, `/api/transactions`). It imports router objects from files in the `/routes` directory and mounts them on these paths. Most routes are protected by the `validateCSRFToken` middleware.

*   **`startServer()` function:**
    *   **Purpose:** An async function that ensures the database connection is successfully established *before* the server starts listening for requests.
    *   **Raises / Throws:** If the database connection fails, it logs the error and exits the process with a non-zero exit code.

*   **Graceful Shutdown:**
    *   **Purpose:** To ensure the database connection is closed properly when the server process is terminated (`SIGINT`, `SIGTERM`).
    *   **Logic Notes:** Listens for process signals and calls `database.close()` before exiting.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** This is the entry point of the application, executed by `node`.
    *   **Input Data Contracts / Schemas:** Standard HTTP request format. Environment variables from `.env` (e.g., `PORT`, `ALLOWED_ORIGINS`, `NODE_ENV`, `SENTRY_DSN`).

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:**
        *   `./instrument.js`: For initializing the Sentry SDK.
        *   `./middleware/security-headers.js`: For applying security headers (replaces helmet.js).
        *   `./middleware/input-validation.js`: For validating input.
        *   `./middleware/csrf-protection.js`: For CSRF protection.
        *   `./middleware/request-limits.js`: For request limits and error handling.
        *   `./models/database.js`: For database connection and operations.
        *   `./routes/auth.js`: For authentication routes.
        *   `./routes/transactions.js`: For transaction-related routes.
        *   `./routes/staff.js`: For staff-related routes.
        *   `./routes/services.js`: For service-related routes.
        *   `./routes/expenses.js`: For expense-related routes.
        *   `./routes/reports.js`: For reporting routes.
        *   `./routes/main.js`: For main application routes.
        *   `./routes/admin.js`: For admin-specific routes.
        *   `./routes/payment-types.js`: For payment type management routes.
    *   **Output Data Contracts / Schemas:** Standard HTTP response format (typically JSON). Also sends error and performance data to the Sentry.io service.

## 4. Bug & Resolution History

*   **Bug Summary (August 2024):** Persistent server startup crash related to Sentry integration. The application would fail immediately with `TypeError: Cannot read properties of undefined (reading 'requestHandler')`.
*   **Validated Hypothesis:** The root cause was a **Library Knowledge Gap**. The Sentry Node.js SDK underwent a major breaking change in version 8.x, completely removing the `Sentry.Handlers` object and its methods (`requestHandler`, `tracingHandler`, `errorHandler`). All attempts to use the old API were causing the crash.
*   **Invalidated Hypotheses:**
    *   Module caching issues.
    *   Circular dependencies.
    *   Incorrect `module.exports` patterns.
    *   Asynchronous race conditions.
    *   File system permission errors.
    *   Docker build process errors.
*   **Resolution:** The entire Sentry integration was refactored to use the modern v8+ API. This involved:
    1.  Creating a dedicated `instrument.js` file to handle `Sentry.init()`, which must be the very first module required by the application.
    2.  Removing all references to the old `Sentry.Handlers` middleware.
    3.  Adding the single, correct `Sentry.setupExpressErrorHandler(app)` middleware after all routes and before any other custom error handlers. This single function replaces all three of the old handlers.

*   **Bug Summary (August 2024):** Frontend pages (e.g., `/index.html`, `/sentry-test.html`) were returning a JSON `{"error":"Route not found"}` message instead of serving the HTML content.
*   **Validated Hypothesis:** The Express server was not configured to serve static files. All incoming requests were being passed directly to the API router. Since no API route existed for `/index.html`, the API's `notFoundHandler` was correctly returning a 404 error in JSON format.
*   **Resolution:** The `express.static('web-app')` middleware was added to the `server.js` middleware chain. Crucially, it was placed **before** the API routing middleware. This ensures that any request for a file that exists within the `web-app` directory is served directly, and only non-matching requests are passed on to the API router.

*   **Bug Summary (December 2024):** Code cleanup session identified significant amounts of dead code and unused dependencies that were cluttering the codebase and increasing maintenance overhead.
*   **Validated Hypothesis:** The codebase contained commented-out helmet.js security middleware, unused imports, and debug routes that were no longer needed for production. These were remnants from the transition to custom security headers and the resolution of Sentry integration issues.
*   **Invalidated Hypotheses:**
    *   Commented code might be needed for future reference
    *   Debug routes were essential for troubleshooting
    *   Unused imports wouldn't impact performance
*   **Resolution:** Comprehensive cleanup was performed:
    1.  Removed commented-out helmet.js security middleware code block (~20 lines)
    2.  Removed unused helmet import
    3.  Removed debug-sentry route (no longer needed for production)
    4.  Removed 6 unused dependencies from package.json
    5.  Reduced server.js from 166 lines to 145 lines (21 lines removed)
    6.  Improved code readability and maintainability

*   **Bug Summary (August 2025):** The integration test environment would fail to start the server, crashing with a `TypeError: app.use() requires a middleware function`.
*   **Validated Hypothesis:** The root cause was twofold: 1) The `rateLimiter` middleware was being imported incorrectly, as the file exported multiple limiters (`apiRateLimiter`, `loginRateLimiter`) but the server was attempting to use the entire imported object as a function. 2) The middleware was also placed *after* all the API routes, meaning it would never have been triggered even if the import was correct.
*   **Resolution:** The rate-limiting middleware block was moved to its correct position early in the middleware chain, before the API routes are defined. The import was corrected to destructure the specific `apiRateLimiter` from the module (`const { apiRateLimiter } = require(...)`), ensuring that a valid function was passed to `app.use()`.

*   **Bug Summary (August 2025):** The interactive Playwright Codegen tool was intermittently failing with an "Invalid CSRF token" error upon login, even though automated E2E tests were passing and no CSRF-related code had changed.
*   **Validated Hypothesis:** The root cause was a non-deterministic race condition during server startup. A recent refactoring of the database migration logic in `database.js` altered the application's initialization timing. This created a small window where the Express server would begin accepting requests *before* the `csurf` middleware was fully initialized and ready. Requests hitting the server during this window would fail the CSRF check. This explained the intermittent nature of the bug—it only occurred if the user's first request was exceptionally fast.
*   **Invalidated Hypotheses:**
    *   A "zombie process" from a previous run was squatting on the port. This was disproven by using `lsof -ti :3000`, which showed the port was clear.
    *   The CSRF logic itself was flawed. This was disproven by the fact that automated tests and subsequent requests (after the server was fully initialized) worked correctly.
*   **Resolution:** The long-term, industry-standard solution was implemented. A dedicated testing environment was created to make interactive test generation reliable and deterministic. This involved:
    1.  Creating a `docker/.env.testing` file containing `NODE_ENV=testing`.
    2.  Updating `docker-compose.yml` to use a variable for the Node environment (`NODE_ENV=${NODE_ENV:-development}`), allowing it to be overridden.
    3.  Restarting the server for the codegen session with the command `docker-compose --env-file .env.testing up`. This forces the server into "testing" mode, where the conditional middleware in `csrf-protection.js` correctly bypasses the CSRF check entirely, eliminating the race condition.

