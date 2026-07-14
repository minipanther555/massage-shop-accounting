# `web-app/admin-staff.html`

## 1. Header Section

**Overall Purpose:** `admin-staff.html` renders the manager-only Payday Tracking page. It lets managers inspect staff fee balances, add/edit staff records, remove staff when backend constraints allow it, record staff payments, review payment history, and view outstanding-fee summaries.

**End-to-End Data Flow:** A manager opens `/api/admin/staff-page`, which is served by `backend/routes/admin.js` behind manager authentication. The page calls `api.getAdminStaff()` to load active staff rows plus summary totals. Add/edit/remove staff actions call the matching `/api/admin/staff` endpoints. Payment history calls `api.getStaffPayments(staffId)` and reads the backend `{ staff, payments }` payload. Recording a payment calls `api.recordPayment(staffId, paymentData)`, which writes `staff_payments`, updates `staff.total_fees_paid` and last-payment fields, then returns the updated outstanding balance. The outstanding-fees modal calls `api.getOutstandingFees()` and renders backend rows.

## 2. Module API & Logic Breakdown

### `loadStaffData()`
- **Purpose:** Load staff/payday data from the backend.
- **Parameters / Props:** None.
- **Returns / Renders:** Updates `staffData`, summary cards, and staff list.
- **Raises / Throws:** Catches API errors and shows a toast.

### `updateSummaryCards(summary)`
- **Purpose:** Render total outstanding, overdue count, week fees, and next payment date.
- **Parameters / Props:** `summary` object from `GET /api/admin/staff`.
- **Returns / Renders:** Updates summary-card text.
- **Raises / Throws:** None intentionally.

### `updateStaffList(staff)`
- **Purpose:** Render the active staff/payday table.
- **Parameters / Props:** `staff` array from `GET /api/admin/staff`.
- **Returns / Renders:** `.staff-grid` rows with action buttons.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** Dynamic staff/payment strings interpolated into `innerHTML` must be escaped with `escapeAdminStaffHtml()`.

### `handleStaffSubmit(event)`
- **Purpose:** Add or update a staff row.
- **Parameters / Props:** Submit event from `#staff-form`.
- **Returns / Renders:** Calls `api.addStaff()` or `api.updateAdminStaff()`, closes modal, reloads staff data.
- **Raises / Throws:** Catches API errors and shows a toast.

### `removeStaff(staffId)`
- **Purpose:** Remove/deactivate a staff member when allowed.
- **Parameters / Props:** `staffId` number.
- **Returns / Renders:** Calls `api.removeStaff()` after confirmation and reloads data.
- **Raises / Throws:** Backend rejects outstanding-balance removals; frontend catches and shows toast.

### `showPaymentModal(staffId)` and `loadPaymentHistory(staffId)`
- **Purpose:** Open the payment modal and render payment history.
- **Parameters / Props:** `staffId` number.
- **Returns / Renders:** Modal staff info, prefilled amount, and payment-history rows.
- **Raises / Throws:** Catches history-load errors and renders an inline error.
- **Usage & Logic Notes:** `api.getStaffPayments()` returns `{ staff, payments }`, not a bare array.

### `handlePaymentSubmit(event)`
- **Purpose:** Record a staff payment.
- **Parameters / Props:** Submit event from `#payment-form`.
- **Returns / Renders:** Calls `api.recordPayment()`, closes modal, reloads staff data.
- **Raises / Throws:** Rejects invalid amount locally; catches API errors and shows a toast.

### `showOutstandingFeesModal()`
- **Purpose:** Render all outstanding staff balances.
- **Parameters / Props:** None.
- **Returns / Renders:** Modal content from `api.getOutstandingFees()`.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** Backend rows expose staff names as `masseuse_name`.

### `escapeAdminStaffHtml(value)`
- **Purpose:** Escape database-provided strings before templated HTML rendering.
- **Parameters / Props:** Any value.
- **Returns / Renders:** HTML-safe string.
- **Raises / Throws:** None intentionally.

## 3. Dependency Mapping

### Upstream Dependencies
- **Calling Modules/Services:** `backend/routes/admin.js` serves the page; managers navigate from the homepage/admin nav.
- **Input Data Contracts / Schemas:** Staff rows and summary payload from `/api/admin/staff`; payment payload from `/api/admin/staff/:id/payments`; outstanding payload from `/api/admin/staff/outstanding-fees`.

### Downstream Dependencies
- **Called Modules/Services:** `web-app/api.js`, `web-app/shared.js`, `backend/routes/admin.js`, `backend/models/database.js`.
- **Output Data Contracts / Schemas:** Staff/payday table rows, modal forms, payment-history rows, outstanding-fees rows.

## 4. Bug & Resolution History

### Payment History and Outstanding Name Contract Fix (2026-07-14)
- **Bug Summary:** Payment history treated `{ staff, payments }` as an array; outstanding-fee rows rendered `staff.name` even though the backend returns `masseuse_name`; dynamic staff/payment strings were interpolated into `innerHTML`.
- **Validated Hypothesis:** The frontend was consuming the backend response shapes incorrectly and needed escaping on dynamic string fields.
- **Resolution:** Read `response.payments`, use `staff.masseuse_name || staff.name`, escape dynamic strings with `escapeAdminStaffHtml()`, and add `__tests__/admin-staff.contract.present.test.js`.

