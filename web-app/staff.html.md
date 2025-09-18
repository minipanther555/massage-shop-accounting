# Staff HTML Module Specification

## Overall Purpose
The staff roster page provides the user interface for managing daily staff assignments, including adding staff to the roster, clearing the roster, and viewing current assignments with proper visual labels.

## End-to-End Data Flow
User loads page → Controller initializes → Dropdown populated with available staff → User selects staff and clicks Add → Staff added to roster with contiguous labels → User can clear roster or manage individual assignments

## Module API & Logic Breakdown

### UI Elements

#### Roster Controls Section
**Purpose**: Provides controls for managing the staff roster
**Elements**:
- `#available-staff` (select): Dropdown for selecting staff to add
- `#add-to-roster-btn` (button): Adds selected staff to roster
- `#clear-roster-btn` (button): Clears entire roster

**Styling**: Uses flexbox layout with proper spacing and button colors

#### Roster Display Section  
**Purpose**: Shows current staff roster with visual labels
**Elements**:
- `#roster-list` (div): Container for roster items
- `#empty-roster` (div): Shown when roster is empty
- `.roster-grid` (div): Individual roster items with labels 1...n

**Styling**: Grid layout with proper button styling and status indicators

### Button Functionality

#### Add to Roster Button
**Purpose**: Adds selected staff member to roster
**Behavior**: 
- Requires staff selection from dropdown
- Calculates first empty position
- Makes API call to add staff
- Updates roster display and dropdown

#### Clear All Button
**Purpose**: Removes all staff from roster
**Behavior**:
- Shows confirmation dialog
- Makes API call to clear roster
- Updates roster display and dropdown
- Shows empty state when complete

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**:
- staff-page-controller.js (event handling)
- styles.css (styling)

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
- User feedback via UI state changes

## Bug & Resolution History

### Bug Summary: Unauthorized Save Button Present
**Validated Hypothesis**: Save Roster button existed in HTML but not in canonical backup
**Resolution**: Removed unauthorized `#save-roster-btn` to match staff.html.backup exactly

### Bug Summary: Missing Button IDs
**Validated Hypothesis**: Buttons lacked proper IDs for JavaScript event binding
**Resolution**: Added proper IDs (`#add-to-roster-btn`, `#clear-roster-btn`) for event delegation
