# Staff HTML Module Specification

## Overall Purpose
The Today Staff page provides the first daily workflow for the shop: using yesterday's commission helper list, selecting existing All Staff members, adding them to the visible Today Staff list, marking `หยุดวันนี้`, restoring that mark, ordering the list, and clearing only the visible list when needed. The page is optimized for Thai staff users, with a Thai-only previous-day earnings helper section.

## End-to-End Data Flow
User loads page → Controller initializes → previous-business-day helper list and Today Staff state load → helper rows show staff name, commission, and `หยุดเมื่อวาน` for zero earnings → user adds from helper or dropdown → Staff row appears with large position, name, next-line control, massage count, and reorder/remove controls → user can mark `หยุดวันนี้` and later restore the person from the visible day-off section. Clear everyone clears only the visible Today Staff list and does not alter All Staff or accounting history.

## Module API & Logic Breakdown

### Top Navigation
**Purpose**: Provides links to other primary pages without rendering a self-reference to the current staff roster page.
**Behavior**:
- Includes Home, New Customer, and Daily Summary links.
- Omits the Daily Staff link while the user is already on the staff roster page.
- Uses compact Thai-first navigation so page controls remain visually dominant.

### UI Elements

#### Daily Add Workflow Section
**Purpose**: Makes the main daily action obvious: select staff first, then add them to today's list.
**Elements**:
- `#available-staff` (select): Large Thai placeholder dropdown for selecting staff to add
- `#add-to-roster-btn` (button): Dominant Thai-only Add to Today's List control
- `#show-add-staff-modal-btn` (button): Secondary link-style Add New Staff control for missing names
- `#clear-roster-btn` (button): Secondary bilingual clear-everyone control for resetting the visible roster after mistakes or day-end cleanup

#### Previous Business-Day Helper Section
**Purpose**: Shows the Thai-only yesterday earnings helper list sorted lowest commission first.
**Elements**:
- `#today-helper-list` (div): Helper row container.
- `#today-helper-error` (div): Error state that preserves dropdown fallback.
- `#collapse-helper-sections-btn` (button): Collapses both helper sections once the receptionist is done using them for morning setup.
- `.helper-add-btn`: Adds the row's staff member to Today Staff.
- `.helper-day-off-btn`: Marks the row's staff member `หยุดวันนี้`.

#### Day-Off-Today Section
**Purpose**: Keeps `หยุดวันนี้` state visible and reversible.
**Elements**:
- `#day-off-section` (section): Hidden when empty.
- `#day-off-list` (div): Rows with restore buttons.
- Hidden together with the previous-day helper when helper sections are collapsed.

**Styling**: Uses page-specific task hierarchy, large touch targets, muted navigation, and a green primary action.

#### Helper Restore Control
**Purpose**: Keeps the collapsed helper sections reversible after the daily roster workflow moves near the top of the page.
**Elements**:
- `#show-helper-sections-btn` (button): Shown above the daily staff selector only while helper sections are collapsed.

**Behavior**:
- Clicking `#collapse-helper-sections-btn` hides both the previous-day earnings helper and the `หยุดวันนี้` helper.
- Clicking `#show-helper-sections-btn` restores the helper sections without changing Today Staff roster state.
- Helpers are visible by default for the beginning-of-day workflow.

#### Roster Display Section  
**Purpose**: Shows current staff roster with visual labels
**Elements**:
- `#roster-list` (div): Container for roster items
- `#empty-roster` (div): Shown when roster is empty
- `.roster-grid` (div): Individual roster items with labels 1...n
- Header labels are Thai primary: queue, staff name, next in line, massages completed, order/remove.
- Rows include a drag hint and large staff names/counts for quick scanning.

**Styling**: Grid layout with larger names, larger counts, visible drag affordance, and clearer order/remove buttons.

#### Add New Staff Modal
**Purpose**: Lets the user create a missing master staff member from the daily roster page without leaving the first daily workflow.
**Elements**:
- `#roster-staff-modal` (div): Modal container
- `#roster-staff-form` (form): Submit target for the new master staff record
- `#roster-staff-name` (input): Required staff name
- `#close-roster-staff-modal` and `#cancel-roster-staff-modal`: Close controls

**Behavior**:
- Calls `api.addStaff({ name })`, which maps to `POST /api/admin/staff`.
- Refreshes `GET /api/staff/allstaff` after creation.
- Re-renders the available-staff dropdown and preselects the new staff name so the user can add them to today's roster next.

#### Clear Roster Confirmation Modal
**Purpose**: Prevents accidental full-roster clearing while keeping the cleanup action available when the receptionist needs to restart the visible daily list.
**Elements**:
- `#clear-roster-modal` (div): Modal container
- `#confirm-clear-roster-btn` (button): Destructive confirmation that executes the clear operation
- `#close-clear-roster-modal` and `#cancel-clear-roster-modal`: Close/cancel controls

**Behavior**:
- Opened by `#clear-roster-btn`.
- Explains that the visible roster will be cleared and master staff names are not deleted.
- Calls `api.clearRoster()`, which maps to `DELETE /api/staff/roster`.
- Re-renders the empty roster state and returns all master staff names to the dropdown.

### Button Functionality

#### Add to Roster Button
**Purpose**: Adds selected staff member to today's list
**Behavior**: 
- Requires staff selection from dropdown
- Calculates first empty position
- Makes API call to add staff
- Updates roster display and dropdown
- Visible label is Thai-only. English appears as helper text near the workflow, not inside the button.

#### Add New Staff Button
**Purpose**: Creates a missing master staff member from the roster page.
**Behavior**:
- Opens the Add New Staff modal.
- Requires only the staff name for a dead-simple daily setup flow.
- On save, creates the master staff record, refreshes available staff, and preselects the created name in the dropdown.

#### Clear All Button
**Purpose**: Removes all staff from roster
**Behavior**:
- Opens the in-page confirmation modal
- Makes API call to clear roster
- Updates roster display and dropdown
- Shows empty state when complete

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**:
- staff-page-controller.js (event handling)
- styles.css (styling)
- api.js (master staff creation and roster data fetching)

**Input Data Contracts**:
- Staff data from API
- Roster data from API
- User interactions (clicks, selections)

### Downstream Dependencies (Outputs)
**Called Modules/Services**:
- staff-page-controller.js (event delegation)
- api.js (data fetching)

**Output Data Contracts**:
- DOM updates for roster display
- Network requests for roster management
- Network requests for master staff creation
- User feedback via UI state changes

## Bug & Resolution History

### Bug Summary: Unauthorized Save Button Present
**Validated Hypothesis**: Save Roster button existed in HTML but not in canonical backup
**Resolution**: Removed unauthorized `#save-roster-btn` to match staff.html.backup exactly

### Bug Summary: Missing Button IDs
**Validated Hypothesis**: Buttons lacked proper IDs for JavaScript event binding
**Resolution**: Added proper IDs (`#add-to-roster-btn`, `#clear-roster-btn`) for event delegation

### Bug Summary: Daily Roster UI Hierarchy Was Backwards (2026-07-09)
**Bug Summary:** The staff roster page gave too much visual weight to navigation and secondary actions, while the actual daily task of selecting staff and adding them to today's list was visually weak. English text inside controls also made the UI harder for Thai staff users and caused oversized buttons on mobile/iPad widths.

**Validated Hypothesis:** The issue was primarily markup hierarchy and styling: nav buttons used large colored cards, Add New Staff appeared as a peer to the daily add action, the dropdown was small, and roster rows used small names/counts with unclear reorder controls.

**Invalidated Hypotheses:**
- The workflow required a backend change.
- More bilingual text inside buttons would improve clarity.
- Keeping the old primary color palette would preserve usability.

**Resolution:** Reworked the page into a daily workflow: compact nav, Thai page title, large Thai staff selector, dominant Thai-only add-to-today button, secondary Add New Staff action with English helper text outside the button, larger roster rows, visible drag hint, and Thai order/remove controls. Static `staff.html` and rendered `staff.ejs` were kept in sync.

### Bug Summary: Clear Everyone Action Was Too Easy to Miss and Used Browser Confirm (2026-07-09)
**Bug Summary:** The roster reset affordance existed as a low-prominence Thai-only control and used a native browser confirmation, making it easy for the manager/receptionist to miss and inconsistent with the rest of the page's modal-based workflow.

**Validated Hypothesis:** The backend clear endpoint already existed, so the practical issue was the page contract: the clear action needed a visible bilingual label and a deliberate in-page confirmation modal.

**Invalidated Hypotheses:**
- A new backend endpoint was required for the visible roster reset.
- The browser `confirm()` dialog was sufficient for the staff workflow.

**Resolution:** Updated the clear button to show Thai plus "Clear everyone from list", added `#clear-roster-modal` with explicit cancel/confirm controls, and kept `staff.html` and `staff.ejs` in sync.

### Bug Summary: Helper Lists Stayed Too Prominent After Roster Setup (2026-07-13)
**Bug Summary:** After the receptionist completed the Today Staff roster, the previous-day earnings helper and `หยุดวันนี้` helper remained above the actual roster, forcing the working list lower on the page.

**Validated Hypothesis:** The page had no stateful way to collapse helper sections after morning setup. Since the helper sections are most urgent before the roster is built, the UI needed a reversible collapse affordance rather than a permanent layout reorder.

**Invalidated Hypotheses:**
- The helper API needed to stop returning rows after staff were added.
- The roster should always be moved above helpers, including at the start of the day.

**Resolution:** Added `#collapse-helper-sections-btn` to the previous-day helper header and `#show-helper-sections-btn` near the daily roster workflow. The controller stores a reversible local collapsed state and hides both helper sections together.
