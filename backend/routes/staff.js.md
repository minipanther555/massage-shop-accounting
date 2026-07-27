# `backend/routes/staff.js.md`

## 1. Header Section

**Overall Purpose:** This module provides the staff and Today Staff planning API for the Massage Shop POS system. It handles visible Today Staff operations, previous-business-day helper data, day-off-today planning, status management, busy time tracking, scheduled/reset recovery, and audit-safe planning logs. Today Staff planning actions are deliberately separate from transaction ledger rows, commission totals, and payday totals.

**End-to-End Data Flow:** When the receptionist opens the Today Staff page, the frontend calls `/api/staff/today/state` and `/api/staff/today/helper`. The route determines the Bangkok business day, reads active All Staff, sums previous-business-day transaction commission by staff, reads current planning state, and returns helper rows plus visible Today Staff rows. Add/day-off/restore/clear actions write `today_staff`, `today_staff_planning`, and `today_staff_audit_log` only. Transaction ledger and payroll tables are read for helper/counts but are not mutated by Today Staff planning routes.

## 2. Module API & Logic Breakdown

### Core Status Management Functions

#### `resetExpiredBusyStatuses()`
- **Purpose:** Automatically clears expired busy statuses for staff members
- **Returns:** Promise<number> - count of reset statuses
- **Logic:** 
  1. Gets current time in HH:MM format
  2. Queries all staff with busy status
  3. Compares `busy_until` time with current time
  4. Resets expired statuses to NULL
  5. Updates database with cleared status and timestamp

#### `router.get('/roster')`
- **Purpose:** Retrieves current staff roster with automatic status clearing
- **Returns:** JSON array of staff members with current status
- **Logic:** 
  1. Calls `resetExpiredBusyStatuses()` to clear expired statuses
  2. Fetches updated roster from database
  3. Calculates today's completed massage counts from `ACTIVE` `transactions.business_day` rows for each staff member
  4. Returns complete roster data

#### `router.get('/current-status')`
- **Purpose:** Returns the Daily Summary current shop status snapshot: who is busy, when they started, when the massage ends, when they are free after the booking buffer, which staff have upcoming requested bookings, which staff are free, and each staff member's active massage count for the current Bangkok business day.
- **Parameters:**
  - `at`: Optional ISO timestamp used by tests and diagnostics to make the status calculation deterministic. Production callers omit this and the server uses `new Date()`.
- **Returns:** `{ business_day, generated_at, buffer_minutes, staff }`, where each staff row includes `staff_id`, `today_staff_id`, `position`, `masseuse_name`, `queue_status`, `current_state`, `busy_started`, `busy_started_iso`, `busy_until`, `busy_until_iso`, `free_at`, `free_at_iso`, `remaining_minutes`, `today_massages`, `assigned_today`, `next_booking`, `usable_minutes_before_booking`, and `walk_in_priority`.
- **Raises / Throws:** Returns HTTP 400 with `{error: "Invalid at timestamp"}` when the optional diagnostic `at` value cannot be parsed as a date; returns HTTP 500 only for unexpected database or route failures.
- **Logic:**
  1. Computes the current Bangkok business day with `getCurrentBusinessDay(req)`.
  2. Reads active visible Today Staff rows with `getActiveTodayStaff()`.
  3. Reads current-day `ACTIVE` transactions and treats rows whose canonical `end_datetime` is still in the future as busy windows. If a legacy row has no canonical datetime fields, it falls back to `timestamp + duration`.
  4. Reads `BOOKED` reservations whose scheduled end is still in the future, including reservations already in progress, and attaches the next booking per staff member.
  5. Reads every unreleased `BOOKED` requested-staff booking for the current Bangkok business day, including late bookings that reception has not marked `NO_SHOW`; historical bookings cannot constrain today. Staff with less than one 60-minute service slot before that booking, or with a late booking, are `booking_buffer`, and all remaining rows are `available`.
  6. Sorts the snapshot by operational state: busy first, booking-constrained rows next, free rows last.
  7. Returns the snapshot without mutating staff, transaction, booking, planning, commission, or payday tables.

#### `router.post('/set-busy')`
- **Purpose:** Sets a staff member as busy until specified end time
- **Parameters:** 
  - `masseuseName`: Staff member name (string, required)
  - `endTime`: End time for busy status (string, required)
- **Returns:** JSON confirmation with updated status
- **Logic:** 
  1. Validates staff member exists in roster
  2. Sets status to "Busy until [endTime]"
  3. Updates `busy_until` field in database
  4. Returns confirmation with new status

### Staff Roster Management

#### `router.put('/roster/:position')`
- **Purpose:** Updates or creates staff roster entries
- **Parameters:** 
  - `position`: Roster position (number, required)
  - `masseuse_name`, `status`, `busy_until`, `today_massages` (optional)
- **Returns:** JSON with updated/created staff record
- **Logic:** 
  1. Validates status format (only "Next" or "Busy until [time]" allowed)
  2. Updates existing record or creates new one
  3. Sets `last_updated` timestamp

#### `router.delete('/roster/:position')`
- **Purpose:** Removes staff member from roster and re-indexes
- **Parameters:** `position`: Roster position to remove (number, required)
- **Returns:** JSON confirmation message
- **Logic:** 
  1. Deletes staff member at specified position
  2. Re-indexes remaining staff members
  3. Maintains sequential position numbering

### Queue Management

#### `router.post('/serve-next')`
- **Purpose:** Automatically assigns next available staff member
- **Returns:** JSON with assigned masseuse and position
- **Logic:** 
  1. Finds staff with "Next" status
  2. Sets current busy staff to "Break"
  3. Sets next staff to "Busy"
  4. Returns assignment confirmation

#### `router.post('/advance-queue')`
- **Purpose:** Advances the active Today Staff queue after the current next-in-line staff member receives a normal walk-in customer.
- **Parameters:** `currentMasseuse`: Current queue leader (string, required)
- **Returns:** JSON with queue advancement details, including `previousNext`, `newNext`, and the updated `today_staff` rows when the queue advances.
- **Logic:**
  1. Resolves the current Bangkok business day and reads active `today_staff` rows in position order.
  2. Treats the first active Today Staff row as the next queue member. `queue_status = "Next"` is not required because the visible Today Staff order is authoritative.
  3. If `currentMasseuse` does not match that first row, returns `Manual selection - Today Staff queue not advanced` and leaves positions unchanged. This preserves requested-staff booking/manual selection semantics.
  4. If the selected staff is the first row, retains the original Today Staff positions. Completed massage counts and booking eligibility determine the next walk-in; this endpoint is retained as a refresh-compatible no-op for the existing submit flow.
  5. Returns the unchanged Today Staff list so the New Customer page can re-render the dropdown before clearing the form.

### Performance and Analytics

#### `router.get('/performance/today')`
- **Purpose:** Retrieves today's staff performance metrics
- **Returns:** JSON array with massage counts, fees, and revenue per staff
- **Logic:** 
  1. Queries transactions table for today's data
  2. Groups by staff member
  3. Calculates totals and counts
  4. Returns performance summary

#### `router.get('/allstaff')`
- **Purpose:** Retrieves all active staff names for dropdown population
- **Returns:** JSON array of staff names
- **Logic:** 
  1. Queries master staff table
  2. Filters for active staff only
  3. Returns sorted name list

### Today Staff Business-Day Planning

#### `router.get('/today/helper')`
- **Purpose:** Returns every active All Staff member with previous-business-day commission, day-off-yesterday flag, current planning status, and add eligibility.
- **Returns:** `{ business_day, previous_business_day, rows }`
- **Logic:**
  1. Computes current and previous Bangkok business day.
  2. Reads active `staff` rows.
  3. Left-joins previous-business-day `transactions.business_day` commission.
  4. Left-joins current `today_staff_planning` and active `today_staff`.
  5. Sorts by commission ascending and display name.

#### `router.get('/today/state')`
- **Purpose:** Returns active Today Staff rows, planning rows, visible day-off-today rows, and dropdown-eligible staff for the current business day.
- **Returns:** `{ business_day, today_staff, planning, day_off_today, dropdown_staff }`
- **Logic:** Reads `today_staff` where `removed_at IS NULL`, including `today_massages` from completed `ACTIVE` transactions on the current Bangkok business day, `today_staff_planning`, and active All Staff not already added.

#### `router.post('/today/add')`
- **Purpose:** Adds an All Staff member to the visible Today Staff list for the current business day.
- **Parameters:** `staff_id` or `display_name` / `masseuse_name`.
- **Returns:** `{ business_day, today_staff }`.
- **Logic:** Prevents duplicate active rows with the partial unique index and explicit existence check, sets planning status to `added_to_today_staff`, clears any day-off-today state by replacement, and logs `add_to_today_staff`.

#### `router.post('/today/day-off')`
- **Purpose:** Marks an All Staff member as `day_off_today`.
- **Parameters:** `staff_id` or display name.
- **Returns:** Planning status confirmation.
- **Logic:** Removes any active visible Today Staff row for that staff member, compacts positions, upserts planning status, and logs `mark_day_off_today`.

#### `router.post('/today/restore')`
- **Purpose:** Restores a day-off-today staff member to available-to-add.
- **Parameters:** `staff_id` or display name.
- **Returns:** Planning status confirmation.
- **Logic:** Upserts planning status `available_to_add` and logs `restore_day_off_today`.

#### `router.put('/today/reorder')`
- **Purpose:** Reorders active Today Staff rows by staff ID.
- **Parameters:** `{ ordered_staff_ids: number[] }`.
- **Returns:** Updated Today Staff list.
- **Logic:** Updates only active `today_staff.position` values and logs `reorder_today_staff`.

#### Walk-in priority
- `walk_in_priority` is calculated from the active Today Staff rows after status construction.
- Eligible means `current_state = 'available'`; active massages and unreleased near-term bookings remain ineligible.
- The primary sort is `assigned_today` (completed active massages plus an unreleased assigned booking), and ties use the displayed Today Staff `position`, preserving the original day-start order without rotating the list.

#### `router.post('/today/reset-check')`
- **Purpose:** Runs the 2:00 a.m. Bangkok visible-list reset/recovery check.
- **Returns:** `{ reset, business_day, reset_business_day? }`.
- **Logic:** If the previous business day is still open, marks its active visible rows removed with `scheduled_reset`, changes remaining `BOOKED` reservations from that day to `NO_SHOW`, resets that `business_days` row, ensures the current business day exists, and preserves Today Staff history. Reservations never roll over into the next business day.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)
- **Calling Modules/Services:** Frontend API client (`web-app/api.js`)
- **Input Data Contracts / Schemas:** 
  - Staff busy requests: `{masseuseName: string, endTime: string}`
  - Roster updates: `{masseuse_name: string, status: string, busy_until: string}`
  - Queue operations: `{currentMasseuse: string}`
  - Current status query: optional `{ at: ISO-8601 string }`

### Downstream Dependencies (Outputs)
- **Called Modules/Services:** Database operations via `../models/database.js`
- **Output Data Contracts / Schemas:** 
  - Staff roster / Today Staff: `[{id, position, masseuse_name, status, busy_until, today_massages, last_updated, staff_id, business_day}]`
  - Current status: `{ business_day: string, generated_at: string, buffer_minutes: number, staff: [{ staff_id: number, today_staff_id: number, position: number, masseuse_name: string, queue_status: string|null, current_state: 'busy'|'available'|'booking_buffer', busy_started: string|null, busy_started_iso: string|null, busy_until: string|null, busy_until_iso: string|null, free_at: string|null, free_at_iso: string|null, remaining_minutes: number, today_massages: number, assigned_today: number, next_booking: object|null, usable_minutes_before_booking: number|null, walk_in_priority: boolean }] }`
  - Helper rows: `[{staff_id, display_name, previous_business_day, previous_day_commission, was_day_off_yesterday, today_planning_status, can_add_to_today_staff}]`
  - Performance data: `[{masseuse_name, massage_count, total_fees, total_revenue}]`
  - Status confirmations: `{message: string, masseuse: string, busyUntil: string, newStatus: string}`

## 4. Bug & Resolution History

### Bug Summary
**CRITICAL BUG FIXED (2024-12-19):** The `resetExpiredBusyStatuses()` function had a string comparison bug that prevented staff busy statuses from expiring, causing scheduling conflicts and perpetually busy staff.

### Validated Hypothesis
**Root Cause:** The function used string comparison (`normalizedBusyTime < currentTime`) instead of numeric time comparison, causing times like "15:30" to never be considered "less than" "09:00" alphabetically.

### Invalidated Hypotheses
- Initial concerns about time format parsing were resolved through robust format handling
- Worries about database performance were unfounded due to efficient queries
- Frontend auto-refresh frequency was not the issue (was already calling roster endpoint every 30 seconds)

### Resolution
**FIX IMPLEMENTED:** Replaced string comparison with numeric time comparison using a new `parseTimeToMinutes()` helper function. The fix:
1. Converts HH:MM time strings to minutes since midnight
2. Uses numeric comparison (`busyMinutes <= currentMinutes`) for accurate expiration logic
3. Maintains all existing functionality while fixing the core bug
4. Includes enhanced logging for debugging and monitoring

**Status:** Production-ready fix deployed. Staff busy statuses now correctly expire when their end time passes, resolving the original scheduling bug.

### Bug Summary: Daily Summary Had No Current Shop Status Snapshot (2026-07-13)
The Daily Summary page showed financial and recent activity sections, but it did not answer operational questions like who is currently busy, when they started, when the massage ends, when they are free after buffer, each staff member's daily massage count, or whether a requested booking limits walk-in availability.

### Validated Hypothesis
The backend already had the authoritative data: Today Staff order in `today_staff`, current work in `transactions`, and future requested-staff reservations in `bookings`. A read-only status endpoint could combine those sources without adding a separate page or mutating planning/accounting data.

### Invalidated Hypotheses
- The New Customer page's recent transactions list was enough for shop status.
- The Today Staff page alone should own the overall status view.
- A new table or schema migration was required.

### Resolution
Added `GET /api/staff/current-status` as a read-only snapshot endpoint and protected it with OTDD coverage for busy, free-after-buffer, booking-buffer, count, booking, status ordering, and indexed query-plan behavior.

### Bug Summary: Current Status Used Creation Timestamp Instead of Canonical Massage Window (2026-07-14)
Current Shop Status could show a staff member free too early because it derived busy end time from `transactions.timestamp + duration`. The New Customer page can submit canonical `start_datetime` and `end_datetime` based on the actual service start/end selection.

### Validated Hypothesis
`backend/routes/transactions.js` accepted `start_datetime` and `end_datetime`, but the `transactions` table did not persist them and `backend/routes/staff.js#getActiveTransactionByStaff()` could not read them.

### Invalidated Hypotheses
- The issue could be solved by the legacy `staff_roster.busy_until` field.
- Daily Summary should recompute the browser-side timing model.
- Existing legacy transactions should be rejected if they lack canonical datetimes.

### Resolution
The transaction schema now includes additive `start_datetime` and `end_datetime` columns, transaction creation persists them, and Current Shop Status prefers those canonical fields with a documented legacy fallback to `timestamp + duration`.

### Bug Summary: Walk-In Submit Advanced Legacy Queue Instead of Today Staff (2026-07-13)
The New Customer page auto-selected the first active Today Staff row, but submitting that walk-in did not advance the dropdown to the next staff member. The page stayed on the same staff after submit.

### Validated Hypothesis
The dropdown was populated from `GET /api/staff/roster`, which reads `today_staff`, while `POST /api/staff/advance-queue` still mutated the legacy `staff_roster` table and its `"Next"` status. The submit path therefore changed a queue the page no longer rendered.

### Invalidated Hypotheses
- The form reset alone caused the stale staff selection.
- The browser dropdown failed to repaint despite receiving updated data.
- Booking/manual selection behavior should move the queue.

### Resolution
`POST /api/staff/advance-queue` is now a compatibility refresh hook that keeps the original `today_staff.position` order intact. Walk-in priority is calculated from current-day assigned workload first, then the stable displayed Today Staff position as the tie-break. Manual non-next selections do not rewrite the day-start queue. `tests/integration/walkin.queue-refresh.integration.test.js` locks the no-rotation behavior, stale-booking exclusion, and stable-position tie-break.

### Bug Summary: Stale Bookings and Row-ID Tie-Breaks Corrupted Walk-In Priority (2026-07-15)

New Customer and Daily Summary could mark a staff member unavailable because `GET /api/staff/current-status` read every future `BOOKED` requested-staff row without scoping to the current Bangkok business day. At the same time, the post-submit queue advancement rotated `today_staff.position`, and a follow-up tie-break used database row identity instead of the original visible day-start order. The combined behavior made the auto-selected walk-in staff appear random after refreshes, old bookings, or equal workload ties.

#### Validated Hypothesis

The status endpoint and queue endpoint were applying different concepts of "next": current status used unscoped booking rows, the transaction page rendered from status plus roster data, and `advance-queue` mutated the ordering table even though the confirmed rule is workload count first and original Today Staff order for ties.

#### Invalidated Hypotheses

- The browser repaint alone caused the wrong dropdown value.
- A single booking-buffer display bug explained the full ordering failure.
- The correct tie-break was insertion row ID or the latest rotated queue position.

#### Resolution

`GET /api/staff/current-status` now reads unreleased requested-staff bookings only for the active business day, exposes `assigned_today` and `walk_in_priority`, and uses stable Today Staff `position` as the workload tie-break. `resetIfStale()` marks prior-business-day `BOOKED` reservations `NO_SHOW` so they cannot roll into the next day. `POST /api/staff/advance-queue` no longer rotates Today Staff order; it returns the retained ordered roster while workload/status determine the next walk-in. The transaction page consumes `walk_in_priority`, disables busy or booking-constrained staff for Walk-in mode, and shows an "everyone busy" message with the earliest free time when no one is eligible.

### Massage count excludes duration upgrades (2026-07-23)
The `today_massages` projection in `getActiveTodayStaff()` now applies `countsAsMassage('t')` from `backend/services/add-on-sql.js`. Extending one customer from 60 to 90 minutes is one massage, not two, so a `DURATION_UPGRADE` add-on does not increment the count; an `ADDITIONAL_SERVICE` does. This figure feeds both the Daily Summary `นวดวันนี้` display and the walk-in workload ranking, so the rule directly affects who is offered the next customer.

`getActiveTransactionByStaff()` required **no change** for Paid Time Extension: it already keeps the `ACTIVE` row with the latest end time per staff member, so an add-on extends the occupied window automatically and a cancelled add-on releases it. This was verified by test rather than rebuilt.
