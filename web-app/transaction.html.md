# `web-app/transaction.html.md`

## 1. Header Section

*   **Overall Purpose:** This file provides the Thai-first interface for walk-in intake, future reservation creation, and reservation arrival conversion. A future reservation is schedule state, not a financial transaction; payment is requested only when the customer is present.

*   **End-to-End Data Flow:**
    1.  **Initialization:** On page load (`DOMContentLoaded`), the inline script calls `loadData()` from `shared.js`. This function fetches initial state from multiple backend API endpoints: staff roster, all available services, and payment methods.
    2.  **User Interaction:** The user follows the Thai-first intake sequence: confirm the auto-selected next staff member, confirm or change the default `In-Shop` location, choose a service category button, choose a duration button, choose a payment button on its own line, optionally enter a customer name or phone number, then review the auto-filled start/end time and calculated price/fee. Because nearly all work is in-shop, the location field defaults to `In-Shop` and the page immediately populates matching service options on load. The original `service`, `duration`, and `payment` selects remain in the DOM as hidden contract controls, but staff use the large button layer. Button clicks write the exact historical select values so existing pricing, time, correction, and submission logic continues to work.
    3.  **Mode Selection:** Walk-in mode auto-selects the next queue member. Reception may manually select another available staff member while staying in Walk-in mode, for example when the next queue member cannot perform the requested massage. Only explicit Booking mode creates a booking. Explicit booking mode may leave staff blank for queue assignment on arrival.
    4.  **Reservation Submission:** Booking mode saves the future schedule, service, duration, location, customer contact, and optional requested staff through `POST /api/bookings`. It hides payment and creates no transaction or earnings.
    5.  **Arrival Conversion:** The upcoming-bookings panel offers `ลูกค้ามาถึง`. It restores saved details, requests payment, and submits the booking ID through the existing transaction path.
    6.  **Backend Processing:** Walk-ins create transactions normally. Booking arrivals atomically create one linked transaction, mark the booking `COMPLETED`, and add a separate `฿50` credit only for requested-staff bookings. The credit is backend payroll state and is intentionally not displayed in the receptionist intake form.
    7.  **UI Refresh:** A successful walk-in action refreshes the workload/status snapshot and Today Staff roster, re-renders the staff dropdown, then clears the form. The original Today Staff positions remain fixed; counts and booking eligibility determine the next walk-in. A successful action also refreshes transactions, summaries, and upcoming bookings as applicable.

## 2. Module API & Logic Breakdown

This module consists of an HTML structure and a large inline `<script>` block that orchestrates the page's logic.

*   **`transaction-form` (HTML Form):**
    *   **Purpose:** The main form for capturing all transaction details.
    *   **Renders:** A Thai-first intake workflow panel with a numbered step header, auto-selected next staff dropdown, large service/duration/payment button controls, visible price/fee cards, and a dominant green save button. The layout is page-scoped through `.transaction-*` CSS classes and mirrors the staff roster redesign pattern while preserving all existing DOM IDs.
    *   **Key Inputs:**
        *   `masseuse`: Dropdown for staff names, populated from the staff roster.
        *   `location`: Dropdown for "In-Shop" or "Home Service".
        *   `service`: Hidden native select for service names, populated based on the selected location and updated by the service button UI.
        *   `duration`: Hidden native select for duration, populated based on the selected service and updated by the duration button UI.
        *   `payment`: Hidden native select for payment methods, populated from active payment methods and updated by the payment button UI.
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
    *   **Logic:** It reads the `CONFIG.settings` object (populated by `loadData()`) and dynamically creates `<option>` elements for masseuses, services (initially), and payment methods. It derives the next staff member from the backend `walk_in_priority` flag in `appData.currentShopStatus.staff`; that flag uses assigned workload first and stable original Today Staff order for ties. Busy and booking-buffer rows are excluded before the roster fallback. If no staff is eligible, the page leaves the walk-in staff value blank and shows that everyone is busy plus the earliest calculated free time. In Walk-in mode, every live non-available option is disabled and cannot be selected; Booking mode re-enables intentional future-staff selection. It labels the selected option `คิวถัดไป` and attaches the critical `change` event listeners that drive the form's cascading logic.

*   **Cascading Update Functions (`updateServiceOptions()`, `updateDurationOptions()`, `updatePricing()`):**
    *   **Purpose:** A set of functions that are triggered by `change` events on the dropdowns.
    *   **Logic:**
        *   `updateServiceOptions`: Filters the master service list based on the selected location. `populateDropdowns()` defaults location to `In-Shop` and calls this function immediately so the user does not need to open the location dropdown for the common path. After the hidden select is populated, it calls `renderServiceButtons()` so the visible button layer always mirrors the current valid option set.
        *   `updateDurationOptions`: Filters the master service list based on the selected service and location, then calls `renderDurationButtons()` so the visible duration buttons mirror the hidden select options.
        *   `updatePricing`: Shows the catalog base price immediately, then requests a server quote. The returned final price replaces the display only after the service/duration selection still matches. It shows automatic promotion state or, only during the configured grace period, the receptionist override action.

*   **Service, Duration, and Payment Button Layer (`renderServiceButtons()`, `getPreferredCategoryService()`, `renderDurationButtons()`, `renderPaymentButtons()`, `selectServiceValue()`, `selectDurationValue()`, `selectPaymentValue()`, `sortComboServices()`):**
    *   **Purpose:** Replaces the visible long service/duration/payment dropdown workflow with large touch-friendly buttons while preserving the original select contract.
*   **Logic:** `renderServiceButtons()` reads the current hidden `service` options and groups actual menu names into available category buttons. Single-service categories render in the manager-requested priority order Thai, Foot, Oil, Shoulder/Back, then remaining available categories such as Aroma, Coconut, and Scrub. `getPreferredCategoryService()` makes catalog ordering non-semantic: when the generic Oil category is tapped it selects exact `Oil massage` if active, otherwise it keeps the first available fallback. This makes the exact-service server quote reach the governed Oil promotion rows without applying those prices to Coconut, Deep Oil, or other independent catalog entries. Mixed services containing `+` or `with` are grouped under Combo; choosing Combo opens a second button set containing every combo service option. `sortComboServices()` moves `Foot + back, neck & shoulder` to the first Combo position because it is the most common combo. Combo buttons render the Thai hint as the large primary line and the canonical English service name as smaller secondary text. `selectServiceValue()` still writes the exact old English service value into `#service` and dispatches the same `change` event used by the legacy cascade. `renderDurationButtons()` then reads the valid hidden `duration` options for that service, and `selectDurationValue()` writes the exact duration value into `#duration` before pricing/time updates run. `renderPaymentButtons()` reads the hidden `#payment` options, renders them as a separate full-width row under service/duration selection, and `selectPaymentValue()` writes the exact payment method into `#payment` before dispatching the legacy change event.

*   **Thai-First Dynamic Labels and Empty States:**
    *   **Purpose:** Ensures JavaScript-generated placeholders, duration labels, empty recent-transaction messages, empty expense messages, and correction-mode messages do not revert the redesigned page back to English after initialization.
    *   **Logic:** `populateDropdowns()`, `updateServiceOptions()`, `updateDurationOptions()`, `updateTimeDropdowns()`, `updateRecentTransactions()`, `updateExpenseDisplay()`, and correction-mode helpers emit Thai text while preserving the underlying option values used by the backend contract. Service options display the existing English service name plus a short Thai hint in parentheses, but the `<option value>` remains the canonical English service name expected by pricing lookup and submission logic.

*   **Correction and Cancellation Logic (`loadCorrection()`, `checkForEdit()`, `cancelLoadedCorrection()`, `exitCorrectionMode()`):**
    *   **Purpose:** To handle editing/correction of a transaction and cancellation of a saved current-day normal walk-in after a correction target is loaded.
    *   **Logic:** The `checkForEdit` function checks `sessionStorage` for a transaction to be edited (placed there by another page). It pre-populates the form with the transaction details, sets critical global state variables (`appData.correctionMode` and `appData.originalTransactionId`), and sets a hidden input field (`original-transaction-id`) to link the new, corrected transaction to the old one. The `loadCorrection` button fetches the most recent transaction via the API and reveals the hidden Thai-first `ยกเลิกรายการนี้` action. Earlier-transaction candidate buttons call the same load path, so cancellation is available only after a target is explicitly loaded. `cancelLoadedCorrection()` confirms with the receptionist, calls `cancelCorrectionTransaction(appData.originalTransactionId)`, clears the form on success, and refreshes page panels. The page-local `exitCorrectionMode()` clears both its local correction flag and shared `appData` correction state so the cancel button, banner, and backend target state stay aligned.

    *   **Booking Functions (`setCustomerMode()`, `loadUpcomingBookings()`, `startBookingArrival()`, `markBookingNoShow()`):**
    *   **Purpose:** Switches reservation semantics, renders pending bookings, and converts an arrival into a minimal payment-confirmation flow.
    *   **Logic:** Explicit booking mode allows nullable staff. Manually selecting a non-next staff member in Walk-in mode remains a normal walk-in and does not record requested-staff booking intent. Arrival restores authoritative reservation fields and changes the primary action back to transaction submission. Each active booking also exposes a confirmed `ไม่มา (No-show)` action that calls `POST /api/bookings/:bookingId/status` with `NO_SHOW`, reloads the booking list, and refreshes staff availability.

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
        *   `POST /api/transactions/quote`: Returns a server-authoritative base/final price and whether time-window override is available.
        *   `POST /api/transactions/:transactionId/cancel`: Cancels an eligible loaded current-business-day normal walk-in without deleting the row.

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

**Resolution:** The success path now calls `refreshRosterForDropdown()` after the compatibility `advanceQueue()` call and before `clearForm()`. The helper reloads the current status/roster data, updates `appData`, re-renders only the staff dropdown, and lets `clearForm()` select the workload-based priority. Backend `advance-queue` retains the original `today_staff.position` order instead of rotating it.

### Bug #0.10: Dynamic Transaction Page Values Needed Escaping (2026-07-13)
**Bug Summary:** Checkpoint security review found that several New Customer side panels used `innerHTML` with payment method, recent transaction, expense, service, and staff values that can come from stored data.

**Validated Hypothesis:** Static Thai labels were safe, but dynamic strings inside payment breakdown, recent transactions, expense rows, and option builders needed explicit escaping or DOM text assignment.

**Invalidated Hypotheses:**
- Escaping `<option>` value strings was safe for all dropdowns; that would have changed submitted legacy values when names contained HTML-sensitive characters.
- Only Daily Summary needed escaping.

**Resolution:** Rendered side-panel dynamic text through `escapeBookingText()` and switched staff/service/duration/payment option creation to DOM `option.value` plus `option.textContent`, preserving exact form values while preventing HTML interpretation.

### Bug #0.12: Payment Method Was Still a Small Dropdown (2026-07-21)
**Bug Summary:** The New Customer page had already moved service and duration selection to large buttons, but payment method remained a dropdown beside the massage controls on iPad.

**Validated Hypothesis:** Payment submission already depends only on `#payment.value`, so the visible control could become a button grid while keeping the native select hidden as the contract field.

**Invalidated Hypotheses:**
- Payment needed backend changes.
- Payment buttons should share the same row as service/duration controls.

**Resolution:** Added a separate `#payment-button-panel` below the service/duration controls in both transaction templates. Payment buttons write the exact method into hidden `#payment`, dispatch the existing `change` event, and keep active-state styling in sync for correction and reset paths.

### Bug #0.13: Oil Category Selected an Unpromoted Coconut Service (2026-07-22)
**Bug Summary:** At branch 43 during the active promotion window, tapping the generic Oil category displayed the base Oil-like service price instead of the governed `Oil massage` promotion price.

**Validated Hypothesis:** The category renderer selected the first catalog entry in the Oil group. The live value was `Coconut lovers - coconut oil massage`; the server quote correctly prices promotions by the exact service name, and only `Oil massage` has the configured Oil promotion rows.

**Invalidated Hypotheses:** The promotion window was disabled; In-Shop Oil promotion rows were missing; Home Service was selected; the server quote failed to apply the matching exact Oil massage row.

**Resolution:** Added `getPreferredCategoryService()` to select exact active `Oil massage` for the generic Oil category while preserving the first available fallback if that catalog row is unavailable. The backend catalog and promotion data remain unchanged.

### Bug #0.14: Loaded Walk-In Had No Cancel Action (2026-07-23)
**Bug Summary:** Reception could load the latest or an earlier transaction for correction, but if the customer left before massage there was no low-clutter cancel action from the same workflow.

**Validated Hypothesis:** The edit surface already held the correct target transaction ID. A hidden Thai-first cancel button could be revealed only after a target was loaded and call a server-authoritative cancellation endpoint.

**Invalidated Hypotheses:**
- Normal transaction entry should always show a cancellation action.
- A frontend delete/hide would preserve audit and payroll correctness.
- The page-local reset could ignore shared `appData` correction fields.

**Resolution:** Added the hidden `cancel-correction-button`, reveals it in `loadCorrection()`, hides and clears it in `exitCorrectionMode()`, and calls `cancelCorrectionTransaction(appData.originalTransactionId)` after a Thai confirmation. Browser smoke verified the button is initially hidden, appears for the loaded walk-in, then clears correction state after cancellation.

### Bug #0.11: Expense Delete Was Only Local Browser State (2026-07-14)
**Bug Summary:** The New Customer expense delete button removed a row from `appData.expenses` and refreshed the side panel, but it did not call the backend delete endpoint.

**Validated Hypothesis:** `loadTodayData()` maps database `expenses.id` into each local expense row and `api.deleteExpense(expenseId)` already maps to `DELETE /api/expenses/:id`; the missing piece was the shared `removeExpense(index)` implementation.

**Invalidated Hypotheses:**
- The backend lacked expense deletion support.
- The New Customer page could safely treat expenses as local-only day notes.
- The issue was only a Daily Summary display alias problem.

**Resolution:** `removeExpense(index)` now awaits `api.deleteExpense(expense.id)`, reloads `loadTodayData()`, and both `transaction.html` and `transaction.ejs` await the shared helper before refreshing side panels.

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

### Bug #0.6: Service Button Grid Disappeared After Next-Staff Refresh Work (2026-07-14)
**Bug Summary:** Browser review of the New Customer page showed the `บริการ` label but no large service category buttons. This contradicted the current transaction-page contract, which requires the Thai-first service and duration button layer to be generated from the hidden `#service` and `#duration` selects.

**Validated Hypothesis:** The button markup and rendering functions were still present, but page initialization aborted inside `populateDropdowns()` before `updateServiceOptions()` and `renderServiceButtons()` ran. The failure was a `ReferenceError` from logging `nextInLineName` after `renderMasseuseDropdown()` returned; `nextInLineName` is local to that function.

**Invalidated Hypotheses:**
- The service button functionality had been intentionally removed.
- `/api/services` was returning no service rows.
- The hidden service select contract had been deleted.

**Resolution:** Changed the post-population debug log in both transaction templates to use page-level `autoSelectedMasseuse`. Browser verification after reload showed 19 hidden service options, 7 category buttons, and Thai Massage selecting 60/90/120 minute duration buttons. Added a regression assertion in `__tests__/transaction.walkin-refresh.present.test.js`.

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

### Bug #0.7: Non-Next Walk-In Was Silently Changed Into A Future Reservation (2026-07-14)
**Bug Summary:** Selecting a non-next staff member while `ลูกค้ามาแล้ว / Walk-in` was active automatically switched the page to `จองเวลา / Booking`, hiding payment and preventing the intended one-submit immediate requested-staff transaction.

**Validated Hypothesis:** The `masseuse` change listener explicitly called `setTransactionMode('booking')`; the submit path already had the correct `requestedStaffBooking` classification but could never reach it.

**Invalidated Hypotheses:** The backend lacked immediate conversion; the receptionist needed to create a reservation and then mark arrival for a customer already present.

**Resolution:** Removed the automatic mode switch from both templates. Walk-in remains active, and submit keeps manually selected non-next staff as a normal walk-in while ordinary next-staff selection also remains a normal walk-in. Booking rows are created only through explicit Booking mode.

### Bug #0.15: Non-Next Walk-In Created Unexpected Booking Rows (2026-07-23)
**Bug Summary:** The manager saw bookings that reception did not intentionally create. The old workflow treated manually selecting a non-next staff member during a present walk-in as requested-staff booking intent.

**Validated Hypothesis:** A non-next staff selection can still be a true walk-in because the next queue member may not perform the requested service. The hidden `requestedStaffBooking` flag and backend immediate-booking branch converted that walk-in into a completed booking and booking credit.

**Invalidated Hypotheses:**
- Every non-next staff selection means the customer made a booking.
- Removing only the visible auto-switch is enough while leaving the hidden request flag.
- The backend can safely trust stale `requested_staff_booking` payloads for transaction creation.

**Resolution:** Both templates now submit `requestedStaffBooking: false` for normal Walk-in mode, and `POST /api/transactions` ignores stale immediate requested-staff booking payloads. Only explicit Booking mode calls `POST /api/bookings`; booking arrival conversion with `booking_id` still creates booking credits.

### Bug #0.8: Immediate Booking Default and Credit Visibility (2026-07-14)
**Bug Summary:** Explicit booking defaulted thirty minutes ahead, while the real `฿50` credit was either shown as an oversized intake card or hidden from transaction lists.

**Validated Hypothesis:** Booking time should default to the current Bangkok minute, and credit belongs as a compact annotation on persisted transaction rows rather than as a form decision.

**Invalidated Hypotheses:** Every booking required a future lead time; the credit should be merged into the displayed base staff fee.

**Resolution:** Booking datetime uses one-minute precision and defaults to now. Recent rows render `จองพนักงาน +฿50` only when `bookingCredit > 0`; the old large card remains forbidden. Browser verification at 630x998 confirmed the badge fits inside the service cell.

### Bug #0.9: Walk-In Dropdown Used a Stale Current-Status Snapshot (2026-07-15)
**Bug Summary:** After a successful walk-in or periodic refresh, the New Customer page could show the previous next-in-line staff member even though the Today Staff queue and current booking/busy state had changed.

**Validated Hypothesis:** The submit path refreshed the Today Staff roster and re-rendered the dropdown without refreshing `appData.currentShopStatus`. `getNextInLineFromStaff()` therefore preferred an old status snapshot until a full page reload fetched current status again.

**Invalidated Hypotheses:**
- The queue rotation endpoint was writing the wrong list; the existing integration contract rotates `today_staff` correctly.
- The browser failed to repaint a correct value; the dropdown was rebuilt from stale client state.
- The current booking was absent from the backend status model; current-status coverage includes bookings already in progress.

**Resolution:** `refreshRosterForDropdown()` now reloads the current-status snapshot and Today Staff roster together before rendering the dropdown. The 30-second refresh uses the same path, so submit-time and periodic refreshes apply the same authoritative state.

### Extend mode — add time or an extra service (2026-07-23)
A third reception mode (`เพิ่มเวลา/บริการ`) sits alongside `ลูกค้ามาแล้ว` (walk-in) and `จองเวลา` (booking). Selecting it hides the normal intake form and shows `#extend-mode-panel`, which lists the massages currently in progress. Reception picks one, chooses `เพิ่มเวลา` (`DURATION_UPGRADE`) or `เพิ่มบริการ` (`ADDITIONAL_SERVICE`), and sees `จ่ายแล้ว` / `ต้องจ่ายเพิ่ม` / `เสร็จเวลา` priced live through `api.quoteTransactionPromotion()`. A zero amount renders `ไม่ต้องจ่ายเพิ่ม ฿0.00` rather than a blank or `NaN`. Ticking `ยังไม่ชำระ` records the add-on as pending; the recent-activity row then shows a `ยังไม่ชำระ` badge with `เก็บเงิน` and `ยกเลิก` buttons.

**Busy-guard exemption (PTE-009):** `isMasseuseUnavailableForWalkIn()` returns `false` early when `transactionMode === 'extend'`. The masseuse being extended is necessarily mid-massage, so the walk-in availability guard would otherwise make the feature unreachable. The exemption is deliberately scoped to extend mode only — leaking it into walk-in would undo the QUEUE-002 protection — and `__tests__/staff-availability.surface-equivalence.test.js` asserts both halves of that boundary against the real shipped function.
