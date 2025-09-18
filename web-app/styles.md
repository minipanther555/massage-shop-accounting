# Styles Module Specification

## Overall Purpose
The styles module provides visual styling for the staff roster interface, ensuring proper button colors, layout consistency, and visual hierarchy that matches the canonical backup design.

## End-to-End Data Flow
HTML elements load → CSS rules apply → Specificity determines final styles → Buttons display with correct colors → Visual hierarchy maintained → User sees consistent interface

## Module API & Logic Breakdown

### Button Styling System

#### `.btn` Base Class
**Purpose**: Provides base button styling
**Properties**: padding, border, cursor, transition
**Usage**: Applied to all buttons as foundation

#### `.btn-next` Class
**Purpose**: Styles "Set Next" buttons when active
**Properties**: 
- `background: #28a745 !important` (green)
- `color: white !important`
**Usage**: Applied when staff member is marked as next in line

#### `.btn-danger` Class  
**Purpose**: Styles remove/delete buttons
**Properties**:
- `background: #e06666 !important` (red)
- `color: white !important`
**Usage**: Applied to remove buttons for destructive actions

#### `.btn-secondary` Class
**Purpose**: Styles secondary action buttons
**Properties**:
- `background: #f4b400` (yellow)
- `color: black`
**Usage**: Applied to Clear All and inactive Set Next buttons

#### `.btn-small` Class
**Purpose**: Styles small buttons with smart color inheritance
**Properties**:
- Default: `background: #6c757d` (gray), `color: white`
- Override: Uses `:not()` selectors to avoid conflicts
**Usage**: Applied to roster item action buttons

### Layout System

#### Flexbox Controls
**Purpose**: Provides responsive button layout
**Properties**: `display: flex`, `gap: 10px`, `align-items: center`
**Usage**: Applied to roster control section

#### Grid Layout
**Purpose**: Provides structured roster display
**Properties**: CSS Grid for roster items
**Usage**: Applied to roster list container

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**:
- staff.html (HTML structure)
- staff-page-controller.js (dynamic class application)

**Input Data Contracts**:
- HTML elements with proper class attributes
- Dynamic class changes based on roster state

### Downstream Dependencies (Outputs)
**Called Modules/Services**:
- Browser rendering engine
- User interface display

**Output Data Contracts**:
- Visual button colors and styling
- Layout positioning and spacing
- Responsive design behavior

## Bug & Resolution History

### Bug Summary: Button Colors Not Displaying
**Validated Hypothesis**: Duplicate .btn rule was overriding specific button colors with white background
**Resolution**: Removed duplicate .btn rule and added !important declarations for proper specificity

### Bug Summary: Color Specificity Issues
**Validated Hypothesis**: CSS specificity was preventing proper color cascade
**Resolution**: Enhanced selectors with :not() pseudo-classes and !important declarations to ensure correct color application

### Bug Summary: Inconsistent Button Styling
**Validated Hypothesis**: Small buttons were inheriting wrong colors due to specificity conflicts
**Resolution**: Implemented smart .btn-small selector that applies default gray only when no specific color class is present