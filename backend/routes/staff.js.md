# `backend/routes/staff.js.md`

## 1. Header Section

**Overall Purpose:** This module provides the complete staff management API for the Massage Shop POS system. It handles staff roster operations, status management, busy time tracking, and automatic status clearing. The module is responsible for maintaining real-time staff availability and ensuring that expired busy statuses are automatically cleared to prevent scheduling conflicts.

**End-to-End Data Flow:** When a staff member is assigned to a service, the frontend calls the `set-busy` endpoint to mark them as busy until the service end time. The backend stores this information in the `staff_roster` table with a `busy_until` timestamp. When the roster is accessed via `GET /api/staff/roster`, the `resetExpiredBusyStatuses()` function automatically clears any expired busy statuses, ensuring staff appear available when they should be free.

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
  3. Calculates today's massage counts for each staff member
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
  - Staff roster: `[{id, position, masseuse_name, status, busy_until, today_massages, last_updated}]`
  - Performance data: `[{masseuse_name, massage_count, total_fees, total_revenue}]`
  - Status confirmations: `{message: string, masseuse: string, busyUntil: string, newStatus: string}`

## 4. Bug & Resolution History

### Bug Summary
No major bugs have been reported in this module. The automatic status clearing mechanism works correctly.

### Validated Hypothesis
The `resetExpiredBusyStatuses()` function successfully clears expired busy statuses when the roster endpoint is accessed.

### Invalidated Hypotheses
- Initial concerns about time format parsing were resolved through robust format handling
- Worries about database performance were unfounded due to efficient queries

### Resolution
The module provides reliable staff status management with automatic cleanup of expired busy statuses. The scheduling bug identified in the frontend is not caused by this backend module.
