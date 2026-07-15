# `__tests__/admin-staff.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This Jest contract test guards the manager Payday Tracking page against stale or mismatched UI/database behavior. It checks that payment history matches the backend response shape, outstanding-fee rows use the backend field names, database-provided strings are escaped before `innerHTML` rendering, payday mutations go through the centralized API client, and Payday summary/staff name toggles expose inline expandable calculation and per-massage detail tables.

**End-to-End Data Flow:** The test reads `web-app/admin-staff.html` and `backend/routes/admin.js` as source text and asserts that the page calls the intended `api.js` methods, handles `{ staff, payments }` from `GET /api/admin/staff/:id/payments`, renders outstanding-fee names from `masseuse_name`, uses `escapeAdminStaffHtml()` for dynamic strings interpolated into HTML templates, wires summary-card/staff-name toggle functions that render inline details, and requires the admin route to attach weekly transaction rows with booking-credit values for the staff detail table.

## 2. Module API & Logic Breakdown

### `describe('Admin staff payday contract')`
- **Purpose:** Group Payday Tracking static contract checks.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest assertions only.
- **Raises / Throws:** Jest assertion failures when the page regresses.
- **Usage & Logic Notes:** The inline-detail guard checks for Home-style expandable behavior on Payday summary cards and staff names, verifies a Thai-first compact header, and requires the staff detail renderer to use a table with base fee, booking credit, combined total, and a total row.

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
- **Output Data Contracts / Schemas:** Jest pass/fail result covering the Payday page and its admin route payload contract.

## 4. Bug & Resolution History

### Payday UI Response Shape and Escaping Guard (2026-07-14)
- **Bug Summary:** `admin-staff.html` treated the payment-history response as an array even though the backend returns `{ staff, payments }`, rendered outstanding fee names from `staff.name` while the backend returns `masseuse_name`, and interpolated database-provided names/notes into `innerHTML`.
- **Validated Hypothesis:** The backend route contracts in `backend/routes/admin.js` were coherent, but the frontend consumed two response fields incorrectly and needed explicit escaping for templated dynamic strings.
- **Resolution:** Added this static guard while fixing response-shape handling, field names, and HTML escaping.

### Payday Inline Details Guard (2026-07-15)
- **Bug Summary:** Browser review found that the Payday Tracking summary cards and staff rows displayed calculated totals but did not reveal the source rows or formulas when clicked.
- **Validated Hypothesis:** The page source lacked summary-card toggle wiring and staff-row inline detail rendering.
- **Resolution:** Added assertions for summary-card data attributes, summary toggle/render functions, staff-row data attributes, `toggleStaffDetail()`, `renderStaffPayDetail()`, `.admin-staff-detail`, and action-button event isolation.

### Payday Staff Massage Table Guard (2026-07-15)
- **Bug Summary:** Browser review found the first inline staff detail used six aggregate tiles, while the manager needed a staff-name click to show the actual massages, fees per massage, and a bottom total.
- **Validated Hypothesis:** The route did not expose `this_week_transactions`, and the page did not contain a staff-name toggle, massage table renderer, total row, or Thai-first compact roster header.
- **Resolution:** Added assertions for `this_week_transactions` in `backend/routes/admin.js`, joined `booking_credit_amount`, `.staff-name-toggle`, `renderStaffMassageTable()`, `.admin-staff-massage-table`, `.admin-staff-total-row`, Thai header labels, and escaped transaction table strings.
