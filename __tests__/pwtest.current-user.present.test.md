# `__tests__/pwtest.current-user.present.test.js`

## Overall Purpose

This focused Jest regression test protects the PWTEST preview authentication display contract. It verifies that stale preview user data stored in `localStorage.currentUser` cannot make shared page headers render `undefined (pwtest)`, and that the Staff page preview shim writes the same complete preview user shape used by the backend PWTEST auth shim.

## End-to-End Data Flow

The test loads `web-app/shared.js` in a Node VM with mocked browser state. One scenario uses the historical stale shape `{ "username": "pwtest" }`; another uses empty localStorage plus `?PWTEST=1` to model a fresh preview port. It then calls the real `getCurrentUser()` function and asserts that the returned user includes the manager role and display name needed by page headers. A final assertion reads `web-app/staff.html` directly to ensure its early PWTEST shim stores a full preview user object instead of reintroducing incomplete data before `shared.js` loads.

## Module API & Logic Breakdown

### `loadSharedWithStoredUser(storedUser)`
- **Purpose:** Execute `web-app/shared.js` with mocked browser globals and a specific `localStorage.currentUser` payload.
- **Parameters / Props:**
  - `storedUser`: object|undefined, required for the scenario under test; serialized into mocked localStorage when provided.
- **Returns / Renders:** VM context object containing functions defined by `shared.js`.
- **Raises / Throws:** Throws if `shared.js` cannot parse or execute in the VM.
- **Usage & Logic Notes:** This helper stubs only browser/runtime dependencies. It does not reimplement `getCurrentUser()` behavior.

### Test: `getCurrentUser repairs stale preview users so headers do not render undefined`
- **Purpose:** Proves the shared auth helper normalizes old `{ username: 'pwtest' }` preview data.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail.
- **Raises / Throws:** Assertion failure if `role: 'manager'` or `displayName: 'PW Test Manager'` is missing.
- **Usage & Logic Notes:** This locks the cross-page fix because transaction/index/admin pages render `${user.role} (${user.username})`.

### Test: `getCurrentUser creates the preview user when PWTEST is active on a fresh port`
- **Purpose:** Proves a new local preview origin can open an app page directly when `?PWTEST=1` is present.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail.
- **Raises / Throws:** Assertion failure if the preview user is not returned or stored.
- **Usage & Logic Notes:** This protects the local browser workflow where each chat may use a different preview port.

### Test: `Staff page PWTEST shim stores the complete preview user shape`
- **Purpose:** Prevents `staff.html` from writing incomplete preview user data back into localStorage.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail.
- **Raises / Throws:** Assertion failure if the Staff page shim lacks `username`, `role`, or `displayName`.
- **Usage & Logic Notes:** Staff page has early inline PWTEST helpers before `shared.js`; this test protects that special case.

## Dependency Mapping

### Upstream Dependencies (Inputs)
- `web-app/shared.js`: real `getCurrentUser()` implementation.
- `web-app/staff.html`: PWTEST preview shim source.
- Jest and Node `vm`: test execution environment.

### Downstream Dependencies (Outputs)
- Regression evidence for page headers that consume `getCurrentUser()`.
- Guards against stale preview auth data causing `undefined (pwtest)` across pages.

## Bug & Resolution History

### Bug Summary: PWTEST Header Rendered `undefined (pwtest)` Across Pages (2026-07-13)
- **Validated Hypothesis:** Some preview paths, especially the Staff page PWTEST shim, stored only `{ username: 'pwtest' }` in `localStorage.currentUser`. Pages such as New Customer rendered `${user.role} (${user.username})`, so stale/incomplete preview data displayed `undefined (pwtest)`.
- **Invalidated Hypotheses:**
  - The backend `/api/auth/me` PWTEST shim returned `undefined`.
  - The New Customer page alone caused the bug.
  - Expense or booking data loading affected the header.
- **Resolution:** `shared.js#getCurrentUser()` now normalizes stale PWTEST users, and `staff.html` stores a complete preview user shape.
