# Transaction Correction Operational Reversal Steps

> **Status:** TCR-001 and TCR-002 implemented for normal current-business-day walk-ins; booking-backed correction/cancellation coverage remains open pending separate semantics
> **Feature Specification:** `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md`

## TCR-001 - Current-Business-Day Walk-In Correction

**Status:** PARTIAL (2026-07-22)

**Goal:** Make saved walk-in correction a normal, audit-preserving operational reversal: reception can correct the latest transaction or choose one of up to ten earlier current-business-day transactions, then accept the automatic next eligible replacement or choose another eligible staff member.

**Dependencies:** Existing transaction correction route and audit columns; `backend/routes/staff.js` current-status priority; mirrored New Customer templates; BKG-004 for booking-backed correction credit semantics.

**Traceability:** Transaction Correction Operational Reversal FR-001 through FR-007; AC-001 through AC-008. Booking specification FR-009 and FR-013 remain applicable only where stated by the new correction-specific exception.

**Action Items:**
- [x] Add RED tests for current-business-day/capped candidate selection and the latest-target contract.
- [x] Add RED route/integration tests proving a normal correction reverses original base-fee, retains audit links, and applies the replacement once.
- [x] Add a correction-candidate read contract and make the latest endpoint use the same current-business-day eligibility rules.
- [x] Make the correction loader await the selected transaction and keep `transaction.html` and `transaction.ejs` mirrored.
- [x] Add the primary latest action and secondary up-to-ten earlier-transaction selector using Thai-first labels and concise rows.
- [x] Compute the correction default from authoritative post-reversal walk-in eligibility; permit a manual override only to eligible available staff.
- [x] Ensure a normal correction bypasses immediate requested-staff booking creation and never receives a `฿50` booking credit merely because reception chose a different replacement.
- [ ] Preserve and test booking-backed correction credit reversal/replacement under BKG-004.
- [x] Update co-located module documents, this ledger, and current project status documentation.

**Validation:** AC-001 through AC-008 pass in focused unit, Supertest/SQLite integration, mirrored-template contract, and authenticated browser tests. Browser proof shows latest correction and earlier-list selection, automatic next-eligible replacement, manual eligible replacement, unavailable staff disabled/rejected, and original/replacement audit rows. `npm run lint`, relevant `node --check`, and `git diff --check` pass.

**Technical Considerations:**
- The server is authoritative for correction eligibility, current Bangkok business day, staff availability, commission reversal, and booking-credit eligibility.
- Reuse `walk_in_priority`; do not create a second queue algorithm or change `today_staff.position`.
- Corrections are auditable replacement records, not deletes or in-place mutation.
- This step may require SQLite query changes but no schema migration is expected because `transactions.corrected_from_id` already exists. If schema/data operations become necessary, invoke the DB-Ops protocol before making them.

**Potential Challenges and Mitigations:**
- The existing non-next walk-in rule creates an immediate requested-staff booking; explicitly isolate correction submissions in the server contract and lock it with an integration regression.
- An old selection must never mutate the current-day queue before a successful save; derive availability at submit time and reject stale choices.
- Booking-derived corrections must not lose a valid credit; keep BKG-004 tests as a dependency rather than merging the two ledgers.

**Expected Deliverable:** A receptionist can correct a mistaken saved walk-in without losing the audit trail, without leaving the wrong staff member busy or paid, and without accidentally creating a booking credit.

**Completion Notes (partial):** RED route test proved the missing correction-candidate endpoint and the legacy immediate-booking rejection. GREEN integration test proves current-business-day candidate selection, latest-target consistency, original `EDITED` audit status, replacement `CORRECTED` status, base-fee reversal/replacement, no booking/credit despite a hostile `requested_staff_booking: true` payload, and server rejection of a busy manual replacement before mutation. Browser smoke on the documented local preview showed both correction controls and the earlier-list empty state. BKG-004 booking-backed correction credit coverage remains open.

## TCR-002 - Cancel Saved Walk-In From Edit Screen

**Status:** DONE - 2026-07-23

**Goal:** Let reception cancel a saved current-business-day walk-in from the same edit/correction workflow when the customer leaves before the massage starts, while preserving the transaction as an audit record and removing its active operational effects.

**Dependencies:** TCR-001 correction candidate/edit surface; `backend/routes/transactions.js` status filters and atomic transaction writes; current-status workload/busy calculations; transaction reads for Home, Daily Summary, reports, and Payday totals; mirrored `transaction.html` and `transaction.ejs`; DB-Ops protocol if implementation requires a schema migration or data operation.

**Traceability:** Transaction Correction Operational Reversal FR-008; AC-009 through AC-011.

**Action Items:**
- [x] Add RED integration coverage proving a current-business-day normal walk-in cancellation preserves the row with an audit status but removes active revenue, staff workload, busy state, payable commission, and booking-credit eligibility.
- [x] Add rejection coverage for historical, already edited, already cancelled, and booking-backed transactions unless booking-backed cancellation semantics are explicitly implemented.
- [x] Add a server-authoritative cancellation endpoint or action path that runs atomically and never deletes the original transaction row.
- [x] Add Thai-first cancel controls to the latest-edit and earlier-transaction-list flows in both mirrored New Customer templates without cluttering the normal transaction entry path.
- [x] Update transaction, status, report, and staff-pay reads so cancelled rows are visible only where audit/history requires them and excluded from active totals.
- [x] Run local route/integration tests, mirrored-template checks, browser smoke for the cancel UI, lint, security review, and `git diff --check`.
- [x] Update co-located module documents, this ledger, and current project status documentation with cancellation behavior and evidence.

**Validation:** AC-009 through AC-011 pass in focused Supertest/SQLite integration, mirrored-template contract, and browser smoke. Checks prove cancel is audit-preserving, non-deleting, active-total excluding, staff-effect reversing, Thai-first, and unavailable for ineligible targets. `npm run lint`, relevant `node --check`, security review, and `git diff --check` pass.

**Technical Considerations:**
- Cancellation is a status transition, not a delete and not an in-place zeroing of the original financial fields.
- Active financial/staff calculations must continue to use explicit active-status filters rather than inferring from price or fee values.
- If a new status value is sufficient, no DB schema change is expected. If schema or live data mutation becomes necessary, run the DB-Ops protocol before the change.
- Booking-backed cancellation can affect booking state and booking credit; do not guess that behavior inside this step unless the spec is clarified first.

**Potential Challenges and Mitigations:**
- Existing reports may include transactions by broad status predicates; add focused coverage so cancelled rows do not remain in active revenue or commission totals.
- The edit UI is already a busy workflow; use the existing latest/edit-earlier actions and add the cancel choice only after a target is loaded.
- Reception may cancel after another staff selection has advanced; server-side status and workload recalculation must be authoritative at submit time.

**Expected Deliverable:** A receptionist can cancel a mistaken or abandoned saved walk-in, managers can still see that it happened, and the cancelled massage no longer makes the staff member busy, paid, counted, or included in active revenue.

**Completion Notes:** Implemented `POST /api/transactions/:transactionId/cancel` as an audit-preserving `CANCELLED (Customer left before service)` status transition guarded by current Bangkok business day, active status, and no booking linkage. The route runs atomically, reverses base commission, reverses active linked booking credit defensively, and leaves cancelled rows excluded from existing active-status report/status/payday reads. Both New Customer templates now reveal a Thai-first cancel button only after a correction target is loaded, and page-local reset clears shared correction state after cancellation. Validation evidence: focused Supertest/SQLite integration, mirrored-template/API contract Jest checks, local browser smoke through `/transaction.html?PWTEST=1`, lint, security/perf scans, and `git diff --check`.
