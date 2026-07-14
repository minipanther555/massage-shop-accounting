# Booking Reservations and Requested-Staff Credit Steps

> **Status:** BKG-001 IMPLEMENTED - in-app browser click-through pending; BKG-002 superseded by DSS; BKG-003 blocked on product rule; BKG-004 OPEN from checkpoint review
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

## BKG-003 - Manager-Confirmed Queue Reordering

**Status:** BLOCKED ON PRODUCT RULE - do not implement automatically

**Goal:** Implement post-booking queue movement only after the manager provides deterministic rules.

**Dependencies:** BKG-001, BKG-002, manager clarification.

**Traceability:** FR-012, AC-009.

**Expected Deliverable:** A deterministic, testable reorder contract tied to daily massage counts and explicitly confirmed tie-break behavior.

**Technical Considerations:** Current queue rotation aims at roughly equal massage counts, but no exact post-booking position algorithm is confirmed.

**Potential Challenges and Mitigations:** Do not encode guessed behavior; use BKG-002 counts/availability to support manual reordering in the interim.

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
