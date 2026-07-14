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

#### `getRecentTransactions(limit = 5, date = null)`
- **Purpose:** Retrieves recent transactions from the backend
- **Parameters:** 
  - `limit`: Maximum number of transactions (number, optional, default: 5)
  - `date`: Specific date filter (string, optional)
- **Returns:** Promise with array of transactions
- **Logic:** Sends GET request with optional parameters, parses response

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

#### `getServices()`
- **Purpose:** Retrieves available services and pricing
- **Returns:** Promise with services array
- **Logic:** Sends GET to `/api/services`

#### `getPaymentMethods()`
- **Purpose:** Retrieves accepted payment methods
- **Returns:** Promise with payment methods array
- **Logic:** Sends GET to `/api/services/payment-methods`

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)
- **Calling Modules/Services:** All frontend JavaScript files (transaction.html, shared.js, etc.)
- **Input Data Contracts / Schemas:** 
  - Transaction objects with properties: masseuse, service, payment, startTime, endTime, etc.
  - Staff objects with properties: name, status, position, busy_until
  - Current shop status rows with staff identity, queue position, state, busy time, daily count, and next booking metadata
  - Today Staff helper rows with `staff_id`, `display_name`, `previous_day_commission`, `was_day_off_yesterday`, `today_planning_status`, and `can_add_to_today_staff`
  - Booking rows with schedule, service, duration, location, optional requested staff, customer contact, and lifecycle status
  - Service objects with properties: service_name, duration_minutes, price, masseuse_fee

### Downstream Dependencies (Outputs)
- **Called Modules/Services:** Backend API endpoints via HTTP requests
- **Output Data Contracts / Schemas:** 
  - HTTP responses with JSON data
  - Error objects with status codes and messages
  - Success responses with requested data

## 4. Bug & Resolution History

### Bug Summary
No major bugs have been reported in this module. The module provides a stable, well-tested API client interface.

### Validated Hypothesis
The API client successfully handles all backend communication requirements including CSRF token management and error handling.

### Invalidated Hypotheses
- Initial concerns about CSRF token complexity were unfounded
- Worries about error handling complexity were resolved through proper promise-based design

### Resolution
The module provides a robust, maintainable API client that successfully abstracts backend communication complexity from the frontend application.
