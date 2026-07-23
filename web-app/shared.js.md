# Shared JavaScript Module Specification

## Overall Purpose

The `shared.js` module serves as the core frontend JavaScript library for the Massage Shop POS system. It provides a comprehensive set of functions for managing the application state, handling user interactions, communicating with the backend API, and maintaining data consistency across all frontend pages. This module acts as a bridge between the HTML user interface and the backend services, implementing the business logic for staff management, transaction processing, expense tracking, and daily operations. It also owns the canonical bilingual navigation label registry, including the Thai-first "New Customer" label for the transaction entry route.

## End-to-End Data Flow

A typical data flow through this module begins when a user interacts with the frontend (e.g., submitting a transaction form). The interaction triggers a function call (e.g., `submitTransaction()`), which validates the input data, transforms it to match the backend API schema, and sends it via the `api` client. Upon successful API response, the module updates the local `appData` state and refreshes the UI. For data retrieval, the flow reverses: API calls fetch data from the backend, transform it to frontend format, update the local state, and trigger UI updates. The module also handles error scenarios, fallback to localStorage when API is unavailable, and maintains data consistency across browser sessions.

For navigation labels, pages request or hardcode the bilingual label structure using the same contract: Thai is rendered as the first stacked span and English is rendered as the second span. The `new_transaction` key represents the customer intake action and displays Thai first as `👤 ลูกค้าใหม่`, followed by English as `👤 New Customer`.

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
  - `currentShopStatus`: Current Daily Summary status snapshot, or `{ error: true }` after a failed status fetch (object|null, required)
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
- **Usage & Logic Notes:** Calls `api.getRecentTransactions()` and `api.getExpenses()`, maps API response format to frontend format, and updates `appData.transactions` and `appData.expenses`. Expense descriptions remain unchanged from the API; consumers must not apply page-local aliases because the database/API value is the cross-page display source of truth.

#### `loadCurrentShopStatus()`
- **Purpose:** Fetch and refresh the Daily Summary current shop status snapshot.
- **Parameters:** None
- **Returns:** Promise<object|null> - the latest current-status payload, or an error marker when the API call fails.
- **Raises:** None to callers; errors are caught and stored as `{ error: true, message }` so the page can render a Thai-first error state.
- **Usage & Logic Notes:** Calls `api.getCurrentShopStatus()` and stores the response on `appData.currentShopStatus`. The function is read-only and does not alter transactions, bookings, Today Staff order, or local fallback transaction data.

#### `calculateTodayCounts()`
- **Purpose:** Calculate and update daily massage counts for each staff member
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Resets all counts to 0, filters transactions by current date and active/corrected status, increments counts for each masseuse

#### `exitCorrectionMode()`
- **Purpose:** Exit transaction correction or cancellation mode and reset correction-related state
- **Parameters:** None
- **Returns:** None
- **Raises:** None
- **Usage & Logic Notes:** Sets `correctionMode` to false and clears `originalTransactionId`, called after successful transaction correction

#### `loadData()`
- **Purpose:** Initialize application by loading all configuration and data from backend API
- **Parameters:** None
- **Returns:** `Promise<boolean>`; `true` when all API-backed state loads, `false` when the function catches an error and restores local fallback state
- **Raises:** None to callers; API errors are logged, surfaced through the existing toast, and converted to `false`
- **Usage & Logic Notes:** Loads services, payment methods, and staff roster in parallel, maps API responses to frontend format, calls `loadTodayData()` and `loadCurrentShopStatus()` for current data, and falls back to localStorage on failure. Home consumes the boolean so fallback data cannot be silently labeled live; existing callers that ignore the return value remain compatible.

#### `formatCurrentUserLabel(user)`
- **Purpose:** Convert a normalized user object into the short label shown in page headers.
- **Parameters:** `user` object from `getCurrentUser()` or backend auth metadata.
- **Returns:** String label for header display.
- **Raises:** None.
- **Usage & Logic Notes:** PWTEST preview users render as `Preview: Manager` instead of raw `manager (pwtest)` text. Real users prefer `displayName`, then role, then username.

#### `renderCurrentUser(elementId = 'current-user')`
- **Purpose:** Render the current auth user into a standard header badge.
- **Parameters:** Optional DOM element id, defaulting to `current-user`.
- **Returns:** None.
- **Raises:** None.
- **Usage & Logic Notes:** Hides the element when there is no label so empty placeholders do not appear as stray text. Pages should call this helper instead of formatting `${user.role} (${user.username})` directly.

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
- **Usage & Logic Notes:** Validates required fields, transforms frontend field names to backend schema, calls `api.createTransaction()`, refreshes data, and exits correction mode if applicable. Nullable `booking_id`, `start_datetime`, and `end_datetime` pass through for arrival conversion; the backend remains authoritative for saved reservation details.

#### `loadTransactionForCorrection(transactionId = null)`
- **Purpose:** Load the latest transaction or an explicitly selected current-business-day correction target into correction mode.
- **Parameters:** `transactionId` is optional; when supplied it must match a server-provided correction candidate.
- **Returns:** Promise<object|null> - transaction data if found, null if none available
- **Raises:** Error if API call fails
- **Usage & Logic Notes:** Awaits the selected API result before entering correction mode, sets `originalTransactionId`, and preserves location, duration, service window, and booking linkage.

#### `cancelCorrectionTransaction(transactionId, reason = 'customer_left_before_service')`
- **Purpose:** Cancel the transaction currently loaded into correction mode when the customer leaves before service.
- **Parameters:**
  - `transactionId`: Transaction identifier string, required.
  - `reason`: Cancellation reason string, optional.
- **Returns:** Promise<object|null> - cancelled transaction row on success, null on validation/API failure.
- **Raises:** None to callers; API errors are caught and shown as Thai-first toast feedback.
- **Usage & Logic Notes:** Calls `api.cancelTransaction()`, exits correction mode, reloads current transaction/expense data and current shop status, then returns the cancelled row so the page can clear its form and refresh local panels. The server remains authoritative for eligibility and financial/staff reversal.

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
- **Purpose:** Remove an expense entry from the backend expenses table and refresh local state
- **Parameters:**
  - `index`: Array index of expense to remove (number, required)
- **Returns:** Promise<boolean> - true if deleted and refreshed, false if cancelled or failed
- **Raises:** None
- **Usage & Logic Notes:** Looks up the loaded expense row by index, confirms with the user, calls `api.deleteExpense(expense.id)`, then reloads `loadTodayData()` so the UI reflects the `expenses` table instead of a local-only splice.

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
- **Usage & Logic Notes:** Filters by active/corrected status and applies the visible limit while preserving the API's newest-first order. `GET /api/transactions/recent` is the ordering authority and ties rows with `id DESC`.

#### `getCurrentUser()`
- **Purpose:** Retrieve current user information from localStorage
- **Parameters:** None
- **Returns:** User object or null if not logged in (object|null)
- **Raises:** None
- **Usage & Logic Notes:** Parses JSON from localStorage, returns null if no user data exists, and normalizes stale PWTEST preview users. Historical preview shims stored only `{ username: "pwtest" }`; this function repairs that shape to include `role: "manager"` and `displayName: "PW Test Manager"` so pages that render `${user.role} (${user.username})` never show `undefined (pwtest)`.

#### `getPwtestUser()`
- **Purpose:** Provide the canonical local preview user for PWTEST sessions.
- **Parameters:** None.
- **Returns:** User object with `username: "pwtest"`, `role: "manager"`, `displayName: "PW Test Manager"`, and manager permissions.
- **Raises:** None.
- **Usage & Logic Notes:** Used both to repair stale preview users and to bootstrap auth on a fresh preview port when the URL or cookie carries `PWTEST=1`.

#### `isPwtestPreview()`
- **Purpose:** Detect whether the current browser request is running in local PWTEST preview mode.
- **Parameters:** None.
- **Returns:** boolean - true when `?PWTEST=1` is present in the URL or a `PWTEST=1` cookie exists.
- **Raises:** None.
- **Usage & Logic Notes:** Lets new preview ports open directly to app pages without requiring manual login or preexisting localStorage state.

#### `normalizeCurrentUser(user)`
- **Purpose:** Repair known legacy/current-user shapes before page code consumes them.
- **Parameters:**
  - `user`: Parsed localStorage user value (object, required)
- **Returns:** Normalized user object or null if the input is not a user object.
- **Raises:** None
- **Usage & Logic Notes:** Currently only applies PWTEST preview defaults. Real login users pass through unchanged because their role, display name, permissions, and branch metadata come from the auth API.

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
  - Current shop status payloads from `api.getCurrentShopStatus()`
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

### Bug Summary: Shared Navigation Rendered English Before Thai (2026-07-09)
Navigation labels were still modeled as English-first even though staff-facing screens are used primarily by Thai staff. The transaction route also used internal "New Transaction" terminology instead of the business action "New Customer".

### Validated Hypothesis
The shared `NAV_LABELS` registry and `renderBilingualLabel()` helper define the intended cross-page label order, so both the registry and the renderer needed updates. Static page templates also needed mirrored changes because not every page dynamically renders labels from the helper.

### Invalidated Hypotheses
- CSS alone could make the language order correct.
- "New Transaction" was an acceptable staff-facing label.
- Every workflow button should keep English inside the button.

### Resolution
`NAV_LABELS.new_transaction` now renders `👤 ลูกค้าใหม่ / 👤 New Customer`, and `renderBilingualLabel()` emits `.label-th` before `.label-en`. Staff roster primary workflow controls are documented as Thai-only with English helper text outside the button when developer context is useful.

### Bug Summary: PWTEST Header Rendered `undefined (pwtest)` Across Pages (2026-07-13)
Pages that render the current user with `${user.role} (${user.username})` showed `undefined (pwtest)` in the preview browser after an incomplete PWTEST user object was stored in localStorage.

### Validated Hypothesis
The backend PWTEST auth shim returned a role, but `shared.js#getCurrentUser()` trusted stale localStorage data and the Staff page PWTEST shim wrote only `{ username: "pwtest" }`.

### Invalidated Hypotheses
- The transaction page data load caused the header text.
- The backend `/api/auth/me` PWTEST response lacked the role.
- The issue was isolated to one page.

### Resolution
`getCurrentUser()` now normalizes stale PWTEST users to a complete manager preview shape, `staff.html` writes the complete preview user shape before `shared.js` loads, and fresh preview ports can open app pages directly with `?PWTEST=1` because the shared helper creates the preview user when localStorage is empty.

### Bug Summary: PWTEST Header Still Looked Like Loose Debug Text (2026-07-14)
After the missing-role fix, New Customer and several admin pages still rendered the raw string `manager (pwtest)` in the nav/header area. Browser review showed this looked like random leftover text rather than an intentional page header control.

### Validated Hypothesis
The remaining problem was display formatting and styling, not authentication state. Pages still formatted the user locally with `${user.role} (${user.username})`, and some pages had a `#current-user` placeholder without a consistent renderer.

### Invalidated Hypotheses
- The header text came from backend data loading.
- The preview user was still missing the manager role.
- The issue was isolated to New Customer.

### Resolution
Added `formatCurrentUserLabel()` and `renderCurrentUser()` to shared auth utilities. Preview users now show `Preview: Manager`, real users prefer `displayName`, and pages with `#current-user` call the shared renderer.

### Bug Summary: Recent Transaction Helper Reversed Authoritative API Order (2026-07-13)
The New Customer page did not reliably display the just-submitted transaction at the top of the recent list.

### Validated Hypothesis
`loadTodayData()` loaded `/api/transactions/recent`, but `getRecentTransactions()` then assumed the array was oldest-first and used `slice(-limit).reverse()`. Once the backend endpoint became newest-first and deterministic, this frontend reversal would reintroduce stale ordering.

### Invalidated Hypotheses
- The list failed only because the submit path skipped `loadTodayData()`.
- CSS layout caused the transaction row to appear second.
- Correction-mode filtering removed the newest row.

### Resolution
`getRecentTransactions()` now uses `filtered.slice(0, limit)` and keeps backend ordering unchanged. `__tests__/transaction.walkin-refresh.present.test.js` guards this contract.

### Bug Summary: New Customer Expense Delete Was Local-Only (2026-07-14)
The New Customer expense delete button removed the row from `appData.expenses` and showed a success toast without deleting the row from the backend `expenses` table.

### Validated Hypothesis
`loadTodayData()` preserved each expense database id and `api.deleteExpense(expenseId)` already existed, but `removeExpense(index)` never called it.

### Invalidated Hypotheses
- The expense delete endpoint was missing.
- The UI could safely rely on local state because expenses are temporary.
- Daily Summary aliases caused the delete drift.

### Resolution
`removeExpense(index)` is now async, calls `api.deleteExpense(expense.id)`, reloads `loadTodayData()`, and transaction page handlers await it before refreshing side panels.

### Bug Summary: Booking Credit Was Dropped During API Mapping (2026-07-14)
Transaction APIs now return `booking_credit_amount`, but shared frontend state previously retained only `masseuse_fee`. As a result, no transaction list or summary could render or total the separate credit.

### Validated Hypothesis
`loadTodayData()` and its fallback mapper are the common transaction boundary for New Customer, Daily Summary, and Home.

### Resolution
Both mappers expose numeric `bookingCredit`; `submitTransaction()` preserves the request field shape while normal Walk-in pages now send `requested_staff_booking: false`; shared fee totals add base `masseuseFee` and `bookingCredit` without modifying either component.
