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
- **Purpose:** Advances the staff queue to next available member
- **Parameters:** `currentMasseuse`: Current queue leader (string, required)
- **Returns:** JSON with queue advancement details
- **Logic:** 
  1. Clears current "Next" status
  2. Finds next available staff member
  3. Sets them as "Next" in queue
  4. Handles circular queue logic

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

#### `router.post('/today/reset-check')`
- **Purpose:** Runs the 2:00 a.m. Bangkok visible-list reset/recovery check.
- **Returns:** `{ reset, business_day, reset_business_day? }`.
- **Logic:** If the previous business day is still open, marks its active visible rows removed with `scheduled_reset`, resets that `business_days` row, ensures the current business day exists, and preserves Today Staff history.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)
- **Calling Modules/Services:** Frontend API client (`web-app/api.js`)
- **Input Data Contracts / Schemas:** 
  - Staff busy requests: `{masseuseName: string, endTime: string}`
  - Roster updates: `{masseuse_name: string, status: string, busy_until: string}`
  - Queue operations: `{currentMasseuse: string}`

### Downstream Dependencies (Outputs)
- **Called Modules/Services:** Database operations via `../models/database.js`
- **Output Data Contracts / Schemas:** 
  - Staff roster / Today Staff: `[{id, position, masseuse_name, status, busy_until, today_massages, last_updated, staff_id, business_day}]`
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
