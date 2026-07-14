# `web-app/transaction.html.md`

## 1. Header Section

*   **Overall Purpose:** This file provides the Thai-first interface for walk-in intake, future reservation creation, and reservation arrival conversion. A future reservation is schedule state, not a financial transaction; payment is requested only when the customer is present.

*   **End-to-End Data Flow:**
    1.  **Initialization:** On page load (`DOMContentLoaded`), the inline script calls `loadData()` from `shared.js`. This function fetches initial state from multiple backend API endpoints: staff roster, all available services, and payment methods.
    2.  **User Interaction:** The user follows the Thai-first intake sequence: confirm the auto-selected next staff member, confirm or change the default `In-Shop` location, choose a service category button, choose a duration button, choose payment, optionally enter a customer name or phone number, then review the auto-filled start/end time and calculated price/fee. Because nearly all work is in-shop, the location field defaults to `In-Shop` and the page immediately populates matching service options on load. The original `service` and `duration` selects remain in the DOM as hidden contract controls, but staff use the large button layer. Button clicks write the exact historical select values so existing pricing, time, correction, and submission logic continues to work.
    3.  **Mode Selection:** Walk-in mode auto-selects the next queue member. Selecting another staff member means the customer requested that person and changes the form to booking mode. Explicit booking mode may leave staff blank for queue assignment on arrival.
    4.  **Reservation Submission:** Booking mode saves the future schedule, service, duration, location, customer contact, and optional requested staff through `POST /api/bookings`. It hides payment and creates no transaction or earnings.
    5.  **Arrival Conversion:** The upcoming-bookings panel offers `ลูกค้ามาถึง`. It restores saved details, requests payment, and submits the booking ID through the existing transaction path.
    6.  **Backend Processing:** Walk-ins create transactions normally. Booking arrivals atomically create one linked transaction, mark the booking `COMPLETED`, and add a separate `฿50` credit only for requested-staff bookings. The credit is backend payroll state and is intentionally not displayed in the receptionist intake form.
    7.  **UI Refresh:** A successful walk-in action advances the Today Staff queue only when the selected staff is the auto-selected next queue member, reloads the roster, re-renders the staff dropdown, then clears the form. A successful action also refreshes transactions, summaries, and upcoming bookings as applicable.

## 2. Module API & Logic Breakdown

This module consists of an HTML structure and a large inline `<script>` block that orchestrates the page's logic.

*   **`transaction-form` (HTML Form):**
    *   **Purpose:** The main form for capturing all transaction details.
    *   **Renders:** A Thai-first intake workflow panel with a numbered step header, auto-selected next staff dropdown, large service/duration button controls, visible price/fee cards, and a dominant green save button. The layout is page-scoped through `.transaction-*` CSS classes and mirrors the staff roster redesign pattern while preserving all existing DOM IDs.
    *   **Key Inputs:**
        *   `masseuse`: Dropdown for staff names, populated from the staff roster.
        *   `location`: Dropdown for "In-Shop" or "Home Service".
        *   `service`: Hidden native select for service names, populated based on the selected location and updated by the service button UI.
        *   `duration`: Hidden native select for duration, populated based on the selected service and updated by the duration button UI.
        *   `payment`: Dropdown for payment methods.
        *   `startTime` / `endTime`: Time fields, auto-calculated based on service selection.
        *   `original-transaction-id`: A hidden input that stores the ID of a transaction being corrected.
        *   `customer-mode`: Walk-in/booking segmented control.
        *   `booking-start`: Future reservation date/time, required in booking mode.
        *   `active-booking-id`: Hidden reservation link used during arrival conversion.

*   **Top Navigation:**
    *   **Purpose:** Provides links to other primary pages without rendering a self-reference to the current New Customer page.
    *   **Logic:** Includes Home, Daily Staff, and Daily Summary links. The New Customer link is omitted on this page because the user is already on that route. Navigation labels remain Thai first, English second, and use the same muted staff workflow nav style so they do not compete with the intake form.

*   **`handleSubmit(event)` (JavaScript Function):**
    *   **Purpose:** The primary function that handles form submission.
    *   **Logic:** It prevents the default form submission, performs client-side validation to ensure all required fields are filled, constructs the data payload, and calls the `submitTransaction` function from `shared.js`.

*   **`populateDropdowns()` (JavaScript Function):**
    *   **Purpose:** To populate the `select` elements with data fetched from the API during page load.
    *   **Logic:** It reads the `CONFIG.settings` object (populated by `loadData()`) and dynamically creates `<option>` elements for masseuses, services (initially), and payment methods. It orders staff from `appData.roster`, auto-selects the staff member whose roster status is `Next` or the first queue position, and labels that option `คิวถัดไป`. It also attaches the critical `change` event listeners that drive the form's cascading logic.

*   **Cascading Update Functions (`updateServiceOptions()`, `updateDurationOptions()`, `updatePricing()`):**
    *   **Purpose:** A set of functions that are triggered by `change` events on the dropdowns.
    *   **Logic:**
        *   `updateServiceOptions`: Filters the master service list based on the selected location. `populateDropdowns()` defaults location to `In-Shop` and calls this function immediately so the user does not need to open the location dropdown for the common path. After the hidden select is populated, it calls `renderServiceButtons()` so the visible button layer always mirrors the current valid option set.
        *   `updateDurationOptions`: Filters the master service list based on the selected service and location, then calls `renderDurationButtons()` so the visible duration buttons mirror the hidden select options.
        *   `updatePricing`: Finds the specific service object that matches the user's final selection and updates the price/fee display fields.

*   **Service and Duration Button Layer (`renderServiceButtons()`, `renderDurationButtons()`, `selectServiceValue()`, `selectDurationValue()`, `sortComboServices()`):**
    *   **Purpose:** Replaces the visible long service/duration dropdown workflow with large touch-friendly buttons while preserving the original select contract.
    *   **Logic:** `renderServiceButtons()` reads the current hidden `service` options and groups actual menu names into available category buttons. Single-service categories render in the manager-requested priority order Thai, Foot, Oil, Shoulder/Back, then remaining available categories such as Aroma, Coconut, and Scrub. Mixed services containing `+` or `with` are grouped under Combo; choosing Combo opens a second button set containing every combo service option. `sortComboServices()` moves `Foot + back, neck & shoulder` to the first Combo position because it is the most common combo. Combo buttons render the Thai hint as the large primary line and the canonical English service name as smaller secondary text. `selectServiceValue()` still writes the exact old English service value into `#service` and dispatches the same `change` event used by the legacy cascade. `renderDurationButtons()` then reads the valid hidden `duration` options for that service, and `selectDurationValue()` writes the exact duration value into `#duration` before pricing/time updates run.

*   **Thai-First Dynamic Labels and Empty States:**
    *   **Purpose:** Ensures JavaScript-generated placeholders, duration labels, empty recent-transaction messages, empty expense messages, and correction-mode messages do not revert the redesigned page back to English after initialization.
    *   **Logic:** `populateDropdowns()`, `updateServiceOptions()`, `updateDurationOptions()`, `updateTimeDropdowns()`, `updateRecentTransactions()`, `updateExpenseDisplay()`, and correction-mode helpers emit Thai text while preserving the underlying option values used by the backend contract. Service options display the existing English service name plus a short Thai hint in parentheses, but the `<option value>` remains the canonical English service name expected by pricing lookup and submission logic.

*   **Correction Logic (`loadCorrection()`, `checkForEdit()`):**
    *   **Purpose:** To handle the editing/correction of a transaction.
    *   **Logic:** The `checkForEdit` function checks `sessionStorage` for a transaction to be edited (placed there by another page). It pre-populates the form with the transaction details, sets critical global state variables (`appData.correctionMode` and `appData.originalTransactionId`), and sets a hidden input field (`original-transaction-id`) to link the new, corrected transaction to the old one. The `loadCorrection` button fetches the most recent transaction via the API. Both functions ensure that corrections are properly tracked in the global state for downstream processing.

*   **Booking Functions (`setCustomerMode()`, `loadUpcomingBookings()`, `startBookingArrival()`):**
    *   **Purpose:** Switches reservation semantics, renders pending bookings, and converts an arrival into a minimal payment-confirmation flow.
    *   **Logic:** Explicit booking mode allows nullable staff. Overriding the auto-selected next staff member records requested-staff intent. Arrival restores authoritative reservation fields and changes the primary action back to transaction submission.

*   **`escapeBookingText(value)`:**
    *   **Purpose:** Escapes server-provided booking text before upcoming rows are rendered with `innerHTML`.
    *   **Returns:** HTML-safe text.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** A user navigates to this page, typically from `index.html`. Logic from other pages (e.g., a "reports" page) can also redirect here with a transaction in `sessionStorage` to trigger edit mode.
    *   **Input Data Contracts / Schemas:** The page consumes data from the following backend API endpoints:
        *   `GET /api/services`: Returns `[{ service_name, duration_minutes, location, price, masseuse_fee }]`
        *   `GET /api/services/payment-methods`: Returns `[{ method_name }]`
        *   `GET /api/staff/roster`: Returns `[{ position, masseuse_name, status }]`
        *   `GET /api/reports/summary/today`: Returns `{ total_revenue, transaction_count, ... }`
        *   `GET /api/transactions/recent`: Returns `[{ transaction_id, masseuse_name, ... }]`
        *   `GET /api/bookings/upcoming`: Returns pending reservations.
        *   `POST /api/bookings`: Creates a non-financial reservation.
        *   `GET /api/bookings/availability`: Checks requested-staff availability with the 15-minute buffer.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:** This page makes calls to the backend API via the wrapper functions in `web-app/api.js`.
    *   **Output Data Contracts / Schemas:** The primary output is the `POST /api/transactions` request, which sends a JSON payload with the following structure:
        ```json
        {
          "masseuse_name": "string",
          "service_type": "string",
          "location": "string",
          "duration": "number",
          "payment_method": "string",
          "start_time": "string",
          "end_time": "string",
          "customer_contact": "string",
          "original_transaction_id": "string | null",
          "booking_id": "string | null",
          "start_datetime": "ISO timestamp | null",
          "end_datetime": "ISO timestamp | null"
        }
        ```

    *   **Reservation Output:** `POST /api/bookings` omits payment and financial fields. The reservation becomes financial only through a later `POST /api/transactions` carrying its `booking_id`.

## 4. Bug & Resolution History

### Bug #0.6: Backend Booking Credit Appeared as Walk-In UI (2026-07-13)
**Bug Summary:** A large `+฿50` card appeared in the pricing panel during normal walk-in intake even though the credit applies only to completed requested-staff bookings.

**Validated Hypothesis:** The accounting rule had been unnecessarily represented as receptionist-facing UI. In addition, `.transaction-booking-credit { display: flex; }` overrode the element's HTML `hidden` attribute, making the card visible in walk-in mode.

**Invalidated Hypotheses:**
- Walk-in transactions were actually receiving booking credit.
- The selected next-in-queue staff member should be treated as requested staff.
- More conditional JavaScript around the card would improve the workflow.

**Resolution:** Removed the credit card, all UI toggle logic, credit-specific styling, and credit toast copy from both templates. The separate backend credit ledger and arrival-conversion behavior remain unchanged.

### Bug #0.7: Reservation Seed Marker Looked Like Customer or Staff Data (2026-07-13)
**Bug Summary:** Upcoming reservation rows combined time and raw `customer_contact` in one bold line. Preview records contained an internal `DAILY_SUMMARY_STATUS_DEMO_V1` marker and synthetic phone numbers, making the list look like machine data and obscuring which value represented the customer versus requested staff.

**Validated Hypothesis:** The API was returning the stored reservation correctly; the problem was unrealistic preview content plus an unlabeled renderer.

**Resolution:** Reservation rows now show time separately and label `ลูกค้า`, `บริการ`, and `พนักงาน`. Queue-assigned bookings explicitly say staff will be selected from the queue when the customer arrives. The three bounded preview rows were cleaned to realistic customer names without internal markers or synthetic phone numbers.

### Bug #0.8: Expense Labels Differed Between New Customer and Daily Summary (2026-07-13)
**Bug Summary:** New Customer displayed raw preview expense descriptions while Daily Summary displayed `Big C` and `Oil` for the same records.

**Validated Hypothesis:** `loadTodayData()` correctly loaded the stored descriptions through `api.getExpenses()`. Daily Summary alone applied page-local aliases, masking stale preview database values.

**Resolution:** Updated the two bounded preview expense rows to `Big C` and `Oil`, removed the Summary-only aliases, and retained direct API-backed rendering on New Customer. Both pages now show the same stored value.

### Bug #0.9: Walk-In Submit Did Not Refresh the Next Staff Dropdown (2026-07-13)
**Bug Summary:** After submitting a normal walk-in for the auto-selected next staff member, the form reset back to the same staff instead of the next active Today Staff row.

**Validated Hypothesis:** The success path called `clearForm()` before reloading the roster state used by `autoSelectedMasseuse`. `clearForm()` therefore wrote the stale previous value back into `#masseuse`, even after queue advancement. The backend also advanced the legacy `staff_roster` queue instead of the active `today_staff` order rendered by this page.

**Invalidated Hypotheses:**
- The dropdown option was selected manually by the receptionist.
- The transaction record failed to save.
- Booking/requested-staff mode should advance the same queue.

**Resolution:** The success path now calls `refreshRosterForDropdown()` after `advanceQueue()` and before `clearForm()`. The helper reloads `GET /api/staff/roster`, updates `appData.roster`, re-renders only the staff dropdown, and lets `clearForm()` select the new `autoSelectedMasseuse`. Backend `advance-queue` now rotates `today_staff`.

### Bug #0.10: Dynamic Transaction Page Values Needed Escaping (2026-07-13)
**Bug Summary:** Checkpoint security review found that several New Customer side panels used `innerHTML` with payment method, recent transaction, expense, service, and staff values that can come from stored data.

**Validated Hypothesis:** Static Thai labels were safe, but dynamic strings inside payment breakdown, recent transactions, expense rows, and option builders needed explicit escaping or DOM text assignment.

**Invalidated Hypotheses:**
- Escaping `<option>` value strings was safe for all dropdowns; that would have changed submitted legacy values when names contained HTML-sensitive characters.
- Only Daily Summary needed escaping.

**Resolution:** Rendered side-panel dynamic text through `escapeBookingText()` and switched staff/service/duration/payment option creation to DOM `option.value` plus `option.textContent`, preserving exact form values while preventing HTML interpretation.

### Bug #0: Navigation Label Did Not Match Business Workflow (2026-07-09)
**Bug Summary:** The transaction page was exposed in navigation as "New Transaction / ธุรกรรมใหม่", which describes an internal record instead of the staff-facing action of taking a new customer.

**Validated Hypothesis:** The issue was terminology and navigation hierarchy, not transaction submission logic.

**Invalidated Hypotheses:**
- A better direct translation of "transaction" would solve the issue.
- The page needed to keep a self-link for navigation consistency.

**Resolution:** Updated nav labels and page templates so the route is staff-facing `ลูกค้าใหม่ / New Customer`, with Thai first. The transaction page now omits its own New Customer nav button while retaining Home, Daily Staff, and Daily Summary.

### Bug #0.1: Transaction Intake Visual Hierarchy Was Too Technical (2026-07-09)
**Bug Summary:** The transaction page still looked like an old internal record-entry form. It used English section titles, large navigation cards, and equal visual weight across form fields, correction, summary, recent transactions, and expenses. This made the first customer intake action less obvious for Thai staff.

**Validated Hypothesis:** The issue was page hierarchy and language priority, not backend transaction logic. The staff roster redesign provided the correct pattern: compact title, muted navigation, Thai-first primary workflow, secondary support actions, and page-scoped CSS.

**Invalidated Hypotheses:**
- Keeping English field labels was acceptable because the data model is English.
- The page needed a full logic rewrite to become simpler.
- Global button/card styles should be refactored to fix this page.

**Resolution:** Reworked `transaction.html` and `transaction.ejs` around a Thai-first New Customer intake workflow while preserving all existing form IDs and backend payload fields. Added page-scoped `.transaction-*` CSS, large Thai controls, Thai dynamic placeholders/empty states, price/fee cards, and a dominant `บันทึกลูกค้าใหม่` submit action.

### Bug #0.2: Common In-Shop Location Required an Unnecessary Click (2026-07-09)
**Bug Summary:** The location dropdown started blank even though almost all customer transactions are in-shop. Staff had to click the location dropdown for the common path before choosing a service.

**Validated Hypothesis:** The issue was default state, not service filtering logic. The existing cascade works as long as the location value is set before `updateServiceOptions()` runs.

**Invalidated Hypotheses:**
- The location field should be removed entirely.
- Services should load without a location filter.

**Resolution:** Defaulted the location select to `In-Shop` in both static and EJS templates, and updated `populateDropdowns()` to call `updateServiceOptions()`, `updatePricing()`, and `updateTimeDropdowns()` from the default selected location after event listeners are attached. Users can still change the dropdown to `Home Service` when needed.

### Bug #0.3: Service Menu Needed More Readable Staff-Facing Labels (2026-07-09)
**Bug Summary:** The service dropdown was readable enough in English for reception staff, but it lacked Thai cues and the dropdown text needed to be heavier for iPad/mobile readability.

**Validated Hypothesis:** The display label could be improved without changing service values or backend contracts. Pricing and submission logic depend on the English service value, not the visible label text.

**Invalidated Hypotheses:**
- Services needed to be fully translated and renamed in the database.
- The dropdown should become a custom component before the current form is usable.

**Resolution:** Added `getServiceDisplayName()` in both transaction templates to append short Thai hints to known English service names. The visible label is now `English service (Thai hint)` while the option value remains the original service name. Transaction select controls and options also use heavier font weight for better readability on iPad/mobile.

### Bug #0.4: New Customer Page Had Too Many Dropdown Decisions (2026-07-13)
**Bug Summary:** Staff still had to open several dropdowns for routine customer intake. The biggest friction points were staff selection, the long service menu, and the duration menu.

**Validated Hypothesis:** The issue was interaction cost and first-screen clarity, not the backend transaction contract. The existing hidden select values should remain the source for pricing, time calculation, correction mode, and submission.

**Invalidated Hypotheses:**
- The service list should be reduced, which would remove valid menu items.
- The database service names should be rewritten before an MVP could be tested.
- Combo services could be handled as one generic service without preserving exact menu selections.

**Resolution:** Added two FSM-scoped UI changes. First, `populateDropdowns()` now auto-selects the next Today Staff queue member by roster status/order and marks the selected option `คิวถัดไป`. Second, the visible service/duration flow now uses large Thai-first buttons generated from the actual location-filtered service list. The original `#service` and `#duration` selects remain hidden contract controls, and every button writes the exact old select value before dispatching the legacy change events.

### Bug #0.5: Combo Button Order and Language Priority Needed Manager Tuning (2026-07-13)
**Bug Summary:** The first MVP button order put less-common categories before the most common choices, and Combo buttons used the long English service name as the large primary line. This made the Combo section harder to scan for Thai staff.

**Validated Hypothesis:** The issue was display priority only. The service values, duration filtering, pricing lookup, and backend submission contract should remain unchanged.

**Invalidated Hypotheses:**
- Combo services needed separate backend metadata before the MVP could be useful.
- The most common Combo service should be renamed in the database.
- The English service name should be removed from the button entirely.

**Resolution:** Reordered category definitions so Thai, Foot, Oil, and Shoulder/Back render first. Added `sortComboServices()` to put `Foot + back, neck & shoulder` first in the Combo list. Added `getServiceThaiHint()` and changed Combo rendering so the Thai hint is the large primary line while the canonical English service name is retained as smaller secondary text and as the hidden select value.

### Bug #1: checkForEdit Global State Management (2024-12-19)
**Bug Summary:** The `checkForEdit()` function was failing to set global state variables `appData.correctionMode` and `appData.originalTransactionId` when editing transactions, causing edited transactions to remain with "ACTIVE" status instead of becoming "EDITED".

**Validated Hypothesis:** The `checkForEdit()` function was missing implementation to set critical global state variables that the `submitTransaction()` function relies on to identify corrections.

**Invalidated Hypotheses:**
- The bug was in the backend API logic
- The issue was with the database schema
- The problem was in the transaction submission flow

**Resolution:** Added the missing global state management logic to the `checkForEdit()` function:
```javascript
// Set global state for correction mode
appData.correctionMode = true;
appData.originalTransactionId = transaction.id;
```

**Impact:** Edited transactions now properly show as "EDITED" status and are correctly tracked as corrections in the backend.

**Testing:** Comprehensive test suite created including regression tests, side-effect guards, and edge-case handling to prevent future regressions.
