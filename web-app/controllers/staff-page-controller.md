# Staff Page Controller Module Specification

## Overall Purpose
The staff page controller manages the Today Staff workflow, including previous-business-day helper rows, dropdown add, add from helper, day-off-today planning, persistent restore, visible-list clearing, and UI state consistency. It implements the "Action → API → re-fetch → render" discipline for all Today Staff operations.

## End-to-End Data Flow
User opens the Today Staff page → controller fetches `/api/staff/today/state` and `/api/staff/today/helper` → renders the Thai previous-day earnings helper, day-off-today section, dropdown, and visible Today Staff list → user adds from helper or dropdown → controller writes to `/api/staff/today/add` → re-fetches state/helper → UI disables or mutes already-added helper rows and removes duplicates from dropdown. If the user marks `หยุดวันนี้`, the controller writes to `/api/staff/today/day-off`, moves the person to the persistent day-off-today section, and can restore them with `/api/staff/today/restore`. Reorder and `คิวถัดไป` actions operate on the canonical `today_staff` order by sending ordered staff ids to `/api/staff/today/reorder`; they do not swap legacy `staff_roster` rows.

## Module API & Logic Breakdown

### Core Functions

#### `renderRoster(roster)`
**Purpose**: Renders the staff roster with visual labels and proper styling
**Parameters**: 
- `roster` (Array): Array of staff objects with position, masseuse_name, status, etc.
**Returns**: void
**Raises**: Error if DOM anchors missing
**Usage & Logic Notes**: 
- Uses visual index (i+1) for labels, not database position
- Sets render beacon for test harness synchronization
- Handles empty roster state by showing #empty-roster element
- Renders large position, staff name, next-in-line control, today's massage count, drag hint, order buttons, and remove button in Thai.
- Formats today's completed massage count as `นวดวันนี้ {count} ครั้ง` using the backend-provided `today_massages` value.
- Treats the first returned row as `คิวถัดไป` and persists queue changes through the Today Staff reorder endpoint.
- Escapes staff names, status text, and busy-until text before inserting row markup with `innerHTML`.

#### `renderDropdown(allStaff, roster)`
**Purpose**: Populates dropdown with available staff (All Staff - Today's Roster)
**Parameters**:
- `allStaff` (Array): All available staff names
- `roster` (Array): Current roster to exclude from dropdown
**Returns**: void
**Usage & Logic Notes**:
- Implements set difference logic: AllStaff - TodayRoster
- Sets dropdown beacon for test harness synchronization
- Uses projector for consistent name extraction
- Uses a Thai placeholder (`แตะเพื่อเลือกพนักงาน...`) after every render so controller initialization does not regress the static page copy.

#### `renderHelperRows(rows)`
**Purpose**: Renders the Thai-only previous-business-day earnings helper list
**Parameters**:
- `rows` (Array): Helper rows with `staff_id`, `display_name`, `previous_day_commission`, `was_day_off_yesterday`, `today_planning_status`, and `can_add_to_today_staff`
**Returns**: void
**Usage & Logic Notes**:
- Renders backend-provided sorted order
- Shows `฿0` and `หยุดเมื่อวาน` for zero commission rows
- Adds per-row `เพิ่ม` and `หยุดวันนี้` controls
- Does not render date/time ranges

#### `renderDayOffRows(rows)`
**Purpose**: Renders the persistent `หยุดวันนี้` section
**Parameters**:
- `rows` (Array): Planning rows marked `day_off_today`
**Returns**: void
**Usage & Logic Notes**:
- Shows a large restore action instead of a modal or toast-only undo
- Respects the helper-collapse state so refreshes do not reopen the day-off section when the user has collapsed helpers.

#### `applyHelperCollapseState()`
**Purpose**: Applies the local helper-collapse state to the page shell.
**Parameters**: None
**Returns**: void
**Usage & Logic Notes**:
- Toggles `body.helpers-collapsed` from the `todayStaffHelperSectionsCollapsed` localStorage flag.
- Does not mutate roster, planning, or helper API data.

#### `setHelperSectionsCollapsed(isCollapsed)`
**Purpose**: Persists and applies the helper-section collapsed state.
**Parameters**:
- `isCollapsed` (boolean): Whether both helper sections should be hidden.
**Returns**: void
**Usage & Logic Notes**:
- Stores only a UI preference in localStorage.
- Collapses both the previous-day earnings helper and `หยุดวันนี้` helper through CSS.

#### `bindHelperCollapseControls()`
**Purpose**: Wires the collapse and restore controls.
**Parameters**: None
**Returns**: void
**Usage & Logic Notes**:
- `#collapse-helper-sections-btn` hides both helper sections.
- `#show-helper-sections-btn` restores both helper sections and scrolls back to the helper header.

#### `refreshTodayStaffPage()`
**Purpose**: Refreshes Today Staff state and helper data from backend source of truth
**Returns**: Promise<void>
**Usage & Logic Notes**:
- If helper loading fails, shows a clear Thai error while preserving dropdown fallback through the basic state/all-staff path

#### `reorderVisibleRoster(fromPosition, toIndex)`
**Purpose**: Persists visible Today Staff order changes through the canonical Today Staff endpoint.
**Parameters**:
- `fromPosition` (number): Current backend position of the row being moved.
- `toIndex` (number): Zero-based destination index in the visible roster.
**Returns**: Promise<void>
**Raises**: Error if current roster rows do not include staff ids needed by `/api/staff/today/reorder`.
**Usage & Logic Notes**:
- Builds ordered staff ids from `CURRENT_ROSTER`, calls `api.reorderTodayStaff(orderedStaffIds)`, stores the returned `today_staff`, and re-renders.
- This is the only write path for `setNextInLine`, `moveUp`, and `moveDown`; those controls must not call legacy `api.updateStaff()`.

#### `setNextInLine(position)`
**Purpose**: Moves the selected visible staff row to the first Today Staff position.
**Parameters**:
- `position` (number): Backend position of the selected row.
**Returns**: Promise<void>
**Usage & Logic Notes**:
- Calls `reorderVisibleRoster(position, 0)`.
- The row at index 0 is rendered with the disabled `คิวถัดไป` label.

#### `moveUp(position)` / `moveDown(position)`
**Purpose**: Moves a visible Today Staff row one slot up or down.
**Parameters**:
- `position` (number): Backend position of the selected row.
**Returns**: Promise<void>
**Usage & Logic Notes**:
- Locates the row inside `CURRENT_ROSTER` and delegates persistence to `reorderVisibleRoster()`.
- Uses `/api/staff/today/reorder` via `api.reorderTodayStaff()` rather than swapping legacy `staff_roster` positions.

#### `staffControllerInit(apiClient)`
**Purpose**: Initializes the staff controller with API client
**Parameters**:
- `apiClient` (Object): API client instance
**Returns**: Promise<void>
**Raises**: Error if initialization fails
**Usage & Logic Notes**:
- Sets up event handlers for Add and Clear All buttons
- Sets up event handlers for the Add New Staff modal
- Fetches initial roster and staff data
- Implements first empty slot algorithm for position calculation

#### `openAddStaffModal()`
**Purpose**: Opens the roster page's Add New Staff modal and focuses the name field
**Parameters**: None
**Returns**: void
**Usage & Logic Notes**:
- Keeps the missing-staff flow on the daily roster page.
- Resets stale form state every time the modal opens.

#### `closeAddStaffModal()`
**Purpose**: Closes the roster page's Add New Staff modal
**Parameters**: None
**Returns**: void

#### `refreshMasterStaffDropdown(preselectName)`
**Purpose**: Refreshes the master staff list after creating a staff member and updates the available roster dropdown
**Parameters**:
- `preselectName` (string): Optional staff name to select after refresh
**Returns**: Promise<void>
**Usage & Logic Notes**:
- Calls `GET /api/staff/allstaff`.
- Filters out staff already on today's roster.
- Preselects the new staff name when it is available, so the user can click Add to Roster immediately.

### Event Handlers

#### Add Button Handler
**Purpose**: Handles adding staff to roster
**Logic**:
1. Fetches current roster state (prevents stale state bug)
2. Calculates first empty slot using algorithm
3. Calls PUT /api/staff/roster/:position
4. Re-fetches roster and re-renders
5. Updates dropdown to remove added staff

#### Add New Staff Modal Submit Handler
**Purpose**: Creates a missing master staff member from the roster page
**Logic**:
1. Validates that a staff name was entered
2. Calls POST /api/admin/staff through `api.addStaff({ name })`
3. Closes the modal
4. Re-fetches all master staff
5. Re-renders the available dropdown and preselects the created staff member

#### Clear All Button Handler  
**Purpose**: Handles clearing entire roster
**Logic**:
1. Opens the in-page `#clear-roster-modal`
2. Waits for explicit confirmation from `#confirm-clear-roster-btn`
3. Calls DELETE /api/staff/roster through `api.clearRoster()`
4. Sets local roster state to empty and re-renders
5. Updates dropdown to show all master staff names
6. Closes the confirmation modal

#### Helper Collapse Handlers
**Purpose**: Moves the daily roster workflow higher on the page after the receptionist is done using helper lists.
**Logic**:
1. Collapse button sets `todayStaffHelperSectionsCollapsed=1`.
2. Controller applies `body.helpers-collapsed`.
3. CSS hides `.today-helper-section` and `#day-off-section`.
4. Restore button removes the flag and shows helpers again.
5. Today Staff roster rows remain rendered throughout.

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**: 
- web-app/staff.html (initialization)
- Browser events (button clicks, dropdown changes)
- Browser modal events (open, close, submit)

**Input Data Contracts**:
- API responses: `{position: number, masseuse_name: string, status: string, today_massages: number, busy_until: string}`
- Staff data: `Array<string>` (staff names)
- New staff form data: `{ name: string }`

### Downstream Dependencies (Outputs)
**Called Modules/Services**:
- api.js (getTodayStaffState, getTodayStaffHelper, addTodayStaff, markTodayStaffDayOff, restoreTodayStaffDayOff, reorderTodayStaff, clearRoster, getAllStaff)
- api.js (addStaff for POST /api/admin/staff)
- DOM manipulation (renderRoster, renderDropdown)

**Output Data Contracts**:
- DOM updates: Roster list with visual labels 1...n
- Network requests: POST /api/staff/today/add, PATCH /api/staff/today/reorder, PUT /api/staff/today/day-off, PUT /api/staff/today/restore, DELETE /api/staff/roster, GET /api/staff/roster
- Network requests: POST /api/admin/staff, GET /api/staff/allstaff

## Bug & Resolution History

### Bug Summary: Add Overwrites + Non-Contiguous Labels
**Validated Hypothesis**: Stale state bug - Add button handler used `roster` variable from initialization instead of current roster state, causing second add to overwrite first entry. Label rendering used database position instead of visual index.

**Invalidated Hypotheses**:
- Backend upsert behavior (server was working correctly)
- Network timing issues (requests were successful)
- CSS rendering problems (unrelated to core logic)

**Resolution**: 
1. Fixed stale state by fetching current roster before position calculation
2. Implemented first empty slot algorithm for proper position calculation  
3. Changed label rendering to use visual index (i+1) instead of database position
4. Added beacons for test harness synchronization

### Bug Summary: Missing Clear All Functionality
**Validated Hypothesis**: No event handler bound to clear-roster-btn
**Resolution**: Added complete Clear All button handler with confirmation, API call, and re-render

### Bug Summary: Dropdown Not Filtering
**Validated Hypothesis**: renderDropdown() not called after roster mutations
**Resolution**: Added renderDropdown() calls after all roster changes (Add, Clear, Remove)

### Bug Summary: Controller Reintroduced English Dropdown Placeholder (2026-07-09)
**Bug Summary:** The static staff roster markup used a Thai dropdown placeholder, but `renderDropdown()` replaced it with the old English "Select masseuse to add..." text after controller initialization.

**Validated Hypothesis:** The source of truth for the live dropdown placeholder is the controller render function, not the initial HTML option.

**Invalidated Hypotheses:**
- The browser was showing stale cached HTML.
- The issue was only in the EJS fallback.

**Resolution:** Updated `renderDropdown()` to emit `แตะเพื่อเลือกพนักงาน...` so the initialized UI remains Thai-first.

### Bug Summary: Roster Rows Hid the Important Information (2026-07-09)
**Bug Summary:** Staff names, queue position, daily massage counts, and reorder/remove controls were too small and unclear for daily use.

**Validated Hypothesis:** `renderRoster()` generated compact generic grid cells and bare arrow/delete symbols, leaving the row affordances ambiguous.

**Resolution:** Added semantic row classes, large position/name/count cells, Thai next/order/remove buttons, and a `ลากเพื่อจัดลำดับ` drag hint. The data contract and API calls did not change.

### Bug Summary: Clear Roster Used Native Confirm and Was Easy to Miss (2026-07-09)
**Bug Summary:** The manager missed the clear-everyone affordance during hands-on review, and the controller used the browser `confirm()` dialog rather than a page-level modal.

**Validated Hypothesis:** The existing `DELETE /api/staff/roster` contract was enough for current visible-list clearing. The issue was the frontend event flow and discoverability.

**Resolution:** Added `openClearRosterModal()`, `closeClearRosterModal()`, and `clearVisibleRoster()`. The clear button now opens `#clear-roster-modal`, and the destructive API call only runs when `#confirm-clear-roster-btn` is clicked.

### Bug Summary: Helper Sections Blocked the Working Roster After Setup (2026-07-13)
**Bug Summary:** The previous-day helper and `หยุดวันนี้` helper stayed above the roster after Today Staff was already built, making the working roster less immediately visible.

**Validated Hypothesis:** The page needed a reversible UI-only collapse state. The backend helper data and planning endpoints were correct and should remain available for the beginning-of-day flow.

**Invalidated Hypotheses:**
- Backend helper rows should be hidden based on roster count.
- The helper list should always be below the roster, including early morning.

**Resolution:** Added helper-collapse controls and controller state. The collapse hides both helper sections together and shows a restore control near the roster workflow without changing roster/planning data.

### Bug Summary: Today Massage Count Needed Explicit Row-Level Meaning (2026-07-13)
**Bug Summary:** The row count displayed only a number plus `ครั้ง`, so staff users could miss that it represented completed massages today and should inform queue reordering.

**Validated Hypothesis:** `renderRoster()` already received `today_massages` from the backend, so the fix belonged in row markup and tests.

**Invalidated Hypotheses:**
- The controller needed to calculate the count itself.
- Rendering the count should reorder staff automatically.

**Resolution:** `renderRoster()` now emits explicit `นวดวันนี้` row copy and an accessible label while preserving manual drag/arrow reordering.

### Bug Summary: Reorder Controls Used Legacy Staff Roster Swaps (2026-07-14)
**Bug Summary:** `ตั้งคิว`, `ขึ้น`, and `ลง` looked like they were changing the Today Staff queue, but the controller used legacy `api.updateStaff()` position swaps instead of the canonical `today_staff` reorder endpoint.

**Validated Hypothesis:** The page loaded Today Staff from `/api/staff/today/state`, while its reorder controls wrote through the older `/api/staff/roster/:position` contract. That could leave visible order and backend Today Staff order out of sync.

**Invalidated Hypotheses:**
- The problem was only a display label issue.
- The backend lacked a Today Staff reorder endpoint.
- The next-person calculation should be derived from `status` text.

**Resolution:** Added `reorderVisibleRoster()`, changed set-next/up/down controls to call `api.reorderTodayStaff(orderedStaffIds)`, and render `คิวถัดไป` from the returned roster order.

### Bug Summary: Today Staff Dynamic Strings Were Rendered Unsafely (2026-07-14)
**Bug Summary:** Staff names, helper names, day-off names, status text, and busy-until text were interpolated into `innerHTML` without escaping.

**Validated Hypothesis:** These values originate from database/API rows and therefore must be escaped before string-template rendering.

**Resolution:** Added `escapeStaffHtml()` and applied it to dynamic staff/helper/day-off/status strings rendered by the controller.
