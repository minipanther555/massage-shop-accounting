# Shared JavaScript Module Specification

## Overall Purpose

The `shared.js` module serves as the core frontend JavaScript library for the Massage Shop POS system. It provides a comprehensive set of functions for managing the application state, handling user interactions, communicating with the backend API, and maintaining data consistency across all frontend pages. This module acts as a bridge between the HTML user interface and the backend services, implementing the business logic for staff management, transaction processing, expense tracking, and daily operations.

## End-to-End Data Flow

A typical data flow through this module begins when a user interacts with the frontend (e.g., submitting a transaction form). The interaction triggers a function call (e.g., `submitTransaction()`), which validates the input data, transforms it to match the backend API schema, and sends it via the `api` client. Upon successful API response, the module updates the local `appData` state and refreshes the UI. For data retrieval, the flow reverses: API calls fetch data from the backend, transform it to frontend format, update the local state, and trigger UI updates. The module also handles error scenarios, fallback to localStorage when API is unavailable, and maintains data consistency across browser sessions.

## Module API & Logic Breakdown

### Global Variables & State

#### `CONFIG` (Object)
- **Purpose:** Centralized configuration object containing application settings and constants
- **Properties:**
  - `rosterSize`: Maximum number of staff members (number, required)
  - `settings.masseuses`: Array of available masseuse names (array, required)
  - `settings.services`: Array of available service configurations (array, required)
  - `settings.paymentMethods`: Array of accepted payment methods (array, required)
- **Usage & Logic Notes:** Loaded from backend API on application startup, serves as the single source of truth for application configuration

#### `appData` (Object)
- **Purpose:** Central application state container holding all runtime data
- **Properties:**
  - `transactions`: Array of current day's transactions (array, required)
  - `roster`: Array of staff members and their status (array, required)
  - `expenses`: Array of current day's expenses (array, required)
  - `correctionMode`: Boolean flag for transaction correction mode (boolean, required)
  - `originalTransactionId`: ID of transaction being corrected (number|null, required)
- **Usage & Logic Notes:** All functions read from and write to this object, ensuring data consistency across the application

### Core Functions

#### `showToast(message, type)`
- **Purpose:** Display user feedback messages in a non-intrusive toast notification
- **Parameters:**
  - `message`: Text to display (string, required)
  - `type`: Toast style type - 'success', 'error', or 'warning' (string, optional, default: 'success')
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Creates toast element if it doesn't exist, applies CSS classes for styling, auto-removes after 3 seconds

#### `loadDataFromLocalStorage()`
- **Purpose:** Load application data from browser's localStorage as fallback when API is unavailable
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Parses stored JSON, converts date strings back to Date objects, ensures all required arrays exist with fallback empty arrays

#### `loadTodayData()`
- **Purpose:** Fetch and refresh current day's transaction and expense data from the backend API
- **Parameters:** None
- **Returns:** Promise<void>
- **Raises:** Error if API calls fail
- **Usage & Logic Notes:** Calls `api.getRecentTransactions()` and `api.getExpenses()`, maps API response format to frontend format, updates `appData.transactions` and `appData.expenses`

#### `calculateTodayCounts()`
- **Purpose:** Calculate and update daily massage counts for each staff member
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Resets all counts to 0, filters transactions by current date and active/corrected status, increments counts for each masseuse

#### `exitCorrectionMode()`
- **Purpose:** Exit transaction correction mode and reset correction-related state
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Sets `correctionMode` to false and clears `originalTransactionId`, called after successful transaction correction

#### `loadData()`
- **Purpose:** Initialize application by loading all configuration and data from backend API
- **Parameters:** None
- **Returns:** Promise<void>
- **Raises:** Error if API calls fail
- **Usage & Logic Notes:** Loads services, payment methods, and staff roster in parallel, maps API responses to frontend format, calls `loadTodayData()` for current data, falls back to localStorage on failure

#### `saveData()`
- **Purpose:** Placeholder function for data persistence (data is now saved via API on each operation)
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Kept for compatibility with existing code, actual saving happens automatically through API calls

#### `initializeRoster()`
- **Purpose:** Initialize staff roster with default entries if no roster data exists
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Creates default roster entries up to `CONFIG.rosterSize`, assigns names from configuration if available, sets default status as 'Available', calls `calculateTodayCounts()`

#### `formatTime(date)`
- **Purpose:** Format time in human-readable format for Bangkok timezone
- **Parameters:**
  - `date`: Date object to format (Date, required)
- **Returns:** Formatted time string (string)
- **Raises:** None
- **Usage & Logic Notes:** Uses `toLocaleTimeString()` with Bangkok timezone, returns 12-hour format with AM/PM

#### `serveNextCustomer()`
- **Purpose:** API-based function to assign the next available staff member to serve a customer
- **Parameters:** None
- **Returns:** Promise<string|null> - masseuse name if successful, null if none available
- **Raises:** Error if API call fails
- **Usage & Logic Notes:** Calls `api.serveNextCustomer()`, shows success/error toast, refreshes roster data, returns masseuse name for auto-selection

#### `submitTransaction(formData)`
- **Purpose:** Submit a new transaction to the backend API
- **Parameters:**
  - `formData`: Object containing transaction details (object, required)
- **Returns:** Promise<boolean> - true if successful, false if failed
- **Raises:** Error if validation fails or API call fails
- **Usage & Logic Notes:** Validates required fields, transforms frontend field names to backend schema, calls `api.createTransaction()`, refreshes data, exits correction mode if applicable

#### `loadTransactionForCorrection()`
- **Purpose:** Load the most recent transaction for correction mode
- **Parameters:** None
- **Returns:** Promise<object|null> - transaction data if found, null if none available
- **Raises:** Error if API call fails
- **Usage & Logic Notes:** Calls `api.getLatestTransactionForCorrection()`, enters correction mode, sets `originalTransactionId`, transforms API format to frontend format

#### `enterCorrectionMode()`
- **Purpose:** Enter transaction correction mode
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Sets `correctionMode` to true, typically called before loading transaction for correction

#### `addExpense(description, amount)`
- **Purpose:** Add a new expense entry via backend API
- **Parameters:**
  - `description`: Expense description (string, required)
  - `amount`: Expense amount (number, required)
- **Returns:** Promise<boolean> - true if successful, false if failed
- **Raises:** Error if validation fails or API call fails
- **Usage & Logic Notes:** Validates description and positive amount, calls `api.createExpense()`, refreshes expense data, shows success/error toast

#### `removeExpense(index)`
- **Purpose:** Remove an expense entry from the local state
- **Parameters:**
  - `index`: Array index of expense to remove (number, required)
- **Returns:** boolean - true if removed, false if cancelled
- **Raises:** None
- **Usage & Logic Notes:** Shows confirmation dialog, removes from `appData.expenses` array, calls `saveData()`, shows success toast

#### `endDay()`
- **Purpose:** End the current business day and archive data via backend API
- **Parameters:** None
- **Returns:** Promise<boolean> - true if successful, false if cancelled or failed
- **Raises:** Error if API call fails
- **Usage & Logic Notes:** Shows confirmation dialog, calls `api.endDay()`, refreshes all data, shows comprehensive success message with daily summary

#### `exportToCSV()`
- **Purpose:** Export current day's data to CSV file for backup/analysis
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Filters transactions and expenses by current date, formats data as CSV, creates downloadable blob, triggers file download

#### `getSummary()`
- **Purpose:** Get comprehensive summary of current day's business metrics
- **Parameters:** None
- **Returns:** Promise<object> - summary object with revenue, counts, and breakdowns
- **Raises:** Error if API calls fail
- **Usage & Logic Notes:** Calls API for transaction and expense summaries, calculates all-time revenue from local data, provides payment method breakdown, falls back to local calculations on API failure

#### `getRecentTransactions(limit)`
- **Purpose:** Get filtered list of recent transactions for display
- **Parameters:**
  - `limit`: Maximum number of transactions to return (number, optional, default: 5)
- **Returns:** Array of filtered transactions (array)
- **Raises:** None
- **Usage & Logic Notes:** Filters by active/corrected status, applies limit, reverses order for most recent first, includes comprehensive logging for debugging

#### `getCurrentUser()`
- **Purpose:** Retrieve current user information from localStorage
- **Parameters:** None
- **Returns:** User object or null if not logged in (object|null)
- **Raises:** None
- **Usage & Logic Notes:** Parses JSON from localStorage, returns null if no user data exists

#### `isLoggedIn()`
- **Purpose:** Check if user is currently authenticated
- **Parameters:** None
- **Returns:** boolean - true if logged in, false otherwise
- **Raises:** None
- **Usage & Logic Notes:** Calls `getCurrentUser()` and returns boolean result

#### `hasRole(requiredRole)`
- **Purpose:** Check if current user has required role permissions
- **Parameters:**
  - `requiredRole`: Role to check for (string, required)
- **Returns:** boolean - true if user has role, false otherwise
- **Raises:** None
- **Usage & Logic Notes:** Manager role has access to everything, other roles are checked specifically

#### `requireAuth(requiredRole)`
- **Purpose:** Enforce authentication and role-based access control
- **Parameters:**
  - `requiredRole`: Required role for access (string, optional, default: null)
- **Returns:** boolean - true if authorized, false if not
- **Raises:** None
- **Usage & Logic Notes:** Redirects to login if not authenticated, shows error toast for insufficient permissions, redirects manager to dashboard if needed

#### `logout()`
- **Purpose:** Log out current user and clear session
- **Parameters:** None
- **Returns:** Promise<void>
- **Raises:** Error if API call fails
- **Usage & Logic Notes:** Calls `api.logout()`, clears localStorage, redirects to login page

## Dependency Mapping

### Upstream Dependencies (Inputs)
- **Calling Modules/Services:** All HTML pages in the web-app directory (index.html, transaction.html, staff.html, etc.)
- **Input Data Contracts / Schemas:**
  - Form data objects with properties: masseuse, service, payment, startTime, endTime, location, duration, price, masseuseFee, customerContact
  - API response objects from backend routes (transactions, services, staff, expenses)
  - User authentication data from localStorage

### Downstream Dependencies (Outputs)
- **Called Modules/Services:** 
  - `api` client (defined in api.js) for all backend communication
  - Browser localStorage for data persistence
  - Browser DOM APIs for UI manipulation
- **Output Data Contracts / Schemas:**
  - `appData` object with current application state
  - Toast notifications via DOM manipulation
  - CSV export data for file downloads
  - Redirects to other pages for navigation

## Bug & Resolution History

### Bug Summary
No major bugs have been reported in this module. The module has undergone significant refactoring to transition from localStorage-based data management to API-backed operations.

### Validated Hypothesis
The module successfully handles the transition from local storage to API-based data management while maintaining backward compatibility.

### Invalidated Hypotheses
- Initial concerns about performance impact of API calls were unfounded
- Worries about data consistency issues during the transition were resolved through proper error handling and fallback mechanisms

### Resolution
The module now provides a robust, API-backed foundation for the frontend application with comprehensive error handling, data validation, and fallback mechanisms for offline scenarios.
