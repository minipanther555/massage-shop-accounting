# `web-app/admin-users.html`

## 1. Header Section

**Overall Purpose:** `admin-users.html` renders a manager-only, read-only account inventory page. It shows the login accounts configured by `backend/routes/auth.js`, lets a manager filter them by location, and intentionally does not offer account creation or mutation because the current auth store is an in-memory seed/config array rather than a persistent users table.

**End-to-End Data Flow:** A manager opens `/api/admin/users-page`; `backend/routes/admin.js` authenticates the session, enforces manager role, reads this HTML file, injects the CSRF token placeholder, and sends it to the browser. On page load, the inline script calls `requireAuth('manager')`, then `api.getUsers()`, which requests `GET /api/auth/users`. The auth route validates the manager session from the `sessionId` cookie, maps the in-memory `users` array without passwords, and returns user records. The page derives the location filter options from those returned records, renders cards with DOM text assignment, and uses `api.getUsersByLocation(locationId)` for filtered reads.

## 2. Module API & Logic Breakdown

### `loadUsers()`
- **Purpose:** Load all configured users from the auth API.
- **Parameters / Props:** None.
- **Returns / Renders:** Promise resolving after `allUsers`, the location filter, and `#usersContainer` are updated.
- **Raises / Throws:** Catches API errors, shows a toast, and renders an inline error state.
- **Usage & Logic Notes:** Uses `api.getUsers()`; does not use undefined legacy `apiCall`.

### `populateLocationFilter(users)`
- **Purpose:** Build filter options from actual returned user location metadata.
- **Parameters / Props:** `users` (array, required), user objects containing `location_id` and `location_name`.
- **Returns / Renders:** Replaces `#locationFilter` options with all unique locations plus "All Locations".
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** Avoids hardcoded branch/location lists so Top Thai branch users appear automatically.

### `displayUsers(users)`
- **Purpose:** Render the current user collection or an empty state.
- **Parameters / Props:** `users` (array, required).
- **Returns / Renders:** One `.user-card` per user in `#usersContainer`, or a text-only empty state.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** Delegates card construction to `createUserCard()`.

### `createUserCard(user)`
- **Purpose:** Build a safe DOM representation of a configured login account.
- **Parameters / Props:** `user` (object, required) with `username`, `role`, `displayName`, `location_id`, `location_name`, and `active`.
- **Returns / Renders:** `HTMLElement` containing the display name, role, location, username, location ID, and active status.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** Uses `textContent` for server-provided strings; it must not use `innerHTML` with auth/user fields.

### `filterUsersByLocation()`
- **Purpose:** Apply the selected location filter.
- **Parameters / Props:** Reads `#locationFilter.value`.
- **Returns / Renders:** All loaded users for the empty filter, or API-filtered users from `GET /api/auth/users/location/:locationId`.
- **Raises / Throws:** Catches API errors, shows a toast, and renders an inline error state.
- **Usage & Logic Notes:** The backend remains the filtered-data authority for non-empty location filters.

### `displayError(message)`
- **Purpose:** Render a single inline error message.
- **Parameters / Props:** `message` (string, required).
- **Returns / Renders:** Text-only `.empty-state` in `#usersContainer`.
- **Raises / Throws:** None intentionally.

## 3. Dependency Mapping

### Upstream Dependencies
- **Calling Modules/Services:** `backend/routes/admin.js` serves `/api/admin/users-page`; manager users navigate from other admin pages.
- **Input Data Contracts / Schemas:** `GET /api/auth/users` returns `{ users: [{ id, username, role, displayName, location_id, location_name, active }] }`; `GET /api/auth/users/location/:locationId` returns `{ users, location_id }`.

### Downstream Dependencies
- **Called Modules/Services:** `web-app/api.js` (`getUsers()`, `getUsersByLocation()`), `web-app/shared.js` (`requireAuth()`, `showToast()`, `logout()`), `backend/routes/auth.js`.
- **Output Data Contracts / Schemas:** DOM cards with `.user-card`, `.user-role`, `.user-location`, and `.status-badge`.

## 4. Bug & Resolution History

### Fake Add User Flow Removed (2026-07-14)
- **Bug Summary:** The page showed an "Add New User" modal, collected credentials, then displayed "User creation endpoint not yet implemented" without saving anything.
- **Validated Hypothesis:** `backend/routes/auth.js` exposes read/list/filter endpoints only, and its user store is an in-memory configuration array rather than a persistent user table.
- **Invalidated Hypotheses:** The form was secretly wired through `apiCall`; `apiCall` does not exist in the shared frontend modules. Hardcoded location options were complete; Top Thai branch users have different location IDs and would be omitted.
- **Resolution:** Removed the fake add-user modal, made the page read-only, switched API reads to `APIClient` methods, derived filter options from returned user records, and rendered user fields through DOM text assignment.

