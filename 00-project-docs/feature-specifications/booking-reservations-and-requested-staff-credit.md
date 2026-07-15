# Feature Specification

## 1. Executive Summary

### Feature Name
Booking Reservations and Requested-Staff Credit

### Goal
Allow reception to record a future customer reservation without creating revenue, massage commission, payment, or busy status before the customer arrives. A booking may request a particular masseuse or may leave staff assignment to the Today Staff queue. When the customer arrives, reception should reopen the saved details, select payment, confirm the transaction, and perform no unnecessary duplicate entry.

### Success Criteria
- A future reservation can be saved without a payment method.
- Saving a reservation does not create a transaction, revenue, commission, payday balance, or busy status.
- A reservation can either request one masseuse or defer staff selection to the queue at arrival.
- Overriding the automatically selected next staff member is treated as a requested-staff booking.
- Arrival conversion reuses the saved service, duration, location, contact, and scheduled time and asks reception for payment.
- A completed requested-staff booking creates a separate payable `฿50` credit.
- A queue-assigned booking creates its `฿50` booking credit for the masseuse who serves the paid arrival.
- Today Staff previous-day ordering continues to use base massage commission only.
- A staff member must have a 15-minute gap between a massage ending and a later booking starting.
- Undefined manager-driven queue reordering is not automated.

### Requirement Sources
- User clarification in the 2026-07-13 booking workflow interview.
- `today-staff-roster-business-day-helper.md`, especially the base-commission ranking and audit separation rules.
- Current New Customer, transaction, staff-status, reporting, and payday implementation.

## 2. Scope Definition

### In Scope
- Non-financial reservation persistence.
- Optional requested masseuse.
- Explicit booking mode and automatic booking recognition when next-staff selection is overridden.
- Future start and calculated end times.
- Upcoming booking list on the New Customer page.
- Low-effort arrival conversion into the existing transaction form.
- Separate `฿50` requested-staff credit created at successful arrival conversion.
- Fifteen-minute booking buffer validation.
- Correction-safe credit reversal/replacement.
- Daily staff massage counts exposed for later status-page use.

### Out of Scope
- Automatic queue reordering after a booking.
- A finalized manager algorithm for balancing daily massage counts.
- Full standalone shop-status page implementation.
- Deposits, prepayment, online payment, reminders, or customer messaging.
- Multi-day calendar management beyond recording and listing future reservations.

### Non-Goals
- Do not treat a reservation as earned revenue.
- Do not mark a future-booked masseuse busy before arrival.
- Do not give `฿50` when no masseuse was specifically requested.
- Do not infer an unconfirmed queue-reordering formula.

## 3. Existing System Impact Analysis

### Existing Components Affected
- `web-app/transaction.html` and `transaction.ejs`: booking mode, future time input, upcoming bookings, arrival conversion.
- `web-app/shared.js`: booking fields in transaction conversion and refreshed booking state.
- `web-app/api.js`: booking API methods.
- `backend/routes/bookings.js`: reservation create/read/cancel/availability contracts.
- `backend/routes/transactions.js`: atomic reservation conversion and separate credit creation.
- `backend/models/database.js`: additive booking, booking-credit, and transaction-link schema.
- `backend/routes/staff.js`: remains base-commission-only for helper ranking; later status page consumes massage counts and availability.
- `backend/routes/reports.js` and admin payday routes: payable totals include active booking credits, while massage commission remains separately reportable.

### Components Explicitly Unaffected
- Service pricing and base `masseuse_fee` definitions.
- Today Staff previous-business-day sort semantics.
- Authentication roles.
- Manager-owned queue reordering until its rules are confirmed.

### Regression Risks
- Reservation accidentally enters financial totals. Mitigation: reservations use a separate table and never call transaction creation until arrival.
- Future booking marks staff busy early. Mitigation: only arrival conversion calls busy-state logic.
- Booking credit contaminates next-day ranking. Mitigation: helper continues summing `transactions.masseuse_fee`; credit is stored separately.
- Duplicate arrival clicks create duplicate transactions/credits. Mitigation: one transaction and one active credit per booking, enforced by unique keys and status validation.
- Correction leaves double credit. Mitigation: reverse original active credit before creating replacement credit.

## 4. Integration Architecture

### Upstream Dependencies
- Current Today Staff queue supplies the default next masseuse.
- Service configuration supplies valid location/service/duration combinations.
- Reception supplies customer contact, scheduled time, and optional requested masseuse.

### Downstream Dependencies
- Upcoming bookings list.
- Arrival transaction conversion.
- Staff busy state after arrival.
- Payday outstanding total.
- Future shop-status page and queue decision support.

### Contracts

#### Reservation Create Request
```json
{
  "scheduled_start": "2026-07-13T18:00:00+07:00",
  "service_type": "Thai Massage",
  "location": "In-Shop",
  "duration": 60,
  "requested_masseuse_name": "May เมย์ or null",
  "customer_contact": "string"
}
```

#### Reservation Response
```json
{
  "booking_id": "BK-...",
  "scheduled_start": "ISO-8601 Bangkok timestamp",
  "scheduled_end": "ISO-8601 Bangkok timestamp",
  "requested_masseuse_name": "string or null",
  "status": "BOOKED",
  "booking_credit_eligible": true
}
```

#### Arrival Transaction Extension
`POST /api/transactions` accepts optional `booking_id`. When present, the server validates the active reservation and uses it as the authoritative service/time/requested-staff source before creating financial records.

## 5. Functional Requirements

### FR-001: Save Non-Financial Reservation
Reception can save a reservation without payment. The server validates service, duration, location, future start, and optional requested staff, calculates scheduled end, and stores status `BOOKED`. No transaction or earnings mutation occurs.

### FR-002: Requested Versus Queue-Assigned Staff
A booking may contain `requested_masseuse_name` or `null`. Selecting booking mode directly defaults to queue assignment. Selecting a staff member different from the auto-selected next person marks the reservation as requested-staff booking.

### FR-003: Arrival Conversion
An upcoming booking has a Thai-first arrival action. It loads the saved details into the New Customer form, requires payment, allows reception to confirm the assigned staff for queue-assigned bookings, and submits one financial transaction.

### FR-004: Separate Requested-Staff Credit
Successful conversion of a requested-staff booking creates one active `฿50` booking credit for the requested masseuse. It also adds `฿50` to the staff outstanding earned balance. The transaction's base `masseuse_fee` is unchanged.

### FR-005: Booking Credit Applies to Every Booking Arrival
Every reservation created in Booking mode carries a `฿50` booking commission when it becomes a paid transaction. If a requested masseuse is selected, that masseuse receives the credit; if staff was left for queue assignment, the masseuse who serves the arrival receives it. A normal non-booking walk-in remains ineligible.

### FR-006: No-Show and Cancellation
A reservation that remains `BOOKED`, is cancelled, or is marked no-show has no financial transaction and no booking credit. Cancellation/no-show UI may be delivered in a later step; the data model must support both states.

### FR-007: Fifteen-Minute Gap
For a requested masseuse, a preceding massage is eligible only when its end is at or before `booking_start - 15 minutes`. Booking creation rejects overlaps with another active booking for the same requested staff. Transaction submission rejects a walk-in assignment that would violate the next booking buffer.

### FR-008: Busy Status Timing
Saving a future reservation does not alter `staff_roster.status` or `busy_until`. Arrival conversion marks the serving masseuse busy until the confirmed transaction end time.

### FR-009: Correction Semantics
Correcting a booking-backed transaction reverses its active base fee and active booking credit from the original recipient, marks the original records superseded, and creates the replacement base fee and one replacement booking credit only when the corrected transaction remains tied to an eligible requested-staff booking.

### FR-010: Today Staff Ranking Isolation
Previous-day helper ranking sums only active transaction `masseuse_fee`. It never sums booking credits or `staff.total_fees_earned`.

### FR-011: Daily Massage Count and Status Inputs
The current shop-status surface needs, per staff member: current busy state, busy-until time, next booking time, available minutes before that booking after the 15-minute buffer, and completed massage count for the current business day. For the current pass, this surface is implemented inside Daily Summary rather than as a separate page; see `daily-summary-current-shop-status.md`.

### FR-012: Deferred Queue Reordering
Walk-in assignment uses the Today Staff list as the stable day-start tie-break order. Completed massages are the primary workload count; an unreleased booking also reserves that staff member from walk-ins and contributes to assigned workload. Active massages and unreleased bookings make a staff member ineligible, including a late booking until reception marks it `NO_SHOW`. Among eligible staff, the lowest assigned workload wins. When workloads tie, the original Today Staff order wins, even after queue rotations; a booking may temporarily change eligibility but does not rewrite the original order.

### FR-013: Immediate Requested-Staff Arrival
When a customer is already present and reception selects a staff member other than the automatically selected next Today Staff member, the page remains in `ลูกค้ามาแล้ว / Walk-in` mode and the submission is classified as an immediate requested-staff booking. Payment remains required. One submit atomically creates a completed booking record, one financial transaction, and one active `฿50` booking credit for the selected staff member. Selecting the automatically chosen next staff member remains a normal walk-in and creates no booking or credit.

Explicit reservation mode accepts a start time of now or any later time. The browser defaults the reservation time to now rather than forcing a 30-minute delay. A reservation saved without payment remains non-financial until arrival conversion, even when its scheduled time is now.

### FR-014: Visible Credit and Reporting Separation
Every transaction read contract returns `booking_credit_amount`, using the active credit linked to that transaction or `0` when none exists. Staff-facing transaction lists render a compact Thai-first `จองพนักงาน +฿50` annotation only when this amount is positive. The annotation must not be rendered as a form field, price card, or primary action.

Daily and manager financial reporting expose base massage commission and booking credit separately, and staff-pay totals include both. Today Staff previous-day ordering continues to use base transaction `masseuse_fee` only.

### FR-015: Cross-Page Staff Earnings Detail
Whenever a staff member is shown as an interactive row or drilldown on Home, Daily Summary, Daily Staff, recent-transaction views, financial reports, or Payday Tracking, the detail view may show that staff member's base commission, booking commission, and combined payable total. Booking commission is visible in payday and transaction detail but is excluded from the next-business-day Today Staff ranking.

## 6. Data Model Changes

### `bookings`
- `id` integer primary key
- `booking_id` unique text
- `created_at` timestamp
- `scheduled_start` timestamp with explicit Bangkok offset
- `scheduled_end` timestamp with explicit Bangkok offset
- `service_type`, `location`, `duration`
- `requested_masseuse_name` nullable
- `customer_contact`
- `status`: `BOOKED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
- `transaction_id` nullable unique
- `completed_at`, `cancelled_at` nullable

Indexes cover `(status, scheduled_start)` and `(requested_masseuse_name, status, scheduled_start)`.

### `booking_credits`
- `id` integer primary key
- `booking_id` unique for active lifecycle
- `transaction_id` unique
- `masseuse_name`
- `amount`, fixed at `50.00` in v1
- `status`: `ACTIVE`, `REVERSED`
- `created_at`, `reversed_at`

### `transactions.booking_id`
Nullable link to the reservation converted by that transaction.

## 7. State Transitions

Valid reservation transitions:
- `BOOKED -> COMPLETED` through arrival transaction conversion.
- `BOOKED -> CANCELLED`.
- `BOOKED -> NO_SHOW`.

Invalid transitions:
- Completed/cancelled/no-show reservation cannot be converted again.
- Queue-assigned booking cannot create a requested-staff credit retrospectively without an explicit correction workflow.

## 8. Operational Considerations

- Log booking creation, conversion, cancellation/no-show, conflict rejection, credit creation, and credit reversal with IDs but without sensitive customer details.
- API validation is authoritative; browser warnings are convenience only.
- All timestamps are ISO-8601 with Bangkok offset. Business-day reporting continues through the shared business-day utility.
- Existing databases receive additive tables/columns; destructive migration is forbidden.
- Reception and manager roles may create/convert bookings; only authenticated users may mutate them.

## 9. Rollout Plan

1. Add schema and backend contracts against disposable test databases.
2. Add New Customer booking/arrival UI behind the existing authenticated route.
3. Verify normal walk-in behavior remains unchanged.
4. Keep queue reordering manual.
5. Add standalone shop-status page only after manager workflow clarification.

Rollback disables booking UI/routes while leaving additive tables intact. Existing transaction behavior remains backward compatible when `booking_id` is absent.

## 10. Testing Requirements

- Unit: time normalization, 15-minute cutoff, overlap detection, credit eligibility.
- Integration: reservation creation causes no financial writes; conversion creates one transaction and one eligible credit; duplicate conversion fails; generic booking creates no credit.
- Correction: original active credit is reversed exactly once.
- Regression: Today Staff helper excludes booking credits.
- Browser: create requested booking, view upcoming row, load arrival, require payment, and confirm normal walk-in remains simple on mobile/iPad widths.

## 11. Risks and Assumptions

### User Confirmed
- Reservation is non-financial until arrival because the customer may no-show.
- Payment is selected at arrival.
- Booking details are saved during the call.
- Staff request is optional; queue decides at arrival when absent.
- Exact automatic queue reordering is deferred.

### Inferred
- The `฿50` becomes payable only after successful arrival conversion, because no-show reservations are non-financial.
- Fixed `฿50` is acceptable for v1; configurability is deferred.
- The arrival action reuses the New Customer form to minimize receptionist work.

### Open Questions
- Manager's exact post-booking queue reorder algorithm.
- Final standalone shop-status page layout.
- Whether cancellation/no-show needs a receptionist-facing reason field.

## 12. Acceptance Criteria

- AC-001: Saving a reservation produces one `bookings` row and zero new transaction, credit, fee, revenue, and busy-state writes.
- AC-002: Converting a requested-staff booking produces one completed booking, one transaction, one `฿50` active credit, and staff outstanding earnings equal to base fee plus `฿50`.
- AC-003: Converting a queue-assigned booking produces one transaction and one `฿50` booking credit for the masseuse who serves the arrival.
- AC-004: Duplicate conversion returns conflict and creates no additional financial rows.
- AC-005: A massage ending fewer than 15 minutes before a requested booking is rejected for that staff member.
- AC-006: Today Staff helper ordering output is unchanged by booking-credit rows.
- AC-007: Booking mode works without payment; arrival mode cannot submit without payment.
- AC-008: Normal walk-in flow remains auto-selected to next staff and creates no booking record or credit.
- AC-009: Queue reordering remains manual and unchanged.
- AC-010: Submitting a present customer with a manually selected non-next staff member creates one completed booking, one transaction, and one active `฿50` credit atomically; the same submission for the auto-selected next staff member creates no booking or credit.
- AC-011: Reservation mode defaults to now and the API accepts server-normalized immediate reservation time as well as later times without allowing materially stale past reservations.
- AC-012: Transaction list and recent-transaction responses return `booking_credit_amount = 50` for an active requested-staff credit and `0` for ordinary walk-ins, and mirrored staff-facing transaction rows show a compact badge only for the former.
- AC-013: Daily Summary and manager reports expose booking credit separately and total staff pay equals base commission plus active booking credit, while Today Staff ranking output remains unchanged.
- AC-014: Every Booking-mode arrival that becomes a paid transaction creates exactly one active `฿50` booking credit for the requested masseuse or, when staff was queue-assigned, the serving masseuse; ordinary non-booking walk-ins create none.
- AC-015: Booking-mode commission preview shows base commission plus `฿50` while preserving the base commission as the value submitted to the transaction ledger.
- AC-016: Staff detail surfaces expose base commission, booking commission, and combined payable total wherever a staff member is expanded or selected, while Today Staff ranking continues to exclude booking commission.
