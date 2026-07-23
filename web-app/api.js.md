# `web-app/api.js.md`

## 1. Header Section

**Overall Purpose:** This module serves as the centralized API client wrapper for the Massage Shop POS system. It provides a unified interface for all backend communication, handling HTTP requests, response parsing, error handling, and CSRF token management. The module abstracts away the complexities of direct HTTP communication and provides a clean, promise-based API for the frontend application.

**End-to-End Data Flow:** When a frontend function needs to communicate with the backend, it calls a method from this API client (e.g., `api.createTransaction()`). The client constructs the appropriate HTTP request with headers, CSRF tokens, and request body, sends it to the backend endpoint, and returns a promise that resolves with the parsed response or rejects with an error. The client handles authentication, CSRF token management, and response validation automatically.

## 2. Module API & Logic Breakdown

### Core API Client Class

#### `class ApiClient`
- **Purpose:** Main API client class that handles all HTTP communication with the backend
- **Constructor:** Initializes with base URL and default options
- **Methods:** Provides methods for all backend operations (transactions, staff, services, etc.)

#### `request(endpoint, options = {})`
- **Purpose:** Generic HTTP request method that handles all API calls
- **Parameters:**
  - `endpoint`: API endpoint path (string, required)
  - `options`: Request configuration object (object, optional)
- **Returns:** Promise that resolves with parsed response or rejects with error
- **Logic:** Constructs HTTP request, adds CSRF token, handles authentication, sends request, parses response

#### `getCSRFToken()`
- **Purpose:** Retrieves CSRF token from meta tag or generates new one
- **Returns:** CSRF token string
- **Logic:** Checks for existing token in meta tag, generates new one if needed

### Transaction API Methods

#### `createTransaction(transactionData)`
- **Purpose:** Creates a new transaction via POST to `/api/transactions`
- **Parameters:** `transactionData` - Transaction object (object, required)
- **Returns:** Promise with created transaction data
- **Logic:** Sends POST request with transaction data, handles response

#### `quoteTransactionPromotion(quoteData)`
- **Purpose:** Gets the authoritative current price preview for the selected service before transaction save.
- **Parameters:** `{ service_type, location, duration, time_window_promotion_override? }`.
- **Returns:** Base/final price, discount metadata, override state, and unchanged staff fee.
- **Logic:** Sends `POST /api/transactions/quote`; the backend remains authoritative on Bangkok time and branch configuration.

#### `getRecentTransactions(limit = 5, date = null)`
- **Purpose:** Retrieves recent transactions from the backend
- **Parameters:** 
  - `limit`: Maximum number of transactions (number, optional, default: 5)
  - `date`: Specific date filter (string, optional)
- **Returns:** Promise with array of transactions
- **Logic:** Sends GET request with optional parameters, parses response

#### `getLatestTransactionForCorrection()` and `getCorrectionCandidates(limit = 10)`
- **Purpose:** Load the default latest correction target or up to ten selectable current-business-day correction targets.
- **Returns:** A transaction object or newest-first array of eligible transaction rows.
- **Logic:** Calls the transaction correction-read endpoints; the server determines the business day and excludes superseded originals.

#### `cancelTransaction(transactionId, reason = 'customer_left_before_service')`
- **Purpose:** Cancels a loaded current-business-day normal walk-in through the server-authoritative transaction route.
- **Parameters:**
  - `transactionId`: Transaction identifier string, required.
  - `reason`: Cancellation reason string, optional.
- **Returns:** Promise with the preserved cancelled transaction row.
- **Logic:** Sends `POST /api/transactions/:transactionId/cancel`; the backend owns eligibility checks, status transition, and staff/credit reversal.

### Staff API Methods

#### `getStaffRoster()`
- **Purpose:** Retrieves current staff roster from `/api/staff/roster`
- **Returns:** Promise with staff roster array
- **Logic:** Sends GET request, triggers `resetExpiredBusyStatuses()` on backend

#### `getCurrentShopStatus()`
- **Purpose:** Retrieves the Daily Summary current shop status snapshot from `/api/staff/current-status`.
- **Returns:** Promise with `{ business_day, generated_at, buffer_minutes, staff }`.
- **Logic:** Sends a read-only GET request. The backend remains authoritative for Today Staff order, busy windows, daily massage counts, and requested-staff booking buffers.

#### `setStaffBusy(masseuseName, endTime)`
- **Purpose:** Sets staff member as busy until specified end time
- **Parameters:**
  - `masseuseName`: Name of staff member (string, required)
  - `endTime`: End time for busy status (string, required)
- **Returns:** Promise with confirmation response
- **Logic:** Sends POST to `/api/staff/set-busy` with staff data

#### `getAllStaff()`
- **Purpose:** Retrieves all staff names for dropdown population
- **Returns:** Promise with array of staff names
- **Logic:** Sends GET to `/api/staff/allstaff`

#### `getTodayStaffHelper()`
- **Purpose:** Retrieves the previous-business-day helper rows for the Today Staff page.
- **Returns:** Promise with `{ business_day, previous_business_day, rows }`.
- **Logic:** Sends GET to `/api/staff/today/helper`.

#### `getTodayStaffState()`
- **Purpose:** Retrieves visible Today Staff rows, planning statuses, day-off-today rows, and dropdown-eligible staff.
- **Returns:** Promise with the Today Staff state payload.
- **Logic:** Sends GET to `/api/staff/today/state`.

#### `addTodayStaff(staffIdOrData)`, `markTodayStaffDayOff(staffIdOrData)`, `restoreTodayStaffDayOff(staffIdOrData)`, `reorderTodayStaff(orderedStaffIds)`
- **Purpose:** Wrap Today Staff planning write endpoints.
- **Returns:** Promise with backend confirmation/state payload.
- **Logic:** Writes only to Today Staff/planning contracts; these calls must not mutate transaction ledger rows, commission totals, or payday totals.

### Booking API Methods

#### `getUpcomingBookings()`
- **Purpose:** Retrieves reservations still awaiting arrival.
- **Returns:** Promise with `BOOKED` reservations ordered by scheduled start.
- **Logic:** Sends `GET /api/bookings/upcoming`.

#### `createBooking(bookingData)`
- **Purpose:** Saves a future reservation without creating a transaction or requesting payment.
- **Parameters:** `{ scheduled_start, service_type, duration, location, customer_contact, requested_masseuse_name? }`.
- **Returns:** Promise with the created reservation.

#### `getBookingAvailability(masseuseName, massageEnd)`
- **Purpose:** Checks whether a massage ends at least 15 minutes before the named staff member's next booking.
- **Returns:** Promise with availability and next-booking details.

#### `updateBookingStatus(bookingId, status)`
- **Purpose:** Records a reservation as `CANCELLED` or `NO_SHOW` without creating financial state.
- **Returns:** Promise with the updated booking status.

### Service API Methods

#### `getServices(options = {})`
- **Purpose:** Retrieves available services and pricing.
- **Parameters:**
  - `options.includeInactive`: boolean optional; when true, includes inactive service rows for manager review.
- **Returns:** Promise with services array.
- **Logic:** Sends GET to `/api/services` or `/api/services?includeInactive=true`.

#### `getPaymentMethods()`
- **Purpose:** Retrieves accepted payment methods
- **Returns:** Promise with payment methods array
- **Logic:** Sends GET to `/api/services/payment-methods`

#### `getPromotionSettings()` and `updatePromotionSettings(settings)`
- **Purpose:** Read and save the authenticated manager's branch-local time-window promotion enabled state, Bangkok start/end minutes, and reception override grace.
- **Parameters:** `settings` is required for update and contains `enabled` (boolean), `start_minute` (0-1439), `end_minute` (1-1440, where 1440 is midnight), and `manual_override_grace_minutes` (0-120).
- **Returns:** Promise resolving to the normalized setting row with boolean `enabled`.
- **Logic:** Calls `/api/services/promotion-settings` through `request()`, which supplies CSRF on the write. The browser never supplies a branch/location ID.

#### `createService(serviceData)`, `updateService(serviceId, serviceData)`, `deleteService(serviceId)`, `bulkUpdateServices(updateData)`
- **Purpose:** Wrap manager service catalog mutations through the CSRF-aware request path.
- **Parameters:** `serviceData` contains service row fields; `serviceId` is the target service row id; `updateData` contains bulk update filters and update fields.
- **Returns:** Created/updated service row or mutation confirmation.
- **Logic:** Calls `POST /api/services`, `PATCH /api/services/:id`, `DELETE /api/services/:id`, and `PATCH /api/services/bulk/update`.

#### `getPaymentTypes()`, `createPaymentType(paymentTypeData)`, `updatePaymentType(paymentTypeId, paymentTypeData)`, `deletePaymentType(paymentTypeId)`
- **Purpose:** Wrap manager payment type administration endpoints through the CSRF-aware request path.
- **Parameters:** `paymentTypeData` contains `{ method_name, description?, active? }`; `paymentTypeId` is the target payment method row id.
- **Returns:** Active payment type rows, created/updated row, or delete confirmation.
- **Logic:** Calls `GET /api/payment-types`, `POST /api/payment-types`, `PUT /api/payment-types/:id`, and `DELETE /api/payment-types/:id`.

#### `getFinancialReport(filters)`, `getReportStaff()`, `getReportServiceTypes()`, `getReportLocations()`
- **Purpose:** Wrap manager report data and filter-list endpoints.
- **Parameters:** `filters` may include `from_date`, `to_date`, `staff_member`, `service_type`, and `location`.
- **Returns:** Financial report object or filter arrays.
- **Logic:** Calls `GET /api/reports/financial`, `GET /api/reports/staff`, `GET /api/reports/service-types`, and `GET /api/reports/locations`.

### Authentication API Methods

#### `login(username, password = '')`
- **Purpose:** Authenticates a user and establishes a cookie-backed session.
- **Parameters:** `username` string required; `password` string optional/default empty.
- **Returns:** Promise with `{ success, user }`.
- **Logic:** Sends POST to `/api/auth/login`.

#### `logout()`
- **Purpose:** Ends the current cookie-backed session.
- **Returns:** Promise with logout confirmation.
- **Logic:** Sends POST to `/api/auth/logout`.

#### `checkSession()`
- **Purpose:** Checks the current session cookie.
- **Returns:** Promise with session validity and user metadata.
- **Logic:** Sends GET to `/api/auth/session`.

#### `getUsers()`
- **Purpose:** Retrieves the manager-only configured user list.
- **Returns:** Promise with `{ users: [{ id, username, role, displayName, location_id, location_name, active }] }`.
- **Logic:** Sends GET to `/api/auth/users`. The backend auth store is currently in-memory/configured, so this is a read-only inventory method.

#### `getUsersByLocation(locationId)`
- **Purpose:** Retrieves configured users for a selected location.
- **Parameters:** `locationId` - Location identifier (string or number, required).
- **Returns:** Promise with `{ users, location_id }`.
- **Logic:** Sends GET to `/api/auth/users/location/:locationId`.

### Admin API Methods

#### `getAdminStaff()`, `addStaff(staffData)`, `updateAdminStaff(staffId, staffData)`, `removeStaff(staffId)`
- **Purpose:** Wrap manager-only staff/payday administration endpoints.
- **Returns:** Staff rows or confirmation payloads.
- **Logic:** Calls `/api/admin/staff` and `/api/admin/staff/:id`.

#### `getStaffPayments(staffId)`, `recordPayment(staffId, paymentData)`, `getOutstandingFees()`
- **Purpose:** Wrap manager-only staff payment history, payment recording, and outstanding-fee endpoints.
- **Returns:** Staff payment rows, payment confirmation, or outstanding-fee summaries.
- **Logic:** Calls `/api/admin/staff/:id/payments` and `/api/admin/staff/outstanding-fees`.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)
- **Calling Modules/Services:** All frontend JavaScript files (transaction.html, shared.js, etc.)
- **Input Data Contracts / Schemas:** 
  - Transaction objects with properties: masseuse, service, payment, startTime, endTime, etc.
  - Transaction cancellation requests with `transactionId` and optional `reason`
  - Staff objects with properties: name, status, position, busy_until
  - Current shop status rows with staff identity, queue position, state, busy time, daily count, and next booking metadata
  - Today Staff helper rows with `staff_id`, `display_name`, `previous_day_commission`, `was_day_off_yesterday`, `today_planning_status`, and `can_add_to_today_staff`
  - Booking rows with schedule, service, duration, location, optional requested staff, customer contact, and lifecycle status
  - Service objects with properties: `id`, `service_name`, `duration_minutes`, `location`, `price`, `masseuse_fee`, `active`
  - Payment type objects with properties: `id`, `method_name`, `description`, `active`, `created_at`, `updated_at`
  - Financial report filters with `from_date`, `to_date`, `staff_member`, `service_type`, and `location`
  - User rows with `id`, `username`, `role`, `displayName`, `location_id`, `location_name`, and `active`

### Downstream Dependencies (Outputs)
- **Called Modules/Services:** Backend API endpoints via HTTP requests
- **Output Data Contracts / Schemas:** 
  - HTTP responses with JSON data
  - Error objects with status codes and messages
  - Success responses with requested data

## 4. Bug & Resolution History

### Bug Summary
`admin-services.html` used raw POST/PATCH/DELETE `fetch` calls instead of the shared CSRF-aware API client. `admin-payment-types.html` also loaded payment methods with raw fetch and constructed local API clients for mutations. `admin-reports.html` loaded report filters/reports with raw fetches.

### Validated Hypothesis
Adding service, payment type, and report wrappers lets the manager pages use the same request/error handling path as the rest of the app.

### Invalidated Hypotheses
- The service edit/toggle backend endpoint was not missing; the page needed to call the existing `PATCH /api/services/:id` route through `api.js`.
- The payment type backend routes were not missing; the page needed to call existing `POST /api/payment-types`, `PUT /api/payment-types/:id`, and `DELETE /api/payment-types/:id` routes through shared `api.js`.
- The financial report endpoint was not missing; the page needed report-specific wrappers and the backend needed filter/response shape fixes.

### Resolution
Added `getServices({ includeInactive })`, `updateService()`, `deleteService()`, and `bulkUpdateServices()` support for manager service administration; `getPaymentTypes()`, `createPaymentType()`, `updatePaymentType()`, and `deletePaymentType()` support for manager payment type administration; and `getFinancialReport()`, `getReportStaff()`, `getReportServiceTypes()`, and `getReportLocations()` support for manager reports.
