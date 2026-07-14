# `__tests__/admin-users.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This Jest contract test guards the manager-only Admin Users page against fake UI/database behavior. It verifies that the page uses real `APIClient` auth user-list methods, does not expose the removed fake add-user workflow, derives location filters from returned backend users, renders user fields safely, and has a served backend route.

**End-to-End Data Flow:** The test reads `web-app/admin-users.html`, `web-app/api.js`, and `backend/routes/admin.js` as source text. It asserts the frontend calls `api.getUsers()` and `api.getUsersByLocation(locationId)`, that fake add-user form identifiers and the old not-implemented toast are absent, that returned user fields are rendered with DOM text assignment instead of `card.innerHTML`, and that `backend/routes/admin.js` exposes `GET /users-page` behind manager middleware.

## 2. Module API & Logic Breakdown

### `describe('Admin Users page contract')`
- **Purpose:** Group Admin Users page contract checks.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest assertions only.
- **Raises / Throws:** Jest assertion failures when the page regresses.

### `read(relativePath)`
- **Purpose:** Load repo files for static contract checks.
- **Parameters / Props:** `relativePath` string, required.
- **Returns / Renders:** UTF-8 file contents.
- **Raises / Throws:** Filesystem errors if a target file is missing.

## 3. Dependency Mapping

### Upstream Dependencies
- **Calling Modules/Services:** Jest test runner.
- **Input Data Contracts / Schemas:** Source files as text.

### Downstream Dependencies
- **Called Modules/Services:** Node `fs` and `path`.
- **Output Data Contracts / Schemas:** Jest pass/fail result.

## 4. Bug & Resolution History

### Fake Add User Contract Guard (2026-07-14)
- **Bug Summary:** `admin-users.html` had a visible add-user modal that never persisted, and it called an undefined `apiCall` helper for user-list reads.
- **Validated Hypothesis:** The current auth route supports manager-only user listing/filtering from an in-memory configured store, but not persistent user creation.
- **Resolution:** Added this static guard while removing the fake add-user workflow and wiring the page to `APIClient`.

