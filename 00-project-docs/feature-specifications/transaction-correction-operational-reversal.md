# Feature Specification

## 1. Executive Summary

### Feature Name
Transaction Correction Operational Reversal

### Goal
Let reception correct a saved current-business-day walk-in transaction as a normal operational workflow. The original transaction remains auditable, but its incorrect staff assignment no longer contributes busy state, completed-workload count, or payable commission. The replacement transaction is assigned by the normal next-eligible Today Staff rule by default, while reception may choose another eligible staff member.

### Requirement Sources
- Manager/reception interview on 2026-07-22: Khwan was accidentally assigned a customer whose Thai or Oil service she could not perform; reception must move the already-saved walk-in to another staff member.
- Manager clarification on 2026-07-22: default the replacement to the next staff member in queue, but allow reception to select a particular eligible staff member.
- Manager clarification on 2026-07-22: show one common action for the latest transaction and a second action that reveals up to ten earlier current-day transactions.
- Existing booking and requested-staff-credit rules in `booking-reservations-and-requested-staff-credit.md`.

## 2. Scope

### In Scope
- Correct a current-business-day transaction using a latest-transaction action or a selectable list of up to ten eligible earlier transactions.
- Preserve the original transaction as an audit record and link its replacement.
- Reverse the original assignment's active operational effects and apply the replacement assignment atomically.
- Default the replacement to the existing next eligible walk-in staff member.
- Allow a receptionist override only to an eligible available staff member.
- Keep correction replacement as a normal walk-in: no booking row and no booking credit solely because the replacement is manually selected.
- Support correction of a booking-backed transaction through the existing BKG-004 booking-credit rules without weakening them.

### Out of Scope
- Staff service-capability configuration or automatic service-skill matching. Reception retains responsibility for knowing that Khwan currently accepts Foot massage only.
- Changing Today Staff order. Correction restores the original staff member's normal eligibility and original day-start position; it does not rotate or rewrite the queue.
- Editing historical transactions outside the current business day.
- Deleting financial/audit records.

## 3. Existing-System Findings

- The current correction control says "load latest transaction" and has no earlier-transaction selection surface.
- The correction loader is asynchronous, but both transaction templates use it without awaiting it. The form therefore attempts to read fields from a Promise instead of the loaded transaction.
- `GET /api/transactions/latest-for-correction` currently selects one globally latest `ACTIVE` row, without a Bangkok current-business-day filter.
- The transaction route reverses the original base fee, reverses an active booking credit, marks the original `EDITED`, and inserts a `CORRECTED` replacement. It does not yet make the staff availability/workload reversal and replacement-selection rules explicit.
- Current walk-in priority already selects eligible staff by lowest assigned workload and then stable Today Staff position.

## 4. Functional Requirements

### FR-001: Correction Selection
Reception can use a primary Thai-first action to load the latest eligible transaction for correction. A secondary Thai-first action reveals at most ten eligible current-business-day transactions, newest first, for reception to choose an earlier one. An `EDITED` original is not selectable again.

### FR-002: Correct Form Loading
Loading any correction target awaits the server response before populating staff, location, service, duration, payment, customer contact, service window, booking linkage, and original transaction ID. Both static and EJS templates preserve identical behavior.

### FR-003: Normal Operational Reversal
Submitting a correction is one atomic server transaction. It preserves the original transaction with an `EDITED (Corrected by ...)` audit status and the replacement with `CORRECTED` plus `corrected_from_id`. The original staff member loses the original active payable base commission and any active booking credit. The replacement staff member receives only the valid replacement commission and applicable booking credit.

For current-status and queue calculations, the original `EDITED` transaction is no longer an active completed massage. The original staff member returns to normal availability unless another independent active transaction or booking constrains them. Their stable Today Staff position is unchanged.

### FR-004: Default Replacement Assignment
For a normal walk-in correction, the backend and UI use the same current authoritative walk-in eligibility and priority contract as ordinary walk-ins. The default is the next eligible staff member after the original incorrect assignment is excluded from active workload. Reception may select a different staff member only when that person is currently eligible and available.

### FR-005: No Accidental Booking or Booking Credit
A normal walk-in correction remains a walk-in even when reception selects a replacement other than the default next staff member. It must not create a booking record or a `฿50` booking credit. This correction-specific rule supersedes FR-013 only for a submission carrying a valid correction target.

### FR-006: Booking-Backed Corrections
If the original transaction is linked to a booking, the correction retains the existing authoritative booking context and BKG-004 requirements. The route reverses the old active booking credit exactly once and creates one replacement credit only when the corrected booking remains eligible.

### FR-007: Availability Guard
The server rejects a correction replacement assigned to staff who are busy or booking-constrained at the corrected service window. The page renders such people unavailable and never submits a partial correction. Until a replacement saves successfully, the original transaction remains unchanged.

## 5. Data and API Contracts

### Correction Candidates
`GET /api/transactions/correction-candidates?limit=10` returns at most ten current Bangkok-business-day selectable transactions, newest first. Each row includes the fields required to load the form and a concise Thai-facing display summary. The endpoint is authenticated and read-only.

### Latest Correction Target
`GET /api/transactions/latest-for-correction` uses the same current-business-day eligibility contract as the candidate endpoint and returns the first candidate.

### Correction Create Request
`POST /api/transactions` continues to use `corrected_transaction_id` as the original audit link. The server derives correction semantics from this ID; a client cannot create a booking or booking credit merely by setting a non-next replacement while correcting a normal walk-in.

## 6. State Transitions

- Eligible `ACTIVE` or `CORRECTED` current-business-day transaction -> original record marked `EDITED (Corrected by replacement-id)` -> one replacement record marked `CORRECTED`.
- `EDITED` original -> not selectable for correction again.
- Normal walk-in correction -> no booking creation and no booking credit.
- Booking-backed correction -> BKG-004 credit reversal/replacement contract.
- Rejected replacement availability -> no state change.

## 7. Acceptance Criteria

- AC-001: The latest correction action and the earlier-list action load only current-business-day eligible records, with the list capped at ten and ordered newest first.
- AC-002: Both mirrored templates await transaction loading before form fields and correction state are populated.
- AC-003: Correcting a normal walk-in preserves the original audit row, creates one linked replacement, removes the original staff member's payable fee and active-workload effect, and applies the replacement fee/workload effect exactly once.
- AC-004: After a normal correction, the default replacement is the next eligible staff selected by the existing workload-first, stable-position rule; the original staff member remains in their original queue position.
- AC-005: Reception may override only to an available, non-booking-constrained staff member; an invalid override makes no financial or status changes.
- AC-006: A manually chosen replacement in a normal walk-in correction produces no booking row and no `booking_credits` row.
- AC-007: Booking-backed correction still meets BKG-004: old active credit is reversed once and an eligible replacement receives exactly one active credit.
- AC-008: Focused unit, route/integration, mirrored-template, and browser tests cover latest, earlier, automatic replacement, manual eligible replacement, unavailable rejection, audit preservation, and no-booking-credit isolation.

## 8. Risks and Rollback

- Risk: correction can change financial balances and current status. Mitigation: one SQLite transaction, server-side eligibility validation, and audit-preserving original row.
- Risk: normal correction can be misclassified as immediate requested-staff booking. Mitigation: correction-specific backend classification and regression tests.
- Risk: existing booking correction behavior regresses. Mitigation: retain BKG-004 as a dependency and test it separately.
- Rollback: revert the application release. No destructive schema or data cleanup is permitted; corrected/original records remain the audit trail.

