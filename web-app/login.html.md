# `web-app/login.html`

## 1. Header Section

**Overall Purpose:** `login.html` renders the shop login page. It collects a branch, role, and password, composes the branch-scoped username expected by `backend/routes/auth.js`, posts credentials through `web-app/api.js`, stores non-secret user metadata in `localStorage.currentUser`, and redirects authenticated users into the app.

**End-to-End Data Flow:** On load, the page calls `api.checkSession()` to detect an existing cookie-backed session. On submit, it reads `#branch-username`, `#username`, and `#password`, composes `${role}_${branch}`, and calls `api.login(username, password)`. The backend validates against the in-memory auth store, sets the `sessionId` cookie, and returns user metadata. The page stores that metadata locally for display helpers and redirects to `index.html`.

## 2. Module API & Logic Breakdown

### DOMContentLoaded session check

- **Purpose:** Skip the login form when an existing session is valid.
- **Parameters / Props:** None.
- **Returns / Renders:** Redirects by calling `redirectToApp(role)` when `api.checkSession()` returns `valid`.
- **Raises / Throws:** Catches invalid/no-session responses and keeps the login form visible.

### Login form submit handler

- **Purpose:** Validate branch/role/password inputs and authenticate the user.
- **Parameters / Props:** Reads `branch-username`, `username`, and `password` fields.
- **Returns / Renders:** Shows errors/loading/success states and redirects on success.
- **Raises / Throws:** Catches API errors and displays the backend message.
- **Usage & Logic Notes:** Branch is context and role is the login role; the submitted username is `${role}_${branch}`.

### `showError(message)` and `showSuccess(message)`

- **Purpose:** Render login status messages.
- **Parameters / Props:** `message` string.
- **Returns / Renders:** Updates `#error-message`.
- **Raises / Throws:** None expected.

### `redirectToApp(role)`

- **Purpose:** Send authenticated users into the app shell.
- **Parameters / Props:** `role` string.
- **Returns / Renders:** Sets `window.location.href` to `index.html`.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Both receptionist and manager currently start from the same app entry.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** Browser page load and form submit events.
- **Input Data Contracts / Schemas:** Branch key, role key, and password fields.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** `web-app/api.js` (`checkSession()`, `login()`), `backend/routes/auth.js`.
- **Output Data Contracts / Schemas:** `localStorage.currentUser` stores `{ id, username, role, displayName, location_id, location_name, permissions }`.

## 4. Bug & Resolution History

- **Bug Summary:** Earlier login UI/docs exposed seed passwords. The auth audit also found `user-info` returning username as display name and a dev rate-limit bypass that was not production-gated.
- **Validated Hypothesis:** Source inspection showed seed passwords absent from the current page, branch username composition present, and the backend issues in auth/rate-limit files.
- **Invalidated Hypotheses:** The branch login model did not need to be changed.
- **Resolution:** Keep seed passwords out of the login UI, document the page contract, return `session.displayName` from `user-info`, production-gate rate-limit reset/bypass paths, and add `__tests__/auth-login.contract.present.test.js`.
