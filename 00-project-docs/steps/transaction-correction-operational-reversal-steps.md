# Transaction Correction Operational Reversal Steps

> **Status:** TCR-001 PARTIAL - current-day candidate, availability, audit, and no-credit walk-in correction are implemented; booking-backed correction coverage remains open
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
