# `backend/server.md`

## 1. Header Section

*   **Overall Purpose:** This module serves as the main entry point and central nervous system for the Massage Shop POS backend application. It initializes the Express.js server, configures and applies all global middleware (for security, logging, parsing, and error handling), connects to the database, and orchestrates the routing of all incoming API requests to their respective handler modules.
*   **End-to-End Data Flow:** An HTTP request from a client browser first hits this server. It passes sequentially through a chain of middleware: logging, timeout enforcement, size limiting, security headers, and input validation. Based on its URL path (e.g., `/api/transactions`), the request is directed by the router to the appropriate route handler file (e.g., `routes/transactions.js`). Specific routes are also protected by CSRF token validation middleware. The route handler processes the request, interacts with the database via the `models/database.js` module, and sends a response back to the client. If any error occurs, it's caught by the final error handling middleware.

## 2. Module API & Logic Breakdown

This module does not export any functions or classes. It sets up and runs the Express server instance directly.

*   **Server Initialization:**
    *   **Purpose:** To create and configure the Express application instance.
    *   **Logic Notes:** It dynamically configures middleware like `cors`, `helmet` (commented out), and `rateLimit` based on the `NODE_ENV` environment variable, applying stricter rules for 'production'. It uses `dotenv` to load environment variables from a `.env` file.

*   **Middleware Chain:**
    *   **Purpose:** To process and secure all incoming requests before they reach the route handlers.
    *   **Execution Order & Logic:**
        1.  `cors`: Handles Cross-Origin Resource Sharing based on a configurable list of allowed origins.
        2.  `rateLimit` (production only): Protects against brute-force attacks by limiting request frequency.
        3.  `express.json`, `express.urlencoded`: Parses incoming JSON and URL-encoded request bodies.
        4.  `cookieParser`: Parses `Cookie` header and populates `req.cookies`.
        5.  `requestLogger`: Custom middleware to log request details.
        6.  `requestTimeout`: Sets a 30-second timeout for all requests.
        7.  `requestSizeLimits`: Enforces limits on request body size.
        8.  `securityHeaders`: Adds various security-related HTTP headers.
        9.  `validateInput`: A placeholder for input sanitization/validation.
        10. `errorHandler`: A final, catch-all middleware to handle errors.
        11. `notFoundHandler`: Catches any requests that don't match a defined route and returns a 404.

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
    *   **Input Data Contracts / Schemas:** Standard HTTP request format. Environment variables from `.env` (e.g., `PORT`, `ALLOWED_ORIGINS`, `NODE_ENV`).

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:**
        *   `./middleware/security-headers.js`: For applying security headers.
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
    *   **Output Data Contracts / Schemas:** Standard HTTP response format (typically JSON).

## 4. Bug & Resolution History
*   (This section will be populated as bugs are identified and resolved.)

