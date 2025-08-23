# `backend/routes/transactions.js.md`

## 1. Header Section

*   **Overall Purpose:** This module defines all API endpoints related to creating, reading, and managing financial transactions. It is the primary endpoint for the user-facing "New Transaction" page and is critical for the application's core data-entry functionality. It handles transaction creation, edit/correction logic, and provides data for summaries and reports.

## 2. Module API & Logic Breakdown

*   **`GET /`**
    *   **Purpose:** Fetches a paginated list of all transactions, with optional filtering by `date` and `status`.
    *   **Parameters (Query):**
        *   `page` (number, optional, default: 1): The page number for pagination.
        *   `limit` (number, optional, default: 50): The number of results per page.
        *   `date` (string, optional, format: YYYY-MM-DD): Filters transactions for a specific date.
        *   `status` (string, optional): Filters transactions by status (e.g., 'ACTIVE'). If 'all' is provided, status filtering is disabled.
    *   **Returns:** `{ transactions: [...], pagination: { ... } }`

*   **`POST /`**
    *   **Purpose:** Creates a new transaction. This is the main endpoint for submitting the "New Transaction" form. It also contains the logic for handling "transaction corrections" (edits).
    *   **Parameters (Body):** A JSON object containing all transaction details (`masseuse_name`, `service_type`, `location`, `duration`, etc.). If `original_transaction_id` is provided, the endpoint enters "edit mode".
    *   **Logic (Edit Mode):** When `original_transaction_id` is present, the handler will:
        1.  Find the original transaction.
        2.  Reverse the `masseuse_fee` from the original transaction in the `staff` table.
        3.  Update the status of the original transaction to 'EDITED'.
        4.  Create the new transaction with a `corrected_from_id` linking it back to the original.
    *   **Returns:** The newly created transaction object.

## 3. Dependency Mapping

*   **Upstream Dependencies:**
    *   **Calling Modules/Services:** Primarily called by the frontend (`web-app/api.js`, `web-app/shared.js`) and integration tests.
*   **Downstream Dependencies:**
    *   **Called Modules/Services:** `backend/models/database.js` for all database interactions.

## 4. Bug & Resolution History

*   **Bug Summary (August 2024):** The integration test for the transaction edit feature was failing. It successfully created two transactions but the subsequent `GET /api/transactions` call returned an empty array, causing the test's verification step to fail.
*   **Validated Hypothesis:** The logic for building the pagination `COUNT` query in the `GET /` handler was flawed. When no filters were applied (like `status=all`), the `if (conditions.length > 0)` block was skipped, and the `countParams` array was not correctly populated, leading to an incorrect total count and a failure to retrieve the correct set of transactions.
*   **Invalidated Hypotheses:**
    *   The issue was not a race condition; direct database queries showed the data was present immediately.
    *   The issue was not a client-side filtering problem or a staff name mismatch; the raw API response itself was empty.
*   **Resolution:** The logic for building the `countParams` array was corrected to ensure it was always derived from the main `params` array, correctly handling cases with and without filters. This synchronized the main query and the count query, resolving the bug.
