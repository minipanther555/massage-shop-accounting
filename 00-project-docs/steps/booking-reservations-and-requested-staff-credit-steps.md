# Booking Reservations and Requested-Staff Credit Steps

> **Status:** BKG-001 IMPLEMENTED - in-app browser click-through pending; BKG-002 superseded by DSS; BKG-003 DONE; BKG-004 OPEN; BKG-005 SUPERSEDED BY MANUAL-STAFF WALK-IN CLARIFICATION; BKG-006 OPEN
> **Feature Specification:** `00-project-docs/feature-specifications/booking-reservations-and-requested-staff-credit.md`

## BKG-001 - Reservation, Arrival Conversion, and Separate Credit

**Status:** IMPLEMENTED (2026-07-13) - final in-app browser booking/arrival click-through pending because the browser webview would not attach

**Goal:** Ship the minimum complete receptionist workflow for future reservations, optional requested staff, arrival conversion, and separate `฿50` requested-staff credit without changing Today Staff ranking.

**Dependencies:** Existing New Customer UI, transaction creation, service lookup, staff earnings, Today Staff helper, Bangkok business-day utility.

**Traceability:** FR-001 through FR-010; AC-001 through AC-009.

**Action Items:**
- [x] Add additive booking, booking-credit, and transaction-link schema.
- [x] Add booking validation and 15-minute availability logic.
- [x] Add create/list/arrival lookup booking API contracts.
- [x] Make transaction conversion atomic and idempotent.
- [x] Add Thai-first booking and upcoming-arrival UI to both templates.
- [x] Preserve normal walk-in and correction behavior.
- [ ] Complete the final in-app browser booking creation and arrival conversion click-through.
- [x] Add focused unit, integration, regression, and first-viewport browser checks.
- [x] Synchronize co-located and project status documentation.

**Validation:** AC-001 through AC-009 pass in focused automated tests; browser verification demonstrates requested-staff booking creation and low-effort arrival conversion; normal walk-in remains operational; `git diff --check` passes.

**Technical Considerations:**
- Reservations are not transactions and must never require payment.
- `requested_masseuse_name` is nullable.
- Booking credit is a separate ledger record and is created only during completed conversion.
- Server-side conflict validation is authoritative.
- Existing databases receive additive, idempotent initialization only.

**Potential Challenges and Mitigations:**
- Duplicate arrival clicks: unique booking/transaction links and booking status guard.
- Time-zone errors: explicit ISO timestamps with Bangkok offset and shared parsing helpers.
- Existing dirty worktree: preserve all current user changes and limit edits to the booking chain.
- Correction double-credit: reverse active credit before replacement.

**Expected Deliverable:** A complete local booking-to-paid-transaction workflow with separate credit accounting and no automatic queue reorder.

**Completion Notes:** Implementation and automated validation completed 2026-07-13. Focused pre-cleanup receipt: 4 suites passed, 14 tests passed. The real Express/SQLite smoke proves non-financial creation, requested-staff arrival credit, generic arrival without credit, duplicate conversion rejection, and the partial unique transaction index. Permanent unit tests prove the exact 15-minute boundary. Focused ESLint passed; both HTML/EJS inline scripts parsed; `git diff --check` passed. SQLite `EXPLAIN QUERY PLAN` used `idx_bookings_status_start` and `idx_bookings_staff_status_start`. Initial 599px browser verification showed the Thai-first first viewport, next-staff default, in-shop default, and responsive service controls. Browser review then exposed an incorrect `+฿50` card during walk-in because its flex display overrode `hidden`; the card and all related frontend copy/toggling were removed while backend credit accounting remained intact. A later browser review found that Daily Summary masked stale preview expense descriptions with page-local aliases while New Customer showed the stored API values; the two bounded preview rows were corrected to `Big C` and `Oil`, the aliases were removed, and 3 focused suites/12 tests plus port 3001 rendering verified one cross-page source of truth. A follow-up browser review found that normal walk-in submit saved the transaction but left the staff dropdown on the served masseuse and did not reliably place the new row first in recent transactions. The fix moved `/api/staff/advance-queue` onto the active `today_staff` queue, refreshed the roster before `clearForm()`, made `/api/transactions/recent` newest-first with `id DESC` tie-break, and added `idx_transactions_recent_date_timestamp` for the date-filtered recent list; `__tests__/transaction.walkin-refresh.present.test.js` and `tests/integration/walkin.queue-refresh.integration.test.js` passed. The final booking/create/arrival click-through remains pending. No production database or server was touched.

## BKG-002 - Shop Current Status Surface

**Status:** SUPERSEDED FOR CURRENT PASS BY DSS - implement inside Daily Summary instead of as a separate page

**Goal:** Add a Thai-first operational status surface showing each masseuse's current busy state, busy-until time, next booking, usable time before booking after the 15-minute buffer, and completed massage count for the business day.

**Dependencies:** BKG-001; Today Staff current queue; manager review of desired display.

**Traceability:** FR-007, FR-011; future acceptance criteria after design interview.

**Expected Deliverable:** A task-obvious receptionist/manager status surface inside Daily Summary that supports safe walk-in assignment decisions. See `00-project-docs/feature-specifications/daily-summary-current-shop-status.md` and `00-project-docs/steps/daily-summary-current-shop-status-steps.md`.

**Technical Considerations:** Derive status from transactions, Today Staff, and bookings; do not duplicate ledger state.

**Potential Challenges and Mitigations:** Keep calculations server-authoritative and render concise Thai-first rows.

## BKG-003 - Manager-Confirmed Walk-In Assignment

**Status:** ✅ DONE (2026-07-15) - confirmed workload-first walk-in priority with stable day-start tie-break

**Goal:** Implement deterministic walk-in assignment using Today Staff workload counts, stable day-start tie-breaking, and booking reservation eligibility.

**Dependencies:** BKG-001, BKG-002, manager clarification.

**Traceability:** FR-012, AC-009.

**Action Items:**
- [x] Confirm the manager rule for equal workloads and late unreleased bookings.
- [x] Calculate walk-in priority from current-day assigned workload first.
- [x] Preserve the original Today Staff display order as the tie-break instead of rotating the queue.
- [x] Exclude active massages and unreleased current-day requested bookings until the massage ends or reception marks the booking `NO_SHOW`.
- [x] Prevent previous-day `BOOKED` reservations from rolling into the next business day.
- [x] Add permanent regression coverage for stable-position tie-breaks, stale-booking exclusion, no-show release, and no-available-staff messaging.

**Expected Deliverable:** A deterministic, testable reorder contract tied to daily massage counts and explicitly confirmed tie-break behavior.

**Technical Considerations:** Completed massages are the primary workload count. Unreleased bookings reserve staff from walk-ins and count as assigned workload. Active massages and late unreleased bookings are ineligible until the service ends or reception marks the booking `NO_SHOW`. Ties use the stable original Today Staff row order, not the rotated current position or a stale status label.

**Potential Challenges and Mitigations:** Do not encode guessed behavior; use BKG-002 counts/availability to support manual reordering in the interim.

**Validation:** `__tests__/transaction.booking.present.test.js`, `__tests__/transaction.walkin-refresh.present.test.js`, `tests/integration/walkin.queue-refresh.integration.test.js`, and `tests/otdd/daily-summary-current-status.test.js` cover disabled Walk-in options, current-day booking constraints, stable original-position tie-breaks, no queue rotation after submit, no-show release, previous-day booking no-rollover, and the everyone-busy free-time message. Local test database cleanup removed six stale pre-current-day `BOOKED` rows after operator approval; the browser then showed `นา (คิวถัดไป)` as the auto-selected walk-in staff.

## BKG-004 - Booking Arrival Correction and Time-Window Hardening

**Status:** OPEN - added by checkpoint quality/security review (2026-07-13)

**Goal:** Harden the booking/arrival workflow so requested-staff booking credit survives correction flows correctly and booking-buffer enforcement remains server-authoritative even when API clients omit optional datetime fields.

**Dependencies:** BKG-001, `backend/routes/transactions.js`, `backend/routes/bookings.js`, `backend/services/booking-service.js`, transaction correction tests, booking integration tests.

**Traceability:** FR-004, FR-005, FR-006, FR-008; AC-004, AC-005, AC-006, AC-007.

**Action Items:**
- [ ] Add a regression proving correction of a requested-staff booking transaction reverses and recreates the active `฿50` booking credit instead of dropping it.
- [ ] Load the original booking context during correction when `corrected_transaction_id` references a booking-derived transaction.
- [ ] Make server-side booking-buffer enforcement independent of optional browser-provided `start_datetime` / `end_datetime` fields.
- [ ] Document the final correction and buffer contracts in the co-located transaction and booking docs.

**Validation:** Focused transaction/booking tests prove requested-staff booking conversion creates exactly one active credit, correction keeps exactly one active replacement credit when still eligible, reversal inactivates the old credit, and a walk-in that would violate the 15-minute requested-staff booking buffer is rejected even if the client omits datetime fields.

**Technical Considerations:** The credit ledger must remain separate from base commission and Today Staff next-day ranking. The booking row is the source of truth for requested staff and scheduled time once a transaction is booking-derived.

**Potential Challenges and Mitigations:** Avoid making correction mode depend on fragile browser-hidden fields; fetch booking linkage server-side from `booking_transaction_links` and current booking rows.

**Expected Deliverable:** A correction-safe, API-safe booking arrival path with permanent regression tests and updated docs.

## BKG-005 - Present Manual Staff Selection and Visible Booking Credit

**Status:** SUPERSEDED / UPDATED (2026-07-23)

**Goal:** Keep a customer already at the shop in the normal Walk-in flow even when reception manually selects a non-next staff member, while preserving explicit Booking-mode reservations and booking-credit visibility for actual booking arrivals.

**Dependencies:** BKG-001, New Customer next-staff auto-selection, `backend/routes/transactions.js`, `backend/routes/bookings.js`, `backend/routes/reports.js`, `web-app/shared.js`, and mirrored New Customer, Daily Summary, and Home templates.

**Traceability:** FR-013, FR-014; AC-010 through AC-013.

**Action Items:**
- [x] Add RED tests for manual non-next staff walk-in isolation, ordinary next-staff isolation, immediate reservation time, and credit-bearing booking-arrival transaction reads.
- [x] Remove the implicit immediate requested-staff booking contract from normal walk-in submission without changing the database schema.
- [x] Default explicit reservation time to now and let the server normalize an immediate reservation timestamp.
- [x] Return active `booking_credit_amount` from transaction read contracts.
- [x] Render a compact Thai-first credit annotation in New Customer, Daily Summary, and Home transaction rows.
- [x] Expose base commission, booking credit, and combined staff pay separately in Daily Summary and manager reports.
- [x] Preserve Today Staff base-commission-only ranking and manual queue-reordering behavior.
- [x] Run integration, browser, security, query-plan, mirrored-template, and documentation verification.

**Validation:** Focused tests prove AC-010 through AC-013 under the clarified rule; normal manual staff walk-ins do not create booking rows or booking credits, while actual Booking-mode arrivals still expose compact `จองพนักงาน +฿50` transaction badges without the old large card; SQLite query plans use transaction/credit indexes; inline scripts, lint, and `git diff --check` pass.

**Technical Considerations:** Use explicit Booking mode for booking creation. Keep `booking_credits` separate from base commission and create them only from booking-arrival conversion. Reuse the existing booking and transaction tables and active-credit uniqueness constraints; no schema change is required.

**Potential Challenges and Mitigations:** Avoid reintroducing a hidden frontend or backend inference from non-next staff to booking. Join active credit by indexed `transaction_id`. Keep compact badge markup page-scoped and escape all stored values.

**Expected Deliverable:** A normal one-submit walk-in workflow for manually selected staff plus visible, auditable `฿50` credit information across transaction lists and financial reporting for actual booking arrivals.

**Completion Notes:** Original 2026-07-14 delivery is superseded for present walk-ins by the 2026-07-23 manager clarification: manual non-next staff selection can be a walk-in because the next queue member may not perform the requested service. The current contract keeps non-next selection in Walk-in mode, submits `requestedStaffBooking: false`, and server-side transaction creation ignores stale `requested_staff_booking` payloads unless an explicit `booking_id` is present. Explicit Booking mode and booking-arrival credits remain intact.

## BKG-006 - Universal Booking Commission and Cross-Page Staff Earnings Detail

**Status:** PARTIAL (2026-07-14) - universal booking credit and Booking preview shipped; cross-page staff detail remains open

**Goal:** Make the universal `฿50` booking commission explicit in Booking-mode preview and expose base commission, booking commission, and combined payable totals wherever staff earnings are expanded or reviewed.

**Dependencies:** BKG-005, `backend/routes/transactions.js`, `backend/routes/reports.js`, `backend/routes/staff.js`, `web-app/shared.js`, mirrored Home/Daily Summary/Daily Staff/Reports/Payday/New Customer templates.

**Traceability:** FR-004, FR-005, FR-010, FR-014, FR-015; AC-014 through AC-016.

**Action Items:**
- [x] Update booking arrival accounting so every paid Booking-mode arrival creates one active `฿50` credit for the requested or serving masseuse; preserve no credit for ordinary walk-ins.
- [x] Show Booking-mode preview pay as base commission plus `฿50` without submitting the combined preview as `masseuse_fee`.
- [ ] Add shared staff-pay detail data and clickable/expandable staff detail surfaces across Home, Daily Summary, Daily Staff, transaction lists, financial reports, and Payday Tracking. Home Recent Activity now includes inline-toggle booking/transaction/expense detail; Payday Tracking summary cards open inline calculation panels and staff names open inline current-week massage tables with base fee, booking credit, combined total, and a total row; Financial Reports summary cards and report rows now open inline source mini tables from filtered transaction/expense detail rows; Today Staff rows now have a separate `Info` toggle that opens inline staff detail without conflicting with drag/drop; remaining cross-page staff earnings drilldowns remain open.
- [ ] Keep Today Staff previous-day ranking strictly base-commission-only and add regression coverage for the exclusion.
- [ ] Add mirrored-template, integration, browser, and reporting tests plus co-located documentation updates.

**Validation:** AC-014 through AC-016 pass in focused unit/integration tests; Booking preview shows base + `฿50` while ledger payload remains base-only; requested and queue-assigned arrivals each create exactly one credit; ordinary walk-ins create none; staff detail surfaces show base/booking/total; Today Staff ordering is unchanged; mirrored scripts parse, browser smoke passes at the active narrow viewport, lint and `git diff --check` pass.

**Technical Considerations:** The `booking_credits` ledger remains the source of truth for the extra pay. Queue-assigned bookings resolve the credit recipient at arrival. Do not add booking credit to `Today Staff` ranking or mutate the existing base commission field.

**Potential Challenges and Mitigations:** Preserve existing BKG-005 transaction joins and correction semantics; add permanent regression tests before changing any shared renderer; keep the preview display separate from the persisted base-fee payload.

**Completion Notes (partial):** Queue-assigned and requested-staff arrival integration tests pass with separate active credits; mirrored New Customer templates display base + `฿50` while preserving base-fee submission; Home Recent Activity now fetches upcoming bookings, merges them with transactions/expenses, and inserts one inline detail row directly below the clicked row with second-click collapse; the payment breakdown expands matching transactions and Recent Activity toggles between five and expanded rows; Home follow-up fixes render future bookings as `ยังไม่ชำระ` instead of false revenue and explain busy/booking-buffer status as massage end, 15-minute buffer, and next free time; booking-aware Walk-in availability and persisted Today Staff drag/drop are recorded in current-steps item 18. Payday Tracking now makes Total Outstanding/Overdue/This Week/Next Due cards clickable with inline calculation panels; staff names now toggle inline current-week massage tables that list each massage with base fee, booking credit, combined pay, and a total row, and the roster header is compact Thai-first copy. Financial Reports now returns filtered `detailRows.transactions`/`detailRows.expenses`; summary cards and report rows open inline mini tables below the selected tile group while sibling tiles dim, including transaction source rows with revenue/base/booking columns. RED/GREEN `__tests__/admin-staff.contract.present.test.js` passed 8/8 and RED/GREEN `__tests__/admin-reports.contract.present.test.js` passed 8/8 after proving missing source-table contracts. In-app browser smokes at `localhost:3003/api/admin/staff-page` and `localhost:3003/api/admin/reports-page` verified the relevant inline panels. Today Staff rows now keep drag/drop as the row behavior and add a separate `Info` button that toggles an inline detail panel with massages today, base pay, booking credit, total pay, previous-day helper pay, and status; RED/GREEN `__tests__/today-staff.controller.contract.present.test.js` passed 6/6 and in-app browser smoke at `localhost:3003/api/main/staff-roster` verified first-row open/close behavior. Inline scripts parse and `git diff --check` passes. Remaining cross-page staff earnings detail surfaces and final browser verification remain open.
