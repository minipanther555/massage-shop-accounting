# `web-app/transaction.html.md`

## 1. Header Section

*   **Overall Purpose:** This file provides the primary user interface for creating new financial transactions and for initiating the correction of existing ones. It is the main data entry point for the application's daily operations. The page is designed as a single-page application experience, with dynamic dropdowns and client-side logic to guide the user through creating a valid transaction. It also includes dashboard-like elements, such as a mini-summary of the day's performance and a log of recent transactions, to provide immediate context to the user.

*   **End-to-End Data Flow:**
    1.  **Initialization:** On page load (`DOMContentLoaded`), the inline script calls `loadData()` from `shared.js`. This function fetches initial state from multiple backend API endpoints: staff roster, all available services, and payment methods.
    2.  **User Interaction:** The user interacts with a series of dropdown menus. The form uses cascading logic: selecting a "Location" populates the "Service Type" dropdown; selecting a "Service Type" populates the "Duration" dropdown. Each selection progressively filters the available options to ensure only valid combinations can be chosen. As the user makes selections, the "Service Price" and "Masseuse Fee" are dynamically updated on the page by looking up the values in the data fetched during initialization.
    3.  **Submission:** The user clicks the "Submit Transaction" button, triggering the `handleSubmit()` function. This function packages the form data into a JSON object.
    4.  **API Call:** The data is passed to `submitTransaction()` in `shared.js`, which then uses the `api.createTransaction()` method from `api.js` to send a `POST` request to the `/api/transactions` backend endpoint.
    5.  **Backend Processing:** The backend validates the data, calculates fees, and inserts a new record into the `transactions` table in the database.
    6.  **UI Refresh:** Upon a successful API response, the frontend script clears the form and calls `updateAllDisplays()`, which re-fetches the recent transactions and daily summary to immediately reflect the new entry on the page.

## 2. Module API & Logic Breakdown

This module consists of an HTML structure and a large inline `<script>` block that orchestrates the page's logic.

*   **`transaction-form` (HTML Form):**
    *   **Purpose:** The main form for capturing all transaction details.
    *   **Key Inputs:**
        *   `masseuse`: Dropdown for staff names, populated from the staff roster.
        *   `location`: Dropdown for "In-Shop" or "Home Service".
        *   `service`: Dropdown for service names, populated based on the selected location.
        *   `duration`: Dropdown for duration, populated based on the selected service.
        *   `payment`: Dropdown for payment methods.
        *   `startTime` / `endTime`: Time fields, auto-calculated based on service selection.
        *   `original-transaction-id`: A hidden input that stores the ID of a transaction being corrected.

*   **`handleSubmit(event)` (JavaScript Function):**
    *   **Purpose:** The primary function that handles form submission.
    *   **Logic:** It prevents the default form submission, performs client-side validation to ensure all required fields are filled, constructs the data payload, and calls the `submitTransaction` function from `shared.js`.

*   **`populateDropdowns()` (JavaScript Function):**
    *   **Purpose:** To populate the `select` elements with data fetched from the API during page load.
    *   **Logic:** It reads the `CONFIG.settings` object (populated by `loadData()`) and dynamically creates `<option>` elements for masseuses, services (initially), and payment methods. It also attaches the critical `change` event listeners that drive the form's cascading logic.

*   **Cascading Update Functions (`updateServiceOptions()`, `updateDurationOptions()`, `updatePricing()`):**
    *   **Purpose:** A set of functions that are triggered by `change` events on the dropdowns.
    *   **Logic:**
        *   `updateServiceOptions`: Filters the master service list based on the selected location.
        *   `updateDurationOptions`: Filters the master service list based on the selected service and location.
        *   `updatePricing`: Finds the specific service object that matches the user's final selection and updates the price/fee display fields.

*   **Correction Logic (`loadCorrection()`, `checkForEdit()`):**
    *   **Purpose:** To handle the editing/correction of a transaction.
    *   **Logic:** The `checkForEdit` function checks `sessionStorage` for a transaction to be edited (placed there by another page). The `loadCorrection` button fetches the most recent transaction via the API. Both will pre-populate the form with the details of an existing transaction and set a hidden input field (`original-transaction-id`) to link the new, corrected transaction to the old one.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** A user navigates to this page, typically from `index.html`. Logic from other pages (e.g., a "reports" page) can also redirect here with a transaction in `sessionStorage` to trigger edit mode.
    *   **Input Data Contracts / Schemas:** The page consumes data from the following backend API endpoints:
        *   `GET /api/services`: Returns `[{ service_name, duration_minutes, location, price, masseuse_fee }]`
        *   `GET /api/services/payment-methods`: Returns `[{ method_name }]`
        *   `GET /api/staff/roster`: Returns `[{ position, masseuse_name, status }]`
        *   `GET /api/reports/summary/today`: Returns `{ total_revenue, transaction_count, ... }`
        *   `GET /api/transactions/recent`: Returns `[{ transaction_id, masseuse_name, ... }]`

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
          "original_transaction_id": "string | null"
        }
        ```

## 4. Bug & Resolution History

*   *(This is the first documentation for this file, so the history is blank.)*
