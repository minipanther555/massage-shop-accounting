# API Client Module Specification

## Overall Purpose
The API client provides a centralized interface for making HTTP requests to the backend staff management endpoints, with proper error handling, Content-Type validation, and route contract enforcement.

## End-to-End Data Flow
Controller calls API method → API client formats request with proper headers → Makes HTTP request → Validates response Content-Type → Parses JSON or returns raw text → Returns data to controller → Controller updates UI

## Module API & Logic Breakdown

### Core Methods

#### `request(path, options)`
**Purpose**: Centralized HTTP request handler with error handling and Content-Type validation
**Parameters**:
- `path` (string): API endpoint path
- `options` (object): Request options including method, headers, body
**Returns**: Promise<any> - Parsed JSON or raw response object
**Raises**: Error for non-2xx responses or JSON parse failures
**Usage & Logic Notes**:
- Automatically adds Accept: application/json header
- Validates Content-Type before parsing JSON
- Provides detailed error messages with response snippets

#### `addToRoster(position, data)`
**Purpose**: Adds staff member to roster at specified position
**Parameters**:
- `position` (number): Roster position (1-based)
- `data` (object): Staff data with masseuse_name and optional status
**Returns**: Promise<any> - API response
**Usage & Logic Notes**:
- Uses PUT /api/staff/roster/:position route
- Sends JSON body with masseuse_name and status

#### `getStaffRoster()`
**Purpose**: Fetches current staff roster
**Returns**: Promise<Array> - Array of staff objects
**Usage & Logic Notes**:
- Uses GET /api/staff/roster route
- Returns parsed JSON array

#### `clearRoster()`
**Purpose**: Clears entire staff roster
**Returns**: Promise<any> - API response
**Usage & Logic Notes**:
- Uses DELETE /api/staff/roster route
- Removes all staff from roster

#### `getAllStaff()`
**Purpose**: Fetches all available staff members
**Returns**: Promise<Array> - Array of staff names
**Usage & Logic Notes**:
- Uses GET /api/staff/allstaff route
- Returns parsed JSON array of names

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**:
- staff-page-controller.js (all roster operations)
- Other controllers requiring staff data

**Input Data Contracts**:
- Position numbers (1-based integers)
- Staff data objects with masseuse_name, status
- API endpoint paths

### Downstream Dependencies (Outputs)
**Called Modules/Services**:
- Backend API endpoints (/api/staff/roster, /api/staff/allstaff)
- Browser fetch API

**Output Data Contracts**:
- Staff roster arrays
- Staff name arrays
- API response objects
- Error objects with detailed messages

## Bug & Resolution History

### Bug Summary: Missing addToRoster Method
**Validated Hypothesis**: Controller needed addToRoster method but it didn't exist
**Resolution**: Added addToRoster method with correct PUT /api/staff/roster/:position route

### Bug Summary: Poor Error Handling
**Validated Hypothesis**: Generic error messages made debugging difficult
**Resolution**: Enhanced request method with Content-Type validation and detailed error messages including response snippets

### Bug Summary: Wrong API Routes
**Validated Hypothesis**: Controller was using incorrect API endpoints
**Resolution**: Aligned all methods with documented API contract (PUT for add, DELETE for clear, GET for fetch)
