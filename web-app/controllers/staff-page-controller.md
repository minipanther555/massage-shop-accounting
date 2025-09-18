# Staff Page Controller Module Specification

## Overall Purpose
The staff page controller manages the daily staff roster functionality, including adding/removing staff members, managing roster positions, and maintaining UI state consistency. It implements the "Dropdown → API → re-fetch → render" discipline for all roster operations.

## End-to-End Data Flow
User selects staff from dropdown → Add button click → Controller fetches current roster state → Calculates first empty position → PUT /api/staff/roster/:position → GET /api/staff/roster → renderRoster() with visual labels → renderDropdown() with updated availability → UI shows contiguous 1...n labels

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

#### `staffControllerInit(apiClient)`
**Purpose**: Initializes the staff controller with API client
**Parameters**:
- `apiClient` (Object): API client instance
**Returns**: Promise<void>
**Raises**: Error if initialization fails
**Usage & Logic Notes**:
- Sets up event handlers for Add and Clear All buttons
- Fetches initial roster and staff data
- Implements first empty slot algorithm for position calculation

### Event Handlers

#### Add Button Handler
**Purpose**: Handles adding staff to roster
**Logic**:
1. Fetches current roster state (prevents stale state bug)
2. Calculates first empty slot using algorithm
3. Calls PUT /api/staff/roster/:position
4. Re-fetches roster and re-renders
5. Updates dropdown to remove added staff

#### Clear All Button Handler  
**Purpose**: Handles clearing entire roster
**Logic**:
1. Shows confirm dialog
2. Calls DELETE /api/staff/roster
3. Re-fetches roster and re-renders
4. Updates dropdown to show all staff

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**: 
- web-app/staff.html (initialization)
- Browser events (button clicks, dropdown changes)

**Input Data Contracts**:
- API responses: `{position: number, masseuse_name: string, status: string, today_massages: number, busy_until: string}`
- Staff data: `Array<string>` (staff names)

### Downstream Dependencies (Outputs)
**Called Modules/Services**:
- api.js (getStaffRoster, addToRoster, clearRoster, getAllStaff)
- DOM manipulation (renderRoster, renderDropdown)

**Output Data Contracts**:
- DOM updates: Roster list with visual labels 1...n
- Network requests: PUT /api/staff/roster/:position, DELETE /api/staff/roster, GET /api/staff/roster

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
**Resolution**: Added complete Clear All button handler with confirm dialog, API call, and re-render

### Bug Summary: Dropdown Not Filtering
**Validated Hypothesis**: renderDropdown() not called after roster mutations
**Resolution**: Added renderDropdown() calls after all roster changes (Add, Clear, Remove)
