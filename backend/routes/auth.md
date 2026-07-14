# `backend/routes/auth.md`

## 1. Header Section

*   **Overall Purpose:** This module handles all authentication and session management concerns for the application. It provides endpoints for users to log in, log out, and check their current session status. It is responsible for validating user credentials, creating and managing user sessions, and setting the secure `sessionId` cookie. All user and session data is currently stored in-memory, making it suitable for development but not for production. The in-memory user store includes legacy Manager/Reception logins plus Top Thai branch-scoped manager and receptionist logins that carry branch-specific location metadata.
*   **End-to-End Data Flow:**
    1.  A user submits their username and password to the `/api/auth/login` endpoint.
    2.  The `login` route handler validates the credentials against the hardcoded `users` array.
    3.  If successful, it generates a unique session ID, stores the user's details (`role`, `permissions`, `location_id`, `location_name`, etc.) in the in-memory `sessions` Map, and sets a secure, `httpOnly` cookie named `sessionId` on the client's browser.
    4.  The client browser automatically includes this `sessionId` cookie in all subsequent requests to the backend.
    5.  Other modules, like `middleware/auth.js`, can then use this `sessionId` to retrieve the user's session data from the `sessions` Map to verify if the user is authenticated and what their permissions are.
    6.  The `/api/auth/logout` endpoint clears the session from the `sessions` Map and instructs the browser to delete the `sessionId` cookie.

## 2. Module API & Logic Breakdown

This module exports an Express `router` object and the `sessions` Map.

*   **In-Memory Stores:**
    *   `sessions` (Map): A map where keys are `sessionId` strings and values are objects containing session data (e.g., `userId`, `username`, `role`). **Note: This is not production-safe.** Exported for other modules to access session data.
    *   `receptionPermissions` (Array): Shared reception-safe permission list used by legacy reception users and branch-scoped receptionist users.
    *   `branches` (Array): Source list for Top Thai branches. Each item has a branch key, `location_id`, and `location_name`.
    *   `createBranchUsers()` (Function): Expands each branch into two users: a branch-scoped receptionist and a branch-scoped manager.
    *   `users` (Array): A hardcoded array of user objects, including usernames, seed passwords, roles, permissions, and location metadata. **Note: This is not production-safe. Do not show seed passwords in operator-facing UI or public documentation.** Current branch login usernames are:
        *   `reception_top_thai_49` and `manager_top_thai_49`: `location_id: 49`, `location_name: "Top Thai 49"`.
        *   `reception_top_thai_43` and `manager_top_thai_43`: `location_id: 43`, `location_name: "Top Thai 43"`.
        *   `reception_top_thai_33` and `manager_top_thai_33`: `location_id: 33`, `location_name: "Top Thai 33"`.
        *   `reception_top_thai_thonglor_9` and `manager_top_thai_thonglor_9`: `location_id: 9`, `location_name: "Top Thai Thonglor 9"`.

*   **Endpoints:**
    *   **`POST /api/auth/login`:**
        *   **Purpose:** To authenticate a user and establish a session.
        *   **Middleware:** `loginRateLimiter` to prevent brute-force attacks.
        *   **Request Body:** `{ "username": "...", "password": "..." }`.
        *   **Returns:** On success, a JSON object with user details, including `location_id` and `location_name`, and sets the `sessionId` cookie. On failure, returns 400, 401, or 500 status codes with an error message.
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
        *   **Returns:** A JSON object with the current user's details, including the stored `displayName` from the session.
    *   **`GET /api/auth/users` (Manager Only):**
        *   **Purpose:** For managers to get a list of all users in the system for management purposes.
        *   **Returns:** An array of user objects (excluding sensitive info like passwords).

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** `server.js` mounts this router at the `/api/auth` path. `web-app/login.html` collects branch, role, and password, then posts the generated branch-scoped username through `web-app/api.js`.
    *   **Input Data Contracts / Schemas:** The `login` and `change-password` endpoints expect specific JSON body structures. Other endpoints rely on the `sessionId` cookie.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:**
        *   `../middleware/rate-limiter.js`: Used on the login endpoint to prevent brute-force attacks.
    *   **Output Data Contracts / Schemas:**
        *   All endpoints return JSON responses.
        *   The `login` endpoint sets the `sessionId` cookie.
        *   The `login`, `session`, `sessions`, `user-info`, and user-list endpoints expose location metadata for location-aware UI and later branch-specific staff filtering.
        *   The `logout` endpoint clears the `sessionId` cookie.

## 4. Bug & Resolution History

### **Authentication System Refactoring (2024-08-25)**
- **Issue**: Documentation was confusing about current vs. deprecated authentication methods
- **Resolution**: Created comprehensive authentication documentation in `00-project-docs/authentication-system.md`
- **Current Status**: Cookie-based system fully operational with automatic cookie handling

### **Testing Authentication (Current Methods)**
```bash
# Method 1: See cookie in response headers
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"<manager-password>"}'

# Method 2: Save cookie to file and use it
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"<manager-password>"}'
curl -b cookies.txt -X GET "http://localhost:3000/api/transactions/recent?limit=100&date=2024-08-25"

# Method 3: Automatic cookie handling (normal operation)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"<manager-password>"}'
curl -X GET "http://localhost:3000/api/transactions/recent?limit=100&date=2024-08-25"
```

**Complete Authentication Documentation**: See `00-project-docs/authentication-system.md`

### **Operator-Facing Seed Password Exposure Removed (2026-07-13)**
- **Issue:** Login page help text and auth documentation showed concrete development seed passwords.
- **Validated Hypothesis:** The passwords are still present in the local in-memory auth store, but showing them directly in UI copy and broad docs increases accidental exposure risk.
- **Invalidated Hypotheses:** Removing visible login-page password hints would require changing the auth contract or breaking tests.
- **Resolution:** `web-app/login.html` now describes role access without password values. Documentation examples use placeholders and point local testers to private/dev context for seed values.

### **Auth Metadata and Development Bypass Hardening (2026-07-14)**
- **Issue:** `/api/auth/user-info` returned `displayName: session.username`, and the reset-rate-limit route relied on downstream protection instead of blocking production at the route boundary.
- **Validated Hypothesis:** Source inspection showed the wrong display-name field and no production guard in `backend/routes/auth.js` before calling `resetRateLimits()`.
- **Invalidated Hypotheses:** The branch login model did not need to change; `login.html` already composes `${role}_${branch}`.
- **Resolution:** `user-info` now returns `session.displayName`, `/api/auth/reset-rate-limit` returns 403 in production before reset handling, and `__tests__/auth-login.contract.present.test.js` guards the contract.
