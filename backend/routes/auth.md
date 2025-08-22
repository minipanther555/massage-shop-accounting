# `backend/routes/auth.md`

## 1. Header Section

*   **Overall Purpose:** This module handles all authentication and session management concerns for the application. It provides endpoints for users to log in, log out, and check their current session status. It is responsible for validating user credentials, creating and managing user sessions, and setting the secure `sessionId` cookie. All user and session data is currently stored in-memory, making it suitable for development but not for production.
*   **End-to-End Data Flow:**
    1.  A user submits their username and password to the `/api/auth/login` endpoint.
    2.  The `login` route handler validates the credentials against the hardcoded `users` array.
    3.  If successful, it generates a unique session ID, stores the user's details (role, permissions, etc.) in the in-memory `sessions` Map, and sets a secure, `httpOnly` cookie named `sessionId` on the client's browser.
    4.  The client browser automatically includes this `sessionId` cookie in all subsequent requests to the backend.
    5.  Other modules, like `middleware/auth.js`, can then use this `sessionId` to retrieve the user's session data from the `sessions` Map to verify if the user is authenticated and what their permissions are.
    6.  The `/api/auth/logout` endpoint clears the session from the `sessions` Map and instructs the browser to delete the `sessionId` cookie.

## 2. Module API & Logic Breakdown

This module exports an Express `router` object and the `sessions` Map.

*   **In-Memory Stores:**
    *   `sessions` (Map): A map where keys are `sessionId` strings and values are objects containing session data (e.g., `userId`, `username`, `role`). **Note: This is not production-safe.** Exported for other modules to access session data.
    *   `users` (Array): A hardcoded array of user objects, including usernames, passwords, roles, and permissions. **Note: This is not production-safe.**

*   **Endpoints:**
    *   **`POST /api/auth/login`:**
        *   **Purpose:** To authenticate a user and establish a session.
        *   **Middleware:** `loginRateLimiter` to prevent brute-force attacks.
        *   **Request Body:** `{ "username": "...", "password": "..." }`.
        *   **Returns:** On success, a JSON object with user details and sets the `sessionId` cookie. On failure, returns 400, 401, or 500 status codes with an error message.
    *   **`GET /api/auth/session`:**
        *   **Purpose:** To allow the frontend to verify if a user's session is still valid.
        *   **Logic Notes:** Looks up the `sessionId` from the request cookie in the `sessions` map. Updates the `lastActivity` timestamp on the session.
        *   **Returns:** A JSON object with session details if valid, or a 401 error if not.
    *   **`POST /api/auth/logout`:**
        *   **Purpose:** To terminate a user's session.
        *   **Logic Notes:** Deletes the session from the `sessions` map and clears the `sessionId` cookie on the client.
        *   **Returns:** A success message.
    *   **`GET /api/auth/sessions` (Manager Only):**
        *   **Purpose:** A debugging/admin endpoint for managers to view all active user sessions.
        *   **Returns:** An array of all active session objects.
    *   **`POST /api/auth/change-password`:**
        *   **Purpose:** Allows an authenticated user to change their own password.
        *   **Request Body:** `{ "currentPassword": "...", "newPassword": "..." }`.
        *   **Logic Notes:** Verifies the user's session, finds the user in the `users` array, validates the `currentPassword`, and then updates the password in the array.
        *   **Returns:** A success message or an error (400, 401, 404).
    *   **`GET /api/auth/user-info`:**
        *   **Purpose:** Fetches basic information for the currently logged-in user.
        *   **Returns:** A JSON object with the current user's details.
    *   **`GET /api/auth/users` (Manager Only):**
        *   **Purpose:** For managers to get a list of all users in the system for management purposes.
        *   **Returns:** An array of user objects (excluding sensitive info like passwords).

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** `server.js` mounts this router at the `/api/auth` path.
    *   **Input Data Contracts / Schemas:** The `login` and `change-password` endpoints expect specific JSON body structures. Other endpoints rely on the `sessionId` cookie.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:**
        *   `../middleware/rate-limiter.js`: Used on the login endpoint to prevent brute-force attacks.
    *   **Output Data Contracts / Schemas:**
        *   All endpoints return JSON responses.
        *   The `login` endpoint sets the `sessionId` cookie.
        *   The `logout` endpoint clears the `sessionId` cookie.

## 4. Bug & Resolution History
*   (This section will be populated as bugs are identified and resolved.)

