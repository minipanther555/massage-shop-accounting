# Daily Summary Current Shop Status Feature Specification

## 1. Purpose

The Daily Summary page must become the receptionist's single operational snapshot for the current business day. It will keep the existing financial summary, payment breakdown, masseuse performance, transaction log, expense log, and end-day controls, then add a Thai-first current shop status section that answers: who is busy, when they were booked, when the massage ends, when they are free after the 15-minute buffer, who is free now, how many massages each staff member has completed today, and what booking constraints affect walk-in assignment. This replaces the previously deferred idea of a separate shop-status page for the current pass.

## 2. Current Evidence and Scope

- `web-app/summary.html` currently renders Daily Summary cards, payment breakdown, masseuse performance, all transactions, all expenses, and end-day controls.
- `web-app/summary.ejs` mirrors the same Daily Summary structure and must remain synchronized with `summary.html`.
- `web-app/shared.js` currently loads today's recent transactions and expenses through `loadTodayData()`, and loads services, payment methods, and staff roster through `loadData()`.
- `backend/routes/reports.js` currently exposes `GET /api/reports/summary/today` for financial totals and payment breakdown.
- `backend/routes/staff.js` currently exposes `GET /api/staff/roster`, which returns Today Staff rows with queue position and `today_massages`, but the current `getActiveTodayStaff()` projection returns `busy_until` as `NULL`.
- `backend/routes/bookings.js` currently exposes upcoming bookings and booking availability endpoints, and `backend/services/booking-service.js` owns the 15-minute booking buffer rule.
- The existing booking spec tracked this as a future shop-status surface. This feature redirects that status surface into Daily Summary instead of creating a new page.

## 3. Functional Requirements

### DSS-001: Preserve Existing Daily Summary

The Daily Summary page must retain all existing summary behavior:
- today's revenue, transaction count, masseuse fees, expenses, and net profit;
- payment method breakdown;
- masseuse performance;
- all transactions today;
- all expenses today;
- end-day operation controls.

### DSS-002: Add Current Shop Status Section

Daily Summary must add a Thai-first Current Shop Status section above or near the current masseuse performance area. The section must show one row per visible Today Staff member, grouped by current operational state rather than Today Staff queue order.

Each staff row must show:
- staff name;
- current state: available, busy, or affected by an upcoming booking buffer;
- booked/start time when the staff member is currently serving a customer;
- massage end time when the staff member is currently serving a customer;
- free-again time after the 15-minute buffer when the staff member is currently serving a customer;
- remaining busy duration in plain Thai-friendly text;
- completed massage count for the current Bangkok business day;
- next booking time when one exists;
- usable time before the next booking after the 15-minute buffer.

### DSS-003: Server-Authoritative Status Contract

The page must not infer operational status from scattered frontend state. A backend endpoint must provide a single server-authoritative status payload for the current business day. The payload should combine:
- Today Staff order and names;
- active transaction windows or existing busy status source;
- completed massage counts;
- upcoming requested-staff bookings;
- the 15-minute buffer rule.

The Daily Summary UI must not present Today Staff queue position as the status-row anchor. Queue order belongs to the Today Staff page; Daily Summary status rows are grouped by actual current state.

The endpoint may be implemented under `backend/routes/staff.js` or another existing route module, but it must be documented and exposed through `web-app/api.js`.

### DSS-004: Busy State Derivation

Busy state must be derived from reliable business data. The preferred source is the current business day's active transactions where the current time falls before the transaction end time. Existing legacy `staff_roster.busy_until` may be used only if it remains consistent with Today Staff rows and is documented as part of the endpoint contract. The implementation must not create duplicate busy ledger state.

### DSS-005: Massage Counts

Massage counts must use the current Bangkok business day and active completed transaction rows, matching the Today Staff count behavior. Edited/superseded transactions must not inflate counts.

### DSS-006: Booking Awareness

If a visible Today Staff member has a future active requested-staff booking, the status payload and UI must show the next booking time and whether a walk-in massage can safely finish before `booking_start - 15 minutes`.

### DSS-007: Refresh Behavior

The status section must refresh with the existing Daily Summary refresh loop. It must not require a full page reload to clear expired busy state, show a newly completed transaction count, or display a newly created booking.

### DSS-008: Thai-First Receptionist UI

Primary labels in the new section must be Thai-first and concise. English may appear as secondary helper text where useful, but the row must remain scannable on mobile/iPad widths.

### DSS-009: Compact Drill-Down Daily Summary

The Daily Summary top financial cards must be compact enough that Current Shop Status is visible quickly on mobile/iPad widths. The cards must be obvious tap targets and should reveal their matching detail inline:
- revenue reveals payment method breakdown and transaction details;
- fees reveals masseuse fee breakdown;
- expenses reveals expense details;
- net profit reveals revenue minus fees minus expenses.

The lower page must not duplicate the same payment and fee breakdowns as separate always-open sections. Section titles must be Thai-first with English as smaller secondary helper text.

## 4. Acceptance Criteria

- AC-DSS-001: Daily Summary still shows all existing financial, payment, transaction, expense, and end-day sections after the status work.
- AC-DSS-002: Daily Summary shows every visible Today Staff member grouped by operational state: busy first, booking-constrained rows next, free rows last.
- AC-DSS-003: A staff member whose active transaction has not reached end time appears busy with visible booked/start time, massage end time, free-again time after the 15-minute buffer, and remaining duration.
- AC-DSS-004: A staff member without an active transaction and without a blocking booking buffer appears available/free without queue-order language.
- AC-DSS-005: Each staff row shows today's completed massage count for the current Bangkok business day.
- AC-DSS-006: A staff member with a future requested booking shows the next booking time and the usable time before the 15-minute buffer.
- AC-DSS-007: The frontend uses one documented API method for current shop status instead of reconstructing the full status model locally.
- AC-DSS-008: `summary.html` and `summary.ejs` remain mirrored.
- AC-DSS-009: Co-located docs for every touched functional file are updated.
- AC-DSS-010: Focused automated tests cover the status API contract and Daily Summary DOM contract.
- AC-DSS-011: Browser verification confirms the new Daily Summary section is readable at the active mobile/iPad viewport.
- AC-DSS-012: Top financial cards are compact, Thai-first, clickable, and reveal the appropriate breakdown inline.
- AC-DSS-013: Payment breakdown and masseuse performance are not duplicated as large always-open lower sections.
- AC-DSS-014: Current Shop Status rows are compact enough for multiple rows to be visible without excessive scrolling.
- AC-DSS-015: Masseuse fee totals render numeric baht values, never `฿NaN`.
- AC-DSS-016: Daily Summary current-status rows do not show Today Staff queue numbers or `คิวถัดไป` labels.
- AC-DSS-017: The finance summary has a Thai-first collapsible section header so the receptionist can hide finances and move Current Shop Status upward.
- AC-DSS-018: Current Shop Status shows a compact summary below its header with free-now count, the next free staff member/time, and the next three free staff entries.
- AC-DSS-019: The Daily Summary navigation link to the Today Staff page is labeled as Today's Staff Queue, not a generic staff roster.
- AC-DSS-020: The compact `สามคนถัดไป` summary must not contradict the New Customer next-masseuse dropdown. If the summary is intended to show walk-in assignment order, it must use the same `walk_in_priority` / workload / Today Staff tie-break contract as New Customer. If it is intended to show alphabetical free-now status, the Thai label must be changed so reception does not read it as queue order.

## 5. Data Contract Draft

`GET /api/staff/current-status`

Response:

```json
{
  "business_day": "2026-07-13",
  "generated_at": "2026-07-13T12:34:00+07:00",
  "buffer_minutes": 15,
  "staff": [
    {
      "staff_id": 1,
      "position": 1,
      "masseuse_name": "May เมย์",
      "queue_status": "Next",
      "current_state": "busy",
      "busy_started": "13:30",
      "busy_started_iso": "2026-07-13T13:30:00+07:00",
      "busy_until": "14:30",
      "busy_until_iso": "2026-07-13T14:30:00+07:00",
      "free_at": "14:45",
      "free_at_iso": "2026-07-13T14:45:00+07:00",
      "remaining_minutes": 42,
      "today_massages": 3,
      "next_booking": {
        "booking_id": "BK-...",
        "scheduled_start": "2026-07-13T16:00:00+07:00",
        "scheduled_end": "2026-07-13T17:00:00+07:00"
      },
      "usable_minutes_before_booking": 45
    }
  ]
}
```

`current_state` values:
- `available`: visible Today Staff member available for a walk-in;
- `busy`: active massage in progress;
- `booking_buffer`: not currently busy, but the next booking buffer prevents a normal walk-in assignment.

## 6. Non-Goals

- Do not create a separate shop-status page in this pass.
- Do not automatically reorder the Today Staff queue.
- Do not change booking credit accounting.
- Do not change financial summary totals.
- Do not mutate production data or introduce any database migration beyond additive local schema support if the already-implemented booking schema requires it.

## 7. Open Questions

1. Should `booking_buffer` remain a hard warning state for normal 60-minute walk-ins, or should a later pass add shorter-service exceptions when usable minutes are positive?
2. If the operator wants another Daily Summary iteration, should Current Shop Status move above finances by default, or is the implemented finance collapse enough?
3. Should `สามคนถัดไป` mean the next three walk-in assignment candidates using the New Customer dropdown priority, or should it be renamed to clarify that it is only the first three currently free rows from the Daily Summary status sort?
