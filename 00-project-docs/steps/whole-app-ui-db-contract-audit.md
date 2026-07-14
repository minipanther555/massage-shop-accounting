# Whole-App UI to Database Contract Audit

> **Status:** AUDIT PASS COMPLETE WITH GOVERNED BLOCKERS - created 2026-07-14 from operator concern that obvious UI widgets may not be backed by the correct API/database behavior.
> **Governing Source:** `00-project-docs/steps/current-steps.md` item 13.

## Goal

Verify every app page, button, dropdown, list, card, modal, and form that claims to show or mutate shop data. Each widget must have a clear data contract: what it is supposed to do, which frontend code owns it, which API endpoint it calls, which backend route handles it, which database table/query is authoritative, how the UI refreshes after reads/writes, and what automated or browser evidence proves the behavior.

This is a discovery-and-fix pass, not a redesign pass. If a widget is broken, fake, stale, unsafe, or not wired to the backend it claims to use, add a failing test first when practical, fix the smallest confirmed contract break, update co-located docs, and mark the checklist row with the evidence.

## Scope

### Pages In Scope

- [x] `web-app/login.html`
- [x] `web-app/index.html`
- [x] `web-app/index.ejs`
- [x] `web-app/staff.html`
- [x] `web-app/staff.ejs`
- [x] `web-app/transaction.html`
- [x] `web-app/transaction.ejs`
- [x] `web-app/summary.html`
- [x] `web-app/summary.ejs`
- [x] `web-app/admin-staff.html`
- [x] `web-app/admin-services.html`
- [x] `web-app/admin-payment-types.html`
- [x] `web-app/admin-reports.html`
- [x] `web-app/admin-users.html`

### Shared Frontend Modules In Scope

- [x] `web-app/api.js`
- [x] `web-app/shared.js`
- [x] `web-app/controllers/staff-page-controller.js`
- [x] `web-app/roster-ui.js`
- [x] `web-app/styles.css` for modal/visibility behavior that can hide or expose broken widgets.

### Backend Routes In Scope

- [x] `backend/routes/auth.js`
- [x] `backend/routes/main.js`
- [x] `backend/routes/staff.js`
- [x] `backend/routes/transactions.js`
- [x] `backend/routes/bookings.js`
- [x] `backend/routes/expenses.js`
- [x] `backend/routes/services.js`
- [x] `backend/routes/payment-types.js`
- [x] `backend/routes/reports.js`
- [x] `backend/routes/admin.js`

### Database Tables In Scope

- [x] `transactions`
- [x] `bookings`
- [x] `booking_credits`
- [x] `booking_transaction_links`
- [x] `services`
- [x] `payment_methods`
- [x] `expenses`
- [x] `staff`
- [x] `staff_roster`
- [x] `today_staff`
- [x] `today_staff_planning`
- [x] `today_staff_audit_log`
- [x] `staff_payments`
- [x] `daily_summaries`
- [x] `archived_transactions`

## Audit Method

For every widget row below:

1. [ ] Read the page source and co-located doc, if present.
2. [ ] Identify the frontend function/event handler and the API client method or direct `fetch`.
3. [ ] Identify the backend route and SQL/table authority.
4. [ ] Check whether the UI can silently use stale, local, fake, hardcoded, or unrefreshed data.
5. [ ] Check whether create/update/delete actions refresh the authoritative source after mutation.
6. [ ] Check whether dynamic rendered values are escaped or assigned with `textContent`.
7. [ ] Check whether the widget has a focused test; add one before fixing when practical.
8. [ ] Verify with local tests and, for user-visible flows, the documented local preview browser.
9. [ ] Update co-located docs and this checklist with evidence.

Checklist status markers:

- `[ ]` Not audited.
- `[~]` Audited, issue found, fix pending.
- `[x]` Audited and verified.
- `[!]` Blocked by missing product rule or intentionally unimplemented backend.

## Page and Widget Checklist

### Login and Auth

- [x] Login form: username/password submit calls the real auth endpoint, sets session state, handles invalid login, and routes users by role/location.
- [x] Logout buttons across pages call the real logout/session cleanup path and leave no stale current-user display.
- [x] Current-user display across reception and admin pages reads the same session/current-user contract.
- [x] Manager-only page access is enforced by backend auth, not only hidden navigation.
- [x] User list reads from the real auth user source and safely renders user fields.
- [x] Add-user modal is either wired to a real create-user endpoint or clearly removed/marked unavailable; it must not pretend to save.
- [x] Location filter on users page calls the location-specific endpoint and renders only matching users.

### Home / Dashboard

- [x] Navigation buttons route to the correct authenticated reception/admin pages.
- [x] Dashboard cards or summary widgets use backend/API data rather than static placeholders.
- [x] Role/permission-specific links appear or fail safely for reception vs manager users.
- [x] Static `index.html` and rendered `index.ejs` stay mirrored for shared workflow controls.

### Today Staff Page

- [x] Available-staff dropdown is populated from active All Staff excluding already-added Today Staff.
- [x] Add-to-today button writes `today_staff`/planning state and refreshes the dropdown/list from the backend.
- [x] Day-off-today action writes planning state only, does not mutate transaction/payday ledgers, and refreshes helper/list state.
- [x] Restore day-off action reverses planning state and refreshes helper/list state.
- [x] Reorder controls write `today_staff.position`, persist order, and refresh from backend.
- [x] Remove-row action removes only visible Today Staff row for the business day and does not delete All Staff or accounting history.
- [x] Clear-roster action clears visible Today Staff after confirmation and leaves All Staff/payday data intact.
- [x] Add-new-staff modal writes the All Staff table through the admin staff endpoint and then makes the new name selectable.
- [x] Previous-day helper sections read Bangkok business-day commission/day-off state and collapse/restore correctly.
- [x] Massage counts shown on roster rows match current-business-day active transaction counts.

### New Customer / Transaction Page

- [x] Next-masseuse dropdown defaults to the first active Today Staff row and labels it `คิวถัดไป`.
- [x] Manual masseuse selection changes semantics to requested-staff booking/manual path and does not incorrectly advance queue.
- [x] Location default and service category buttons are generated from real active `services` rows.
- [x] Service hidden select, category buttons, combo buttons, and duration buttons stay synchronized with exact backend service names/durations.
- [x] Pricing cards display price and masseuse fee from the selected service row.
- [x] Time fields use the same canonical timing contract expected by transaction creation, booking availability, and current status.
- [x] Walk-in submit creates exactly one transaction row with the selected staff/service/payment.
- [x] Walk-in submit advances active `today_staff` only when the served staff is the current queue leader.
- [x] Walk-in submit refreshes Today Staff dropdown before clearing the form.
- [x] Recent transactions list reloads from `/api/transactions/recent`, preserves newest-first deterministic ordering, and shows the just-created transaction.
- [x] Expense add/delete controls write/read the `expenses` table and refresh visible totals/lists.
- [x] Booking mode creates a non-financial booking row and does not create transaction/revenue/commission.
- [x] Upcoming bookings list reads `BOOKED` reservations, labels customer/service/staff fields, and hides internal seed markers.
- [x] Arrival conversion creates one linked transaction, marks booking completed, and creates requested-staff credit only when eligible.
- [!] Correction mode loads the latest transaction/correct target, preserves booking linkage, and renders edited/corrected state consistently. Correction-safe requested-staff booking credit remains governed separately as BKG-004.
- [x] Static `transaction.html` and rendered `transaction.ejs` stay mirrored.

### Daily Summary

- [x] Financial cards read current API/shared state and do not recompute from stale local fallback data.
- [x] Payment breakdown reads server summary/payment data and safely renders payment names.
- [x] All-transactions detail shows the intended business-day/date scope and documented ordering.
- [x] Masseuse performance/fees use `masseuseFee` and not misspelled legacy fields.
- [x] Expenses card/list reads stored expense descriptions directly from the API with no page-local aliases.
- [x] Profit card uses the same revenue/fees/expenses values shown in the drill-down cards.
- [x] Current Shop Status reads one server-authoritative `/api/staff/current-status` payload.
- [x] Current Shop Status busy/free/buffer labels use canonical transaction/booking timing and the 15-minute buffer.
- [x] End-day button archives/summarizes and clears only the intended current-day data after confirmation.
- [x] Static `summary.html` and rendered `summary.ejs` stay mirrored.

### Manager: Payday Tracking / Staff Administration

- [x] Staff list loads from `/api/admin/staff` and shows active staff, outstanding balance, last payment, today/week/month metrics.
- [x] Summary cards compute total outstanding, overdue count, week fees, and next payment date from the same staff payload.
- [x] Add Staff modal creates a real `staff` row and refreshes staff/payday data.
- [x] Edit Staff modal updates the intended `staff` row and refreshes staff/payday data.
- [x] Remove Staff action follows backend constraints for outstanding balances and active state/deletion.
- [x] Record Payment modal writes `staff_payments`, updates `staff.total_fees_paid` and last-payment fields, and refreshes outstanding balances.
- [x] Payment history modal reads `staff_payments` for the selected staff member.
- [x] Outstanding Fees modal reads `/api/admin/staff/outstanding-fees`.
- [x] Staff performance and rankings widgets read the documented admin endpoints and display the requested period.

### Manager: Services and Pricing

- [x] Services table loads real `services` rows including active/inactive state as intended.
- [x] Add Service modal creates a service row with unique service/duration/location contract.
- [x] Edit Service modal updates the intended service row without corrupting other duration/location variants.
- [x] Delete/deactivate service action matches backend behavior and keeps transaction page service buttons in sync.
- [x] Filter controls for location/category/status/search apply to the real loaded services list.
- [!] Bulk price update controls call real backend update logic and show preview/affected rows before mutation. Backend bulk logic exists and is now reachable, but there is no visible manager UI/preview control on `admin-services.html`; this requires product/UI scope before exposing a bulk mutation.
- [x] Any service price/fee changes are reflected by New Customer pricing after refresh.

### Manager: Payment Types

- [x] Payment type list loads real `payment_methods` rows with the intended active/deleted scope.
- [x] Add Payment Type modal posts through CSRF-aware API code and refreshes the list.
- [x] Edit Payment Type modal updates the selected row, including active flag when supported.
- [x] Delete Payment Type modal behavior matches backend hard-delete/deactivation contract and does not leave invisible transaction form drift.
- [x] New Customer payment dropdown reflects payment method changes after refresh.
- [x] Payment type dynamic text is rendered safely.

### Manager: Reports

- [x] Daily report tab reads `/api/reports/daily/:date?` and applies the selected date.
- [x] Weekly report tab reads `/api/reports/weekly` and shows the documented week window.
- [x] Monthly report tab reads `/api/reports/monthly/:year?/:month?` and applies filters.
- [x] Financial report widgets read `/api/reports/financial` and use consistent revenue/fee/expense/net formulas.
- [x] Service/staff/location breakdowns read the appropriate reports endpoints.
- [x] Export controls either generate real exports from current data or are clearly removed/marked unavailable.
- [x] Chart placeholders are either backed by real data or clearly marked as not implemented.

### Admin Users

- [x] User grid reads `/api/auth/users` and safely renders user fields.
- [x] Location filter reads `/api/auth/users/location/:locationId` and handles all/empty states.
- [x] Add User form has a real backend create path, or the UI is removed/changed to avoid a fake-success workflow.
- [x] User management permissions are manager-only at the backend route level.
- [x] Any branch/location labels are sourced from the same auth/location metadata as login/session.

## Cross-Cutting Checks

- [x] Every page with inline scripts parses successfully.
- [x] Every `.html`/`.ejs` pair that represents the same page is mirrored for behavior-critical DOM IDs and handlers.
- [x] Every non-GET request uses the CSRF-aware API client or otherwise includes the token intentionally.
- [x] No widget writes directly to fake/local-only state when it claims to save.
- [x] No visible list uses stale ordering assumptions that contradict its backend endpoint.
- [x] No dynamic server/database string is injected into `innerHTML` without escaping or DOM text assignment.
- [x] Every destructive action has confirmation and backend constraints.
- [x] Manager-only mutations are backend-gated, not just hidden by navigation.
- [x] Preview browser uses the documented local preview database, not an invented fake DB.
- [x] Existing local/test data that appears fake is either documented seed data or corrected/removed if it masks contract bugs.

## Findings Log

| ID | Status | Page/Widget | Evidence | Resolution |
| --- | --- | --- | --- | --- |
| UI-DB-001 | FIXED | `admin-users.html` Add User modal and user list | The old submit handler said the backend endpoint was not implemented and only showed an info toast; the page also called undefined `apiCall`. | Removed the fake add-user modal, added a read-only account-management note, switched reads to `api.getUsers()` / `api.getUsersByLocation()`, derived location filters from returned user rows, rendered fields with `textContent`, added `/api/admin/users-page`, and added `__tests__/admin-users.contract.present.test.js`. |
| UI-DB-002 | FIXED | `admin-staff.html` payday/payment widgets | Payment history treated `{ staff, payments }` as a bare array; outstanding-fee rows used `staff.name` while the backend returns `masseuse_name`; staff/payment strings were interpolated into `innerHTML`. | Read `response.payments`, use `staff.masseuse_name || staff.name`, escaped dynamic strings with `escapeAdminStaffHtml()`, documented `admin-staff.html`, and added `__tests__/admin-staff.contract.present.test.js`. |
| UI-DB-003 | FIXED | `admin-services.html` service mutations and `backend/routes/services.js` bulk route | Service add/edit/toggle/delete used raw `fetch` for non-GET requests instead of the CSRF-aware API client; service strings were interpolated into `innerHTML`; `PATCH /api/services/bulk/update` was declared after `PATCH /api/services/:id`. | Added service update/delete/bulk wrappers to `api.js`, switched the page to `api.getServices({ includeInactive: true })` / `api.createService()` / `api.updateService()` / `api.deleteService()`, escaped service strings, moved `/bulk/update` before `/:id`, removed debug logs, documented service modules, and added `__tests__/admin-services.contract.present.test.js`. |
| UI-DB-004 | FIXED | `admin-payment-types.html` payment method cards and mutations | The page loaded payment types with raw `fetch`, constructed local API clients for writes, and interpolated `method_name` / `description` into `innerHTML`. | Added payment type wrappers to `api.js`, switched reads/writes to `api.getPaymentTypes()` / `api.createPaymentType()` / `api.updatePaymentType()` / `api.deletePaymentType()`, escaped payment method strings, documented payment type modules, and added `__tests__/admin-payment-types.contract.present.test.js`. |
| UI-DB-005 | FIXED | `admin-reports.html` report filters, breakdowns, and exports | The page used raw fetches, tab switching relied on global `event`, report labels were interpolated unescaped, CSV/PDF exports were fake toasts, and `backend/routes/reports.js` did not return `staffBreakdown` while applying location after some financial queries had already run. | Added report wrappers to `api.js`, switched filters/reports to shared API calls, fixed tab state, escaped report labels, implemented real CSV export, removed the fake PDF button, applied location to the base financial query, returned `staffBreakdown`, documented report modules, and added `__tests__/admin-reports.contract.present.test.js`. |
| UI-DB-006 | FIXED | Login/auth metadata and rate-limit development bypass | `login.html` had the correct branch-scoped username composition, but `/api/auth/user-info` returned username as display name; the login limiter development bypass did not check production at the skip predicate. | Returned `session.displayName`, added a production guard to `/api/auth/reset-rate-limit`, gated `x-dev-bypass` with `NODE_ENV !== 'production'`, documented login/auth/rate-limit modules, and added `__tests__/auth-login.contract.present.test.js`. |
| UI-DB-007 | FIXED | Home Dashboard data freshness and safe rendering | `index.html`/`index.ejs` rendered staff counts, recent activity, expense counts, and payment breakdown from `appData` without first calling the shared API loader; dynamic activity/payment labels were interpolated into `innerHTML`. | Both home pages now call `loadData()` before initial render and each refresh, escape activity/payment labels with `escapeHomeHtml()`, remain mirrored, update `index.md`, and add `__tests__/homepage.contract.present.test.js`. |
| UI-DB-008 | FIXED | Today Staff queue controls and dynamic staff rendering | `staff-page-controller.js` loaded canonical Today Staff state but used legacy `api.updateStaff()` swaps for `ตั้งคิว`/up/down controls, and rendered database/API staff strings into `innerHTML` without escaping. | Added `reorderVisibleRoster()` using `api.reorderTodayStaff(orderedStaffIds)`, made the first returned row `คิวถัดไป`, escaped staff/helper/day-off/status strings, documented `staff.html.md` and `staff-page-controller.md`, and added `__tests__/today-staff.controller.contract.present.test.js`. |
| UI-DB-009 | FIXED | New Customer expense delete | `shared.js#removeExpense()` removed expenses from local `appData.expenses` and called `saveData()` without calling `DELETE /api/expenses/:id`, so a refresh could restore the supposedly deleted row from the database. | Made `removeExpense()` async, delete by loaded `expense.id` through `api.deleteExpense()`, reload `loadTodayData()`, await the helper in both transaction templates, added `backend/routes/expenses.js.md`, updated module docs, and extended `__tests__/expense.source-of-truth.present.test.js`. |
| UI-DB-010 | FIXED | Daily Summary Current Shop Status timing | `GET /api/staff/current-status` derived busy windows from `transactions.timestamp + duration`, while New Customer can submit canonical service start/end datetimes after prep/time selection. | Added `transactions.start_datetime` and `transactions.end_datetime`, persisted them in `POST /api/transactions`, made Current Shop Status prefer those fields with a legacy fallback, updated DSS-008 docs, and extended `tests/otdd/daily-summary-current-status.test.js` plus `__tests__/daily-summary.current-status.present.test.js`. |

## Inventory Snapshot

> Generated from source on 2026-07-14 with `/opt/homebrew/bin/node` against `web-app/*.html`, `web-app/*.ejs`, and `backend/routes/*.js`. This snapshot drives the audit order; update it when new pages/routes are discovered.

### Page Inventory

| Page | Primary widgets/functions discovered | API/fetch calls discovered | Audit status |
| --- | --- | --- | --- |
| `web-app/login.html` | login form, `showError`, `showSuccess`, `redirectToApp` | `api.checkSession`, `api.login` | Not audited |
| `web-app/index.html` | dashboard update, recent activity, payment breakdown | shared state only from loaded scripts in generated scan | Not audited |
| `web-app/index.ejs` | dashboard update, recent activity, payment breakdown | shared state only from loaded scripts in generated scan | Not audited |
| `web-app/staff.html` | Today Staff workflow delegated to `staff-page-controller.js` | controller-owned API calls | Fixed and verified: UI-DB-008 |
| `web-app/staff.ejs` | Today Staff workflow delegated to `staff-page-controller.js` | controller-owned API calls | Fixed and verified: UI-DB-008 |
| `web-app/transaction.html` | booking/walk-in mode, staff/service/duration/payment controls, submit, queue advance, expense controls, recent transactions | `api.getStaffRoster`, `api.getUpcomingBookings`, `api.createBooking`, `api.advanceQueue`, `api.setMasseuseBusy`, plus shared `submitTransaction`/`loadTodayData` | Fixed and verified: UI-DB-009 plus existing booking/walk-in tests; BKG-004 correction behavior remains governed separately |
| `web-app/transaction.ejs` | mirrored New Customer controls | same as `transaction.html` | Fixed and verified: UI-DB-009 plus existing booking/walk-in tests; BKG-004 correction behavior remains governed separately |
| `web-app/summary.html` | finance cards, status summary, transaction/expense drill-downs, end-day | shared state and report/status loaders | Fixed and verified: UI-DB-010 plus existing current-status/expense tests |
| `web-app/summary.ejs` | mirrored Daily Summary controls | same as `summary.html` | Fixed and verified: UI-DB-010 plus existing current-status/expense tests |
| `web-app/admin-staff.html` | payday tracking, add/edit/remove staff, record payment, payment history, outstanding fees | `api.getAdminStaff`, `api.updateAdminStaff`, `api.addStaff`, `api.removeStaff`, `api.getStaffPayments`, `api.recordPayment`, `api.getOutstandingFees` | Fixed and verified: UI-DB-002 |
| `web-app/admin-services.html` | service table, filters, add/edit/delete/toggle, current price info modal | `api.getServices({ includeInactive: true })`, `api.createService()`, `api.updateService()`, `api.deleteService()` | Fixed and verified: UI-DB-003 |
| `web-app/admin-payment-types.html` | payment type list, add/edit/delete modals | `api.getPaymentTypes()`, `api.createPaymentType()`, `api.updatePaymentType()`, `api.deletePaymentType()` | Fixed and verified: UI-DB-004 |
| `web-app/admin-reports.html` | report tabs, filters, CSV/print exports, explicitly future chart placeholder | `api.getReportStaff()`, `api.getReportServiceTypes()`, `api.getReportLocations()`, `api.getFinancialReport()` | Fixed and verified: UI-DB-005 |
| `web-app/admin-users.html` | users list, location filter, read-only account-management note | `api.getUsers()`, `api.getUsersByLocation(locationId)` | Fixed and verified: UI-DB-001 |

### Backend Route Inventory

| Route module | Endpoints discovered | Tables/data sources discovered by scan | Audit status |
| --- | --- | --- | --- |
| `backend/routes/auth.js` | `POST /login`, `POST /reset-rate-limit`, `GET /session`, `POST /logout`, `GET /sessions`, `POST /change-password`, `GET /user-info`, `GET /users`, `GET /users/location/:locationId` | in-memory user/session store | Not audited |
| `backend/routes/main.js` | `GET /staff-roster`, `GET /transaction`, `GET /summary` | static page files with CSRF token replacement | Not audited |
| `backend/routes/staff.js` | roster, current-status, Today Staff planning, queue, counts, performance | `staff`, `staff_roster`, `today_staff`, `today_staff_planning`, `today_staff_audit_log`, `transactions`, `bookings`, `business_days` | Fixed and verified for Today Staff page queue/planning/massage-count contracts: UI-DB-008; Current Shop Status canonical timing fixed and verified: UI-DB-010 |
| `backend/routes/transactions.js` | list, recent, create/correct, fix-edited-status, latest-for-correction, summary | `transactions`, `bookings`, `services`, `staff`, `booking_credits` | Verified for New Customer walk-in/recent/arrival contracts; BKG-004 remains open for correction-safe booking credit |
| `backend/routes/bookings.js` | upcoming, availability, get, create, status | `bookings`, `services`, `staff` | Verified for New Customer booking/upcoming contracts |
| `backend/routes/expenses.js` | list, create, today summary, delete | `expenses` | Fixed and verified: UI-DB-009 |
| `backend/routes/services.js` | list, payment methods, get, create, update, bulk update, delete, create payment method | `services`, `payment_methods` | Fixed and verified: UI-DB-003 |
| `backend/routes/payment-types.js` | list, create, update, delete, get | `payment_methods` | Fixed and verified: UI-DB-004 |
| `backend/routes/reports.js` | daily, weekly, monthly, today summary, financial, end-day, staff, service-types, locations | `transactions`, `expenses`, `services`, `daily_summaries`, `staff_roster` | Fixed and verified: UI-DB-005 |
| `backend/routes/admin.js` | admin pages, staff CRUD, payments, outstanding fees, performance, rankings | `staff`, `staff_payments`, `transactions` | Not audited |

### Existing Test Inventory Snapshot

- Permanent-looking focused tests already exist for Daily Summary current status, expense source-of-truth, PWTEST current user, staff roster add-staff, transaction booking, transaction walk-in refresh, booking integration, walk-in queue refresh, nav bilingual coverage, no-429 burst, booking service, and current-status OTDD.
- Admin E2E tests exist for staff add and payment type add/delete flows, but they sit under the broader Playwright tree whose default `npm test` script attempts `scp` from `massage:` before running Playwright. This audit must avoid that default script and run focused local commands instead.
- Many older files under `tests/debug` and `tests/diagnostics` are MRE/debug artifacts. Treat them as evidence candidates, not automatic regression coverage, unless a current steps/co-located doc names them as permanent guards.

## Baseline Verification Log

- [x] `git -C /Users/aidantam/projects/eiw-massage-shop-bookkeeping diff --check` passed.
- [x] `PATH=/opt/homebrew/bin:$PATH npm run lint` passed. The lint guard reported no raw fetch calls to `/api/` endpoints.
- [x] Focused Jest UI/contract baseline passed: `transaction.walkin-refresh`, `transaction.booking`, `daily-summary.current-status`, `staff.roster.add-staff`, `expense.source-of-truth`, `pwtest.current-user`, `nav.bilingual.present`, and `nav.bilingual.keys-coverage` passed 8 suites / 36 tests.
- [x] `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest tests/unit/booking-service.test.js --testEnvironment=node --runInBand` passed 1 suite / 4 tests.
- [x] `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/mocha tests/otdd/daily-summary-current-status.test.js --reporter dot` passed 3 tests with escalation because local listener binding is blocked in the sandbox.
- [x] `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest tests/integration/booking.reservation.integration.test.js tests/integration/walkin.queue-refresh.integration.test.js --testEnvironment=node --runInBand` passed 2 suites / 5 tests with escalation because local listener binding is blocked in the sandbox.
- [x] Final source-contract slice passed: 13 suites / 59 tests covering admin users, admin staff/payday, services, payment types, reports, auth/login, homepage, Today Staff, New Customer booking/walk-in/expense contracts, Daily Summary status, and nav key coverage.
- [x] Final inline script parse passed for admin users, admin staff, admin services, admin payment types, admin reports, home static/EJS, staff static/EJS, transaction static/EJS, and summary static/EJS.
- [x] Final `PATH=/opt/homebrew/bin:$PATH npm run lint` passed.
- [x] Final `git -C /Users/aidantam/projects/eiw-massage-shop-bookkeeping diff --check` passed.
- [x] Final escalated `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/mocha tests/otdd/daily-summary-current-status.test.js --reporter dot` passed 3 tests with canonical `start_datetime` / `end_datetime` assertions.
- [x] Inline script parse passed for `login.html`, `index.html`, `index.ejs`, `staff.html`, `staff.ejs`, `transaction.html`, `transaction.ejs`, `summary.html`, `summary.ejs`, `admin-staff.html`, `admin-services.html`, `admin-payment-types.html`, `admin-reports.html`, and `admin-users.html`.
- [x] Homepage revenue-card baseline passed: `homepage.revenue.absent` and `revenue.card.regression` passed 3 suites / 11 tests.
- [!] Direct invocation of `tests/integration/staff.spec.js` and `tests/integration/services.spec.js` failed with `AggregateError` both inside and outside the sandbox because those files expect a running server at `localhost:${PORT || 3000}`. Their co-located docs say they are orchestrated by `tests/run_integration_tests.js`; do not treat direct-file invocation as endpoint evidence.

## Active Execution Checklist

- [x] Establish strict-fallback git/worktree posture.
- [x] Create governed whole-app audit step in `current-steps.md`.
- [x] Create durable audit checklist.
- [x] Enumerate app pages.
- [x] Enumerate backend route modules.
- [x] Capture initial page/function/API inventory.
- [x] Capture baseline verification results.
- [x] Audit and fix Admin Users page.
- [x] Audit Manager Payday Tracking page.
- [x] Audit Manager Services and Pricing page.
- [x] Audit Manager Payment Types page.
- [x] Audit Manager Reports page.
- [x] Audit Login/Auth page.
- [x] Audit Home Dashboard page.
- [x] Audit Today Staff page.
- [x] Audit New Customer page.
- [x] Audit Daily Summary page.
- [x] Run final whole-pass verification.
