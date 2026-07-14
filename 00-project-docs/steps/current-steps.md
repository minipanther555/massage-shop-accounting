# Current Project Steps

1.  **[Infra] Stabilize the Docker-based Local Development Environment.**
    *   **Status**: ✅ `completed`
    *   **Priority**: CRITICAL (BLOCKER)
    *   **Required**: The local development server was consistently crashing on startup when connected to a production-like database.
    *   **Notes**: This multi-stage debugging effort involved:
        *   Fixing a `TypeError` in `server.js` related to incorrect `rateLimiter` middleware configuration.
        *   Discovering the root cause was an unhandled "duplicate column name" error during database initialization.
        *   Refactoring the `addMissingColumns` function in `database.js` to be fully idempotent, which resolved the startup crash.
        *   Troubleshooting multiple environment issues (`docker daemon` not running) and process management flows (`nohup`, background processes).

2.  **[Test] Scaffold E2E Test for "Edit Transaction" Workflow and Discover Critical Bug.**
    *   **Status**: ✅ `completed`
    *   **Priority**: High
    *   **Required**: Create a new E2E test to validate the transaction editing functionality.
    *   **Notes**: Used Playwright Codegen to create `tests/e2e/transaction-edit-flow_2025-08-26.spec.js`. This process immediately uncovered a **new critical bug**: editing a transaction creates a duplicate entry instead of updating the original. This is now the highest priority bug to fix. Co-located documentation was created for this test, logging the bug.

3.  **[Bugfix] Investigate and Fix "Edit Transaction Creates Duplicate" Bug.**
    *   **Status**: ✅ `completed`
    *   **Priority**: CRITICAL (BLOCKER)
    *   **Required**: Analyze the backend route responsible for updating transactions (likely `PUT /api/transactions/:id`) and correct the logic to perform an `UPDATE` rather than an `INSERT`.
    *   **Notes**: This evolved into a comprehensive debugging session that revealed multiple issues:
        *   **Root Cause 1**: The `/recent` API endpoint was filtering out EDITED transactions with `WHERE status IN ('ACTIVE', 'CORRECTED')`, preventing them from reaching the frontend.
        *   **Root Cause 2**: The transaction editing logic was working correctly in the backend, but the frontend couldn't display the styling because EDITED transactions weren't being returned by the API.
        *   **Resolution**: Modified the SQL query in `GET /api/transactions/recent` from `WHERE status IN ('ACTIVE', 'CORRECTED')` to `WHERE status = 'ACTIVE' OR status = 'CORRECTED' OR status LIKE 'EDITED%'` to include EDITED transactions.
        *   **Verification**: Created comprehensive test suite (`tests/integration/transaction-status-integration.test.js`) and visual verification test (`tests/diagnostics/verify-styling-works.spec.js`) to confirm the fix works end-to-end.

4.  **[Test] Create E2E Tests for Admin Workflows and Debug Environment.**
    *   **Status**: ✅ `completed`
    *   **Priority**: High
    *   **Required**: Create E2E tests for adding a new staff member and a new payment type.
    *   **Notes**: This task evolved into a deep debugging session.
        *   **Discovered Bug 1: CSRF Race Condition.** Uncovered a non-deterministic race condition during server startup that caused intermittent "Invalid CSRF Token" errors in the interactive `codegen` browser. The root cause was the server accepting requests before the CSRF middleware was fully initialized.
        *   **Resolution 1:** Implemented a dedicated `testing` environment (`docker/.env.testing`) that correctly sets `NODE_ENV=testing`, disabling CSRF protection for reliable test generation.
        *   **Discovered Bug 2: Modal UI Failure.** The "Add New Payment Type" form was not appearing in a modal. The root cause was missing modal CSS, which was defined locally in the staff admin page but not globally.
        *   **Resolution 2:** Migrated the modal CSS to the shared `web-app/styles.css` file and removed the redundant local styles.
        *   **Discovered Bug 3: Test Data Pollution.** The new tests were not cleaning up the data they created.
        *   **Resolution 3:** Implemented robust teardown logic in both new E2E tests (`staff-add-flow.spec.js`, `payment-type-add-flow.spec.js`) to ensure they are atomic and idempotent.

5.  **[Bugfix] Investigate and Fix Payment Type Deletion UI/Logic.**
    *   **Status**: 🔵 `next_up`
    *   **Priority**: High
    *   **Required**: The UI only allows "deactivation" and not permanent deletion, which is confusing and leaves inactive test data visible. The next step is to investigate the backend `DELETE` logic and the frontend rendering logic in `admin-payment-types.html` to implement a proper deletion or filtering mechanism.

6.  **[Bugfix] Fix Transaction Display Issues on Daily Summary Page.**
    *   **Status**: ⚪ `pending`
    *   **Priority**: High
    *   **Required**: While the EDITED transaction styling is now working, there are additional issues discovered:
        *   **Issue 1**: Transactions are displayed in reverse chronological order (newest first), making it difficult to find older transactions
        *   **Issue 2**: The page shows transactions from multiple days instead of filtering to show only today's transactions
        *   **Impact**: Users have to scroll through many transactions to find the EDITED one, and the chronological ordering is confusing
    *   **Next Steps**: 
        *   Fix the chronological ordering to show transactions in proper time sequence
        *   Implement proper date filtering to show only today's transactions
        *   Apply the same fixes to both the daily summary page and the new transaction page

7.  **[Next Phase] Address remaining linting issues and prepare for production deployment.**
    *   **Status**: ⚪ `pending`
    *   **Priority**: Medium
    *   **Required**: Address remaining non-critical linting errors in core application files and prepare the system for production deployment.

8.  **[UX] Staff Roster Daily Workflow Rework.**
    *   **Status**: ✅ `completed`
    *   **Priority**: High
    *   **Required**: Make the first daily workflow dead simple for Thai staff: select an existing staff member, add them to today's list, reorder staff, remove mistakes, and add a new hire only when the name is missing.
    *   **Dependencies**: Existing staff roster APIs (`GET /api/staff/roster`, `PUT /api/staff/roster/:position`, `DELETE /api/staff/roster`, `POST /api/admin/staff`) and the current `staff-page-controller.js` render/event contract.
    *   **Expected Output/Deliverable**: Staff roster page with compact navigation, dominant Thai dropdown/add button, secondary Add New Staff action, Thai row controls, larger names/counts, no current-page self-link, and browser verification at the active 599px viewport.
    *   **Technical Considerations**: Keep `staff.html` and `staff.ejs` mirrored because both static and rendered variants exist. Preserve DOM IDs consumed by `staff-page-controller.js`. Use page-scoped `.staff-*` CSS to avoid changing legacy styling on unrelated pages.
    *   **Potential Challenges and Mitigations**: The shared bilingual nav tests originally treated all `.btn` elements as nav buttons; mitigated by narrowing skips for staff workflow controls while preserving nav coverage. The controller re-rendered the dropdown placeholder; mitigated by updating `renderDropdown()` to Thai.
    *   **Verification**: `node --check web-app/controllers/staff-page-controller.js`, `git diff --check`, focused Jest nav/staff tests, and in-app browser reload at `http://localhost:3000/api/main/staff-roster`.

9.  **[UX] New Customer / Transaction Page Rework.**
    *   **Status**: ✅ `completed`
    *   **Priority**: High
    *   **Required**: Apply the same user-centered UI cleanup to the new transaction page, now labeled as New Customer for staff. Simplify the first screen, prioritize Thai labels and obvious task flow, and reduce English prominence.
    *   **Dependencies**: `web-app/transaction.html`, `web-app/transaction.ejs`, `web-app/transaction.html.md`, `web-app/shared.js`, service/payment/staff dropdown loading, and existing transaction submission/edit correction logic.
    *   **Expected Output/Deliverable**: A Thai-first customer intake page where selecting staff, service, duration, payment, and submitting the transaction are visually obvious and mobile/iPad-friendly. The page now auto-selects the next Today Staff queue member and replaces the visible long service/duration dropdown path with large category, combo, and duration buttons.
    *   **Technical Considerations**: Do not break cascading service/location/duration logic or `checkForEdit()` correction mode. Preserve backend payload fields expected by `submitTransaction()` and `api.createTransaction()`. Keep `#service` and `#duration` as hidden native select contract controls while the button layer writes exact legacy values into them.
    *   **Potential Challenges and Mitigations**: The transaction page contains a large inline script; changes should be staged with browser checks after each UI/logic move. Use the staff roster page as the pattern for Thai-only primary controls plus small English helper text. The service button MVP groups actual location-filtered menu names at runtime so Thai, Foot, Oil, Shoulder/Back, Aroma, Coconut, Scrub, and Combo appear only when backed by real services. Manager feedback later prioritized Thai/Foot/Oil/Shoulder first and made Combo Thai-first with the common `Foot + back, neck & shoulder` choice first.
    *   **Verification**: Inline transaction scripts parse successfully in both static and EJS templates. `git diff --check` passed. Focused structural FSM guards passed for staff auto-select and service/duration button surfaces. In-app browser verification at `http://127.0.0.1:3000/api/main/transaction` confirmed `May เมย์ (คิวถัดไป)` auto-selection from Today Staff, default `In-Shop` location, generated service category buttons from the actual service list, hidden select contract preservation, Aroma → 60 minute button flow updating price/fee, and Combo → `Foot + Thai Massage` flow rendering only valid combo durations. Follow-up static verification confirmed category reorder, Combo priority sorting, and Thai-first Combo labels; the final browser re-check for the last Combo-label tweak hit an in-app browser attach timeout, so that specific visual confirmation remains static/code-verified rather than browser-verified.

10. **[Feature] Booking Reservations and Requested-Staff Credit.**
    *   **Status**: 🟡 BKG-001 implemented, final in-app browser click-through pending; BKG-002 superseded by DSS; BKG-003 blocked on manager rule; BKG-004 open from checkpoint review
    *   **Priority**: High
    *   **Required**: Save future reservations without payment, optionally record a requested masseuse, and convert a reservation to a financial transaction when the customer arrives.
    *   **Dependencies**: Booking routes, transaction creation/correction, additive SQLite schema, Today Staff base-commission helper, and mirrored New Customer templates.
    *   **Expected Output/Deliverable**: Thai-first walk-in/booking modes, optional requested staff, future schedule, upcoming-arrival action, 15-minute conflict rule, one-time arrival conversion, and a separate `฿50` credit excluded from next-day ranking.
    *   **Technical Considerations**: Reservation details are saved before payment; the transaction and eligible credit are created atomically only on arrival. Generic bookings defer staff assignment to the queue at arrival. Automatic post-booking queue reordering is prohibited until the manager defines a deterministic rule.
    *   **Potential Challenges and Mitigations**: Unique booking links and status guards prevent duplicate conversion; booking credit has a separate ledger and unique active constraint; the future shop-status page is tracked as BKG-002.
    *   **Verification**: Automated and first-viewport receipts pass; see `booking-reservations-and-requested-staff-credit-steps.md`. The exact booking-create/arrival browser click-through remains open because the in-app webview would not attach. Checkpoint review added BKG-004 for correction-safe booking credit and server-authoritative booking-buffer hardening.

11. **[Feature] Daily Summary Current Shop Status.**
    *   **Status**: ✅ implemented and verified; DSS-008 implemented and verified during whole-app UI/database audit
    *   **Priority**: High
    *   **Required**: Add the missing operational status answers to the existing Daily Summary page: who is busy, how long they are busy for, each visible Today Staff member's massage count today, next booking time, and usable time before the 15-minute booking buffer.
    *   **Dependencies**: `web-app/summary.html`, `web-app/summary.ejs`, `web-app/api.js`, `web-app/shared.js`, `backend/routes/staff.js`, booking buffer helpers, current Today Staff queue/counts, and existing Daily Summary financial sections.
    *   **Expected Output/Deliverable**: Daily Summary retains all current financial/transaction/expense sections and adds a Thai-first Current Shop Status section backed by one server-authoritative status endpoint.
    *   **Technical Considerations**: Do not create a separate shop-status page for this pass. Keep `summary.html` and `summary.ejs` mirrored. Prefer deriving busy status from current active transaction windows and booking constraints instead of duplicating ledger state.
    *   **Potential Challenges and Mitigations**: Current Today Staff roster returns massage counts but `busy_until` is projected as `NULL`; mitigate with a dedicated status endpoint that combines transactions, Today Staff, and bookings. The Daily Summary UI is already dirty with operator edits; read current file state before implementation and preserve unrelated visual changes.
    *   **Verification**: Backend status contract tests, Daily Summary DOM/structure tests, inline script parsing for both summary templates, `git diff --check`, and browser verification at the active staff-facing viewport. DSS-008 now persists `transactions.start_datetime` / `transactions.end_datetime` and Current Shop Status prefers those canonical fields with a legacy fallback.

12. **[Security] Dependency Audit Remediation.**
    *   **Status**: ⚪ `pending`
    *   **Priority**: High
    *   **Required**: `npm audit --omit=dev --audit-level=high` currently reports 27 vulnerabilities, including 13 high-severity advisories across axios, express/path-to-regexp, form-data, jws, minimatch, playwright, tar, tar-fs, and transitive sqlite3 build tooling.
    *   **Dependencies**: `package.json`, `package-lock.json`, application smoke tests, booking/status/transaction regression tests.
    *   **Expected Output/Deliverable**: Dependency upgrades applied in a separate atomic security step with lockfile updates and regression verification.
    *   **Technical Considerations**: Some fixes require breaking upgrades such as sqlite3 6.x and older csurf dependency changes. Do not apply `npm audit fix --force` inside an unrelated UI/booking checkpoint.
    *   **Potential Challenges and Mitigations**: Upgrade one dependency cluster at a time, run focused backend/browser smoke after each cluster, and keep rollback simple by committing this as a separate change.
    *   **Verification**: `npm audit --omit=dev --audit-level=high` exits cleanly or all remaining advisories are explicitly accepted with documented rationale.

13. **[Audit] Whole-App UI to Database Contract Verification.**
    *   **Status**: ✅ audit pass complete with governed blockers
    *   **Priority**: CRITICAL
    *   **Required**: Enumerate every app page and verify each visible button, dropdown, list, card, modal, report, and form talks to the correct API/database contract. The trigger is the New Customer follow-up where obvious UI behavior was stale or not wired to the active Today Staff/recent transaction source, raising risk that other pages contain fake, stale, local-only, or partially implemented widgets.
    *   **Dependencies**: `web-app/*.html`, `web-app/*.ejs`, `web-app/api.js`, `web-app/shared.js`, `web-app/controllers/staff-page-controller.js`, all backend route modules, `backend/models/database.js`, existing focused tests, and the local preview browser workflow.
    *   **Expected Output/Deliverable**: A completed checklist in `00-project-docs/steps/whole-app-ui-db-contract-audit.md` covering reception pages, manager/admin pages, shared widgets, backend routes, database tables, evidence-backed findings, regression tests for confirmed failures, and fixes for any UI/database contract breaks found in the pass.
    *   **Technical Considerations**: Audit before broad rewrites. For each widget identify frontend handler, API method or direct fetch, backend route, SQL/table authority, refresh path after mutation, escaping behavior, and test/browser evidence. Add RED tests before fixing confirmed behavioral breaks when practical. Preserve mirrored `.html`/`.ejs` templates and co-located docs.
    *   **Potential Challenges and Mitigations**: The page count is broad and includes manager-only payday, services, payment types, reports, and users. Mitigate by using the audit checklist as the execution ledger and marking each widget as not audited, issue found, verified, or blocked. If product behavior is missing rather than broken, record it as blocked/needs decision instead of inventing semantics.
    *   **Verification**: Page/widget inventory complete; existing tests baseline recorded; focused tests added for confirmed contract failures; detailed audit ledger complete in `00-project-docs/steps/whole-app-ui-db-contract-audit.md`; 13 source-contract suites / 59 tests passed; booking/walk-in integration and Daily Summary OTDD passed with local listener escalation; inline scripts parsed; `npm run lint` and `git diff --check` passed. Governed blockers remain: BKG-004 correction-safe requested-staff booking credit and product/UI scope for manager bulk price update controls.
