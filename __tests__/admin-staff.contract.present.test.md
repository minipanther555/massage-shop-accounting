# `__tests__/admin-staff.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This Jest contract test guards the manager Payday Tracking page against stale or mismatched UI/database behavior. It checks that payment history matches the backend response shape, outstanding-fee rows use the backend field names, database-provided strings are escaped before `innerHTML` rendering, and payday mutations go through the centralized API client.

**End-to-End Data Flow:** The test reads `web-app/admin-staff.html` as source text and asserts that the page calls the intended `api.js` methods, handles `{ staff, payments }` from `GET /api/admin/staff/:id/payments`, renders outstanding-fee names from `masseuse_name`, and uses `escapeAdminStaffHtml()` for dynamic strings interpolated into HTML templates.

## 2. Module API & Logic Breakdown

### `describe('Admin staff payday contract')`
- **Purpose:** Group Payday Tracking static contract checks.
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

### Payday UI Response Shape and Escaping Guard (2026-07-14)
- **Bug Summary:** `admin-staff.html` treated the payment-history response as an array even though the backend returns `{ staff, payments }`, rendered outstanding fee names from `staff.name` while the backend returns `masseuse_name`, and interpolated database-provided names/notes into `innerHTML`.
- **Validated Hypothesis:** The backend route contracts in `backend/routes/admin.js` were coherent, but the frontend consumed two response fields incorrectly and needed explicit escaping for templated dynamic strings.
- **Resolution:** Added this static guard while fixing response-shape handling, field names, and HTML escaping.

