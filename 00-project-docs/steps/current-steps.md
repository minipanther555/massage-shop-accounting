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
    *   **Status**: 🟡 BKG-001 implemented, final in-app browser click-through pending; BKG-002 superseded by DSS; BKG-003 done; BKG-004 open from checkpoint review; TCR-001 separately governs normal walk-in correction replacement
    *   **Priority**: High
    *   **Required**: Save future reservations without payment, optionally record a requested masseuse, and convert a reservation to a financial transaction when the customer arrives.
    *   **Dependencies**: Booking routes, transaction creation/correction, additive SQLite schema, Today Staff base-commission helper, and mirrored New Customer templates.
    *   **Expected Output/Deliverable**: Thai-first walk-in/booking modes, optional requested staff, future schedule, upcoming-arrival action, 15-minute conflict rule, one-time arrival conversion, and a separate `฿50` credit excluded from next-day ranking.
    *   **Technical Considerations**: Reservation details are saved before payment; the transaction and eligible credit are created atomically only on arrival. Generic bookings defer staff assignment to the queue at arrival. Automatic post-booking queue reordering is prohibited until the manager defines a deterministic rule.
    *   **Potential Challenges and Mitigations**: Unique booking links and status guards prevent duplicate conversion; booking credit has a separate ledger and unique active constraint; the future shop-status page is tracked as BKG-002.
    *   **Verification**: Automated and first-viewport receipts pass; see `booking-reservations-and-requested-staff-credit-steps.md`. The exact booking-create/arrival browser click-through remains open because the in-app webview would not attach. Checkpoint review added BKG-004 for correction-safe booking credit and server-authoritative booking-buffer hardening. `transaction-correction-operational-reversal-steps.md` separately governs normal walk-in correction selection, queue restoration, and no-credit replacement behavior.

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

14. **[UX] Home Dashboard Interactive Drilldowns.**
    *   **Status**: ✅ DONE (2026-07-14)
    *   **Priority**: High
    *   **Required**: Browser review found the Home dashboard cards for Today's Revenue, Active Staff, and Today's Expenses are static, too tall, and leave unused horizontal space. Make the whole page more interactive by turning those three cards into compact clickable drilldowns that expose today's revenue/payment/transaction details, active staff details, and today's expense details.
    *   **Dependencies**: `web-app/index.html`, `web-app/index.ejs`, `web-app/index.md`, `web-app/styles.css`, `web-app/styles.md`, `web-app/shared.js`, `web-app/api.js`, existing homepage contract tests, and the local preview browser workflow.
    *   **Expected Output/Deliverable**: Home page cards use a shorter horizontal compact layout, are keyboard/click accessible, and reveal inline detail panels sourced from already loaded API state without changing backend contracts.
    *   **Technical Considerations**: Keep `index.html` and `index.ejs` mirrored. Reuse the existing Daily Summary compact-card pattern where practical. Preserve safe escaping for dynamic transaction, payment, staff, and expense labels. Do not add schema or backend behavior.
    *   **Potential Challenges and Mitigations**: The homepage is a shared entry point and has older global CSS plus newer compact summary overrides; mitigate by adding Home-scoped classes instead of broad dashboard changes. Empty local preview data must render useful empty states instead of blank panels.
    *   **Verification**: RED homepage interaction contract failed before implementation; GREEN `__tests__/homepage.contract.present.test.js` passed 9/9 after implementation; inline scripts parsed for `web-app/index.html` and `web-app/index.ejs`; in-app browser verification at 667x998 showed the three Home cards in one row at 206px wide by 100px tall and each card opened one full-width detail panel with `aria-expanded=true`; `npm run lint` passed; `npm audit --omit=dev --audit-level=high` still reports the governed pre-existing dependency backlog of 27 vulnerabilities / 13 high; `git diff --check` passed.

15. **[Feature] Manual Staff Walk-In and Visible Booking Credit.**
    *   **Status**: ✅ `done / clarified` - BKG-005 updated 2026-07-23
    *   **Priority**: High
    *   **Required**: A customer already present can use a manually selected non-next staff member as a normal walk-in with no booking row or credit; explicit reservations may start now; actual credit-bearing booking arrivals visibly show a compact annotation.
    *   **Dependencies**: Booking/transaction routes, active `booking_credits`, transaction read APIs, `shared.js`, mirrored New Customer/Daily Summary/Home templates, and manager financial reports.
    *   **Expected Output/Deliverable**: Manual non-next walk-in isolation, now-or-later explicit reservation scheduling, `booking_credit_amount` on transaction reads, compact transaction badges for actual booking credits, and separate base-credit-total staff-pay reporting.
    *   **Technical Considerations**: No schema change. Preserve credit isolation from Today Staff previous-day ranking and preserve manual queue ordering. Do not infer booking intent from non-next staff selection; use explicit Booking mode and indexed transaction-credit joins.
    *   **Potential Challenges and Mitigations**: Prevent accidental booking rows by contract-testing `requestedStaffBooking: false` in normal walk-in submission and by ignoring stale immediate-booking payloads on the server; prevent the old oversized UI from returning by contract-testing compact list-only markup.
    *   **Verification**: AC-010 through AC-013 passed through focused/integration tests, parsed mirrored scripts, indexed SQLite plan checks, and browser canaries; see the BKG-005 completion notes.

16. **[Bugfix/UX] Home Navigation Consolidation and Live Recent Activity.**
    *   **Status**: ✅ DONE (2026-07-14) - HOME-001
    *   **Priority**: High; operator-prioritized ahead of resuming BKG-005
    *   **Required**: Move the manager-only administration navigation into the Home page's top navigation group, and make Recent Activity reliably show newly entered massages from the authoritative API-backed current Bangkok business day instead of stale, fallback, or mismatched calendar-day state.
    *   **Dependencies**: `web-app/index.html`, `web-app/index.ejs`, `web-app/index.md`, `web-app/styles.css`, `web-app/styles.md`, `web-app/shared.js`, `web-app/shared.js.md`, `web-app/api.js`, `web-app/api.js.md`, `backend/routes/transactions.js`, `backend/routes/transactions.js.md`, `backend/utils/business-day.js`, the homepage contract/regression tests, and the documented local preview browser workflow.
    *   **Expected Output/Deliverable**: Manager users see all Home navigation actions together at the top while non-manager users do not gain admin links; a newly created massage appears in Home Recent Activity on initial load and the next refresh using one server-authoritative day contract; loading, error, empty, and success states remain explicit; both Home templates remain behaviorally mirrored.
    *   **Technical Considerations**: Diagnose before changing the date contract. Preserve newest-first `timestamp DESC, id DESC` ordering, safe escaping, authentication/manager visibility, the three interactive drilldown cards, and the existing no-schema-change boundary. Keep automatic Today Staff queue movement out of this step because its deterministic product rule remains unresolved.
    *   **Potential Challenges and Mitigations**: The browser's UTC calendar date can diverge from the Bangkok business day and `loadData()` can fall back to local storage after an API failure; reproduce the first divergence with deterministic time/fixtures and a real browser smoke, add a RED regression before implementation, and surface an explicit error instead of presenting stale state as live.
    *   **Validation**: A deterministic regression test fails before the fix and passes after it; manager admin links render inside the top navigation and remain absent for non-manager state; a transaction at the Bangkok/UTC boundary is returned and rendered in Recent Activity newest-first; loading, error, empty, and success states are covered; `index.html` and `index.ejs` scripts remain mirrored and parse; focused integration/browser smoke, lint, dependency audit, and `git diff --check` pass with no new high-severity finding.
    *   **Prior Blocker Evidence (resolved 2026-07-14)**: Real-browser tracing reproduced the missing newest massage and isolated mixed timestamp formats at `GET /api/transactions/recent`. BKG-005 then completed the route correction with `ORDER BY datetime(t.timestamp) DESC, t.id DESC`; HOME-001 resumed after that workstream's ledger and verification were complete.
    *   **Completion Notes**: RED homepage contract produced 4 expected failures for separated manager navigation, absent live/error state, and redundant `Date`/string filtering. GREEN focused receipts passed 2 suites / 19 tests; the strengthened real Express/SQLite mixed-offset regression passed 3/3. Both Home inline scripts parsed and the mirrored templates matched byte-for-byte. In-app browser smoke at 630x998 showed seven top-grid manager navigation links, `ข้อมูลล่าสุด / Live data`, five populated Recent Activity rows, and eight populated Revenue-detail transaction rows. Follow-up debug evidence on 2026-07-15 found future `BOOKED` rows correctly had no transaction or credit while Home hardcoded `amount: 50`; both templates now render `ยังไม่ชำระ`, guarded by the homepage contract regression. Lint and `git diff --check` passed. `npm audit --omit=dev --audit-level=high` reported the unchanged governed backlog of 27 vulnerabilities / 13 high; no dependency files changed. No production access, schema change, or DB mutation was performed.

17. **[Feature] Universal Booking Commission and Cross-Page Staff Earnings Detail.**
    *   **Status**: 🟡 `in_progress` - BKG-006 partial (2026-07-14)
    *   **Goal**: Every Booking-mode arrival pays one additional ฿50 booking commission to the requested or serving masseuse; expose base commission, booking commission, and combined payable totals in Booking preview, transaction activity, staff drilldowns, reports, and Payday Tracking while excluding the extra ฿50 from next-day Today Staff ranking.
    *   **Dependencies**: BKG-005 booking-credit ledger, transaction/report/staff APIs, shared staff-pay mapping, mirrored Home/Daily Summary/Daily Staff/Reports/Payday/New Customer templates.
    *   **Expected Output/Deliverable**: Governed universal booking-credit contract, safe Booking preview (display total without changing base ledger payload), clickable staff earnings details across relevant pages, and regression/browser coverage for ranking isolation.
    *   **Technical Considerations**: Queue-assigned bookings resolve the credit recipient at arrival; ordinary walk-ins remain credit-free; Today Staff uses only base `masseuse_fee`.
    *   **Potential Challenges and Mitigations**: Preserve BKG-005 correction/transaction joins, keep `booking_credits` as the payable source of truth, and add tests before changing shared renderers.
    *   **Verification**: Partial AC-014/AC-015/AC-016 evidence: requested and queue-assigned booking arrivals each produce one credit, Booking preview displays base + ฿50 while submits base-only, Home Recent Activity includes expandable activity rows plus Show more, payment methods expand to matching transactions, Active Staff availability uses the same live status rows as its detail, Payday Tracking summary cards open inline calculation panels, Payday staff names open inline current-week massage tables with base fee / booking credit / combined total / total row, Financial Reports summary cards and report rows open inline source mini tables from filtered transaction/expense detail rows, and Today Staff rows have a separate Info toggle that opens inline staff detail without replacing drag/drop. Homepage contract passes 23/23; Payday contract passes 8/8; Financial Reports contract passes 8/8; Today Staff controller contract passes 6/6; in-app browser smokes at `localhost:3003/api/admin/staff-page`, `localhost:3003/api/admin/reports-page`, and `localhost:3003/api/main/staff-roster` verified the relevant inline panels; mirrored scripts parse, and `git diff --check` passes. Remaining AC-016 cross-page staff earnings detail surfaces, broader browser smoke, and final lint/security gates are still open. Follow-up Home status wording now explains massage end time, 15-minute buffer, and next free time without exposing `booking_buffer`; future booking rows now show unpaid status instead of false `+฿50` revenue.

18. **[Bugfix] Booking-aware Walk-in availability and persisted Today Staff drag/drop.**
    *   **Status**: ✅ DONE (2026-07-15) - QUEUE-002 / STAFF-REORDER-001
    *   **Goal**: Prevent a masseuse with an active or booking-constrained window from being auto-selected or selectable for a Walk-in, and make drag/drop roster moves persist through the governed Today Staff reorder endpoint.
    *   **Dependencies**: `backend/routes/staff.js`, `web-app/shared.js`, mirrored New Customer templates, `web-app/controllers/staff-page-controller.js`, `/api/staff/today/reorder`.
    *   **Expected Output/Deliverable**: Current-status reads requested bookings through their scheduled end; Walk-in options disable non-available staff while Booking mode permits intentional selection; native drag/drop calls the same persisted reorder path as arrow controls.
    *   **Validation**: Current-status OTDD passes 4/4; transaction booking contract passes 9/9; Today Staff controller contract passes 5/5; both mirrored transaction scripts parse; live port-3003 headless smoke moved a roster row and observed the persisted reordered response; `git diff --check` passes.
    *   **Completion Notes**: The original status query only selected bookings with `scheduled_start >= now`, dropping bookings already in progress. It now uses `scheduled_end > now` for current-day booking constraints and ignores previous-day bookings after reset. The prior roster UI only moved DOM nodes; controller row handlers now persist drag/drop via `reorderVisibleRoster()` and the Today Staff endpoint. A follow-up trace found that New Customer refreshed the roster but not `appData.currentShopStatus` before rebuilding its next-staff dropdown, so it could appear correct only after a full reload; both mirrored templates now refresh status and roster together, with an 8/8 regression contract. The manager clarified that walk-in priority is workload count first and original Today Staff order for ties; `advance-queue` now retains the original order while status exposes `walk_in_priority`. Previous-day `BOOKED` rows become `NO_SHOW` during stale-day reset, and six stale local test rows were deleted after operator approval. No schema migration or production DB mutation was performed.

19. **[Feature] Service Pricing, Promotions, and Time-Window Discounts.**
    *   **Status**: 🟡 PARTIAL - branch-43 in-shop time-window promotion and manager configuration implemented; catalog price/commission updates and receptionist-only loyalty/return rules remain open (2026-07-21)
    *   **Required**: Govern the supplied service price/commission table plus three promotion families: ten-stamp free massage, 10% return-within-seven-days discount, and branch-configurable reduced pricing windows for selected massage types.
    *   **Dependencies**: `00-project-docs/feature-specifications/service-pricing-promotions-and-discounts.md`, `00-project-docs/steps/service-pricing-promotions-and-discounts-steps.md`, service catalog/admin services, New Customer service/duration UI, transaction creation, reports, Payday Tracking, and booking-credit staff-pay separation.
    *   **Expected Output/Deliverable**: A clarified price/commission table and promotion contract, followed by auditable transaction/report support that separates base price, discount, final payment, staff commission, booking credit, and total staff pay. The first delivered slice is Top Thai 43's in-shop automatic promotion from 10:00 through midnight, with manager configuration on Services & Pricing and a fifteen-minute reception override after any configured end.
    *   **Technical Considerations**: Do not infer service-name mapping, eligible loyalty services, customer identity rules, or promotion stacking. Use Bangkok/server time for low-business-hour pricing. The branch-43 promotion is stored per branch and only maps the provided in-shop service/duration rows; it does not change masseuse commission. Preserve active service catalog visibility so duration buttons do not disappear from New Customer.
    *   **Potential Challenges and Mitigations**: Free-text customer contact may not be enough for loyalty/return eligibility; clarify customer identifier first. Multiple promotions may overlap; define priority/stacking before code. Price updates can accidentally deactivate services; use service-catalog checks before and after changes.
    *   **Validation**: Unit tests cover Bangkok boundaries and missing configuration; integration tests prove final payment/audit storage while normal commission remains earned, including a Home Service non-application regression. `testing3414` live browser smoke verified Top Thai 43 manager Services & Pricing shows enabled `10:00`-`00:00`, 15-minute grace, and the save-success state. Top Thai 49's `10:00`-`18:00` default remains source/test verified pending branch database provisioning.

20. **[Bugfix/UX] Daily Summary Current Status Summary Priority Wording.**
    *   **Status**: ⚪ `open` - DSS-009 created 2026-07-23
    *   **Priority**: High
    *   **Required**: The compact `สามคนถัดไป` strip on Current Shop Status can appear to disagree with the New Customer next-masseuse dropdown. The dropdown appears to use the correct free/priority staff; the summary strip needs CFEP/debug before changing behavior.
    *   **Dependencies**: `00-project-docs/steps/daily-summary-current-shop-status-steps.md`, `00-project-docs/feature-specifications/daily-summary-current-shop-status.md`, `web-app/summary.html`, `web-app/summary.html.md`, `web-app/transaction.html`, `backend/routes/staff.js`, and the New Customer walk-in priority contract.
    *   **Expected Output/Deliverable**: Either the summary strip uses the same walk-in assignment priority as New Customer, or the Thai label/copy is changed so reception understands it is only showing currently free staff, not queue order.
    *   **Technical Considerations**: Daily Summary groups/sorts status rows for operational scanning. New Customer selects by `walk_in_priority`. Do not assume those two surfaces should have identical ordering until the product intent is confirmed.
    *   **Potential Challenges and Mitigations**: The label sounds like "next in queue" even when the implementation is "first three available rows." Add a regression with a payload where status sort and walk-in priority differ.
    *   **Validation**: DOM/API test and browser check prove the selected Daily Summary div no longer contradicts the New Customer dropdown.

21. **[Feature] Paid Time Extension / Add-On Service.**
    *   **Status**: 🟡 Phase 0 ✅ DONE (2026-07-23) - data model confirmed as linked transaction rows; steps file re-authored in canonical phase/gate format with 23 steps across 9 phases; next runnable step is `PTE-DB-001` (additive schema columns, `/db-ops-regular` Mode B)
    *   **Priority**: High
    *   **Required**: Customers may add time or a second service after already paying and starting a massage. The system must charge only the additional amount owed while preserving the original paid transaction.
    *   **Dependencies**: `00-project-docs/feature-specifications/paid-time-extension.md`, `00-project-docs/steps/paid-time-extension-steps.md`, New Customer transaction flow, correction/reversal flow, service catalog pricing, Current Shop Status, reports, and Payday Tracking.
    *   **Expected Output/Deliverable**: A separate add-time/add-service action that supports same-service duration upgrades and different-service add-ons, calculates amount due server-side, updates staff occupied time, and reports add-on payment/commission without double-counting.
    *   **Technical Considerations**: Do not silently edit the original paid transaction. Decide during CFEP whether to model add-ons as linked transaction rows or a dedicated add-on table. Server must calculate price/commission from trusted catalog data.
    *   **Potential Challenges and Mitigations**: Add-time touches money, staff pay, and availability. Start with RED tests for the two operator examples: 60-to-90 same-service upgrade and 90-minute massage plus 60-minute foot massage.
    *   **Validation**: Governed PTE steps must pass focused integration, UI contract, report/status regression, browser smoke, lint, and security review before deployment.

22. **[Risk/Data] End-Day Deletion Hardening.**
    *   **Status**: ⚪ `open / deferred` - logged 2026-07-23 during PTE-001, deliberately out of scope for Paid Time Extension
    *   **Priority**: Medium; raise if end-day is used regularly in production
    *   **Required**: `POST /api/reports/end-day` (`backend/routes/reports.js:444-490`) summarises the day into `daily_summaries` and then hard-deletes the day's rows with `DELETE FROM transactions WHERE date = ?` and `DELETE FROM expenses WHERE date = ?`. Three latent problems were found while scoping add-time, none of them caused by it:
        *   The summary counts only `status = 'ACTIVE'` rows, but the delete has **no status filter**, so `CORRECTED` and `EDITED%` rows are destroyed without ever being summarised.
        *   The date key is `new Date().toISOString().split('T')[0]`, a **UTC calendar date**, while the rest of the app keys on the Bangkok business day. Running end-day after 00:00 Bangkok targets the previous UTC day.
        *   Deletion removes the audit trail that correction, booking-credit, and add-on linkage all depend on. `corrected_from_id` and `parent_transaction_id` become dangling after a close.
    *   **Dependencies**: `backend/routes/reports.js`, `backend/utils/business-day.js`, `daily_summaries`, `web-app/shared.js` `endDay()`, mirrored Daily Summary templates.
    *   **Expected Output/Deliverable**: End-day archives rather than deletes, filters consistently between what it summarises and what it removes, and keys on the Bangkok business day.
    *   **Technical Considerations**: PTE-006 narrowly protects add-on and parent rows so Paid Time Extension can ship; it does not fix the underlying behaviour. The proper non-destructive rollover already exists in `business_days` / `resetIfStale()`, so the two day-closing mechanisms should be reconciled rather than both maintained.
    *   **Potential Challenges and Mitigations**: This is the day-close path everything downstream depends on, and it is destructive by construction, so it needs its own change with a restore-from-archive test rather than being folded into a feature branch. Confirm with the operator how often end-day is actually pressed before sizing the work; it may be a legacy control that is never used.
    *   **Validation**: A transaction of every status survives a close and is recoverable; `daily_summaries` matches what was summarised; a close run just after Bangkok midnight targets the correct business day.
