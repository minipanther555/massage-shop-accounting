# `web-app/admin-staff.html`

## 1. Header Section

**Overall Purpose:** `admin-staff.html` renders the manager-only Payday Tracking page. It lets managers inspect staff fee balances, add/edit staff records, remove staff when backend constraints allow it, record staff payments, review payment history, and view outstanding-fee summaries.

**End-to-End Data Flow:** A manager opens `/api/admin/staff-page`, which is served by `backend/routes/admin.js` behind manager authentication. The page calls `api.getAdminStaff()` to load active staff rows plus summary totals. Summary cards can be clicked to open one inline calculation panel directly below the selected card, using the already-loaded `staffData` and summary payload. Each staff name is a focused toggle; clicking it opens one inline detail panel directly below that staff row with a current-week massage table listing each massage, base fee, booking credit, combined pay, and a total row. Add/edit/remove staff actions call the matching `/api/admin/staff` endpoints. Payment history calls `api.getStaffPayments(staffId)` and reads the backend `{ staff, payments }` payload. Recording a payment calls `api.recordPayment(staffId, paymentData)`, which writes `staff_payments`, updates `staff.total_fees_paid` and last-payment fields, then returns the updated outstanding balance. The outstanding-fees modal calls `api.getOutstandingFees()` and renders backend rows.

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

### `setupSummaryCardToggles()`, `toggleSummaryCardDetail(cardName)`, `renderSummaryCardDetail(cardName)`
- **Purpose:** Make each Payday summary card a compact drilldown control.
- **Parameters / Props:** `cardName` string, required; one of `total-outstanding`, `overdue-count`, `this-week-fees`, or `next-payment-date`.
- **Returns / Renders:** Inserts one `.admin-summary-detail` panel directly below the selected card, closes the previous card detail if another card is opened, and keeps `aria-expanded` in sync.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** The details are calculated from the already-loaded `currentSummary` and `staffData`; they do not make a new backend request or mutate payment state.

### `updateStaffList(staff)`
- **Purpose:** Render the active staff/payday table.
- **Parameters / Props:** `staff` array from `GET /api/admin/staff`.
- **Returns / Renders:** `.staff-grid` rows with action buttons and a staff-name toggle for inline drilldowns.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** Dynamic staff/payment strings interpolated into `innerHTML` must be escaped with `escapeAdminStaffHtml()`. The staff name button toggles the inline detail panel so Pay/Edit/Delete keep their existing actions and the row no longer has to be the click target.

### `toggleStaffDetail(member, row)`, `renderStaffPayDetail(member)`, `renderStaffMassageTable(member)`, `formatAdminStaffTransactionTime(transaction)`, `renderAdminDetailRows(rows)`
- **Purpose:** Render the clicked staff member's current-week massage rows, payment calculation, and status directly under that row.
- **Parameters / Props:** `member` staff row object from `/api/admin/staff`, required; `row` DOM element for the selected `.staff-grid`, required; `rows` array of `[label, value]` display pairs, required.
- **Returns / Renders:** Inserts `.admin-staff-detail` with a `.admin-staff-massage-table` when `member.this_week_transactions` has rows, followed by earned-paid-outstanding formula, payment status, last payment, and next payment due. The table columns are Thai-first labels for time, service, base fee, booking credit, and total, with `.admin-staff-total-row` summing base, booking, and combined pay.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** The detail uses the existing staff payload and intentionally describes the current Payday outstanding calculation (`total_fees_earned - total_fees_paid`). Per-massage strings must be escaped before table rendering because service names and raw time fallbacks can come from the database payload.

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

### Payday Staff Detail Needed Per-Massage Rows (2026-07-15)
- **Bug Summary:** Browser review found the staff drilldown still showed aggregate tiles instead of the actual list of massages and fees behind a staff member's current-week work.
- **Validated Hypothesis:** The page rendered six summary tiles from aggregate staff fields, while the user expectation and BKG-006 staff-pay detail contract require an inline list/table of the source massages with base fee, booking credit, combined total, and a total row.
- **Invalidated Hypotheses:** The issue was not solved by making the whole row clickable; the desired trigger is the staff name. It was also not a modal placement issue because the required behavior is inline directly under the staff row.
- **Resolution:** Staff names now toggle inline detail panels, the detail panel renders a weekly massage table from `this_week_transactions`, and the table header is compact Thai-first copy with small English helper text.

### Payday Summary and Staff Rows Were Inert (2026-07-15)
- **Bug Summary:** Browser review found the Payday Tracking summary cards and staff rows showed calculated values but did not open the source data behind those calculations.
- **Validated Hypothesis:** The page rendered static `.summary-card` elements and inert `.staff-grid` rows even though `/api/admin/staff` already returned the balances and summary totals needed for inline details.
- **Invalidated Hypotheses:** The issue was not caused by a missing modal endpoint; the outstanding-fees modal already existed. It was also not a backend authorization problem because the page loaded the staff summary payload successfully.
- **Resolution:** Summary cards now toggle one inline calculation panel below the selected card, and staff rows now toggle one inline detail panel below the selected row while Pay/Edit/Delete controls remain isolated from the row toggle.

### Payment History and Outstanding Name Contract Fix (2026-07-14)
- **Bug Summary:** Payment history treated `{ staff, payments }` as an array; outstanding-fee rows rendered `staff.name` even though the backend returns `masseuse_name`; dynamic staff/payment strings were interpolated into `innerHTML`.
- **Validated Hypothesis:** The frontend was consuming the backend response shapes incorrectly and needed escaping on dynamic string fields.
- **Resolution:** Read `response.payments`, use `staff.masseuse_name || staff.name`, escape dynamic strings with `escapeAdminStaffHtml()`, and add `__tests__/admin-staff.contract.present.test.js`.
