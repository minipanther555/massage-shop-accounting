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

*   **`GET /recent`**
    *   **Purpose:** Fetches recent transactions for the dashboard display, specifically designed to show transactions that should be visible to users (including edited ones).
    *   **Parameters (Query):**
        *   `limit` (number, optional, default: 5): Maximum number of transactions to return.
    *   **Logic:** Filters transactions by status to include:
        *   `ACTIVE` - Normal, unedited transactions
        *   `CORRECTED` - New transactions that replace edited ones
        *   `EDITED%` - Original transactions that have been edited (using LIKE for partial matching)
    *   **Returns:** Array of transaction objects ordered by timestamp (most recent first).

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

*   **Bug Summary (August 2025):** The transaction edit styling feature was not working. When a transaction is edited, the original transaction should be marked with "EDITED" status and the new transaction should have "CORRECTED" status, but both remained "ACTIVE".
*   **Validated Hypothesis:** The backend editing logic in the `POST /` endpoint was not working correctly. When `originalTransactionId` is provided, the endpoint should:
        1. Set the new transaction status to 'CORRECTED'
        2. Update the original transaction status to 'EDITED (Corrected by [new_id])'
        3. Set the `corrected_from_id` field on the new transaction
    However, none of these actions were being performed - both transactions remained with "ACTIVE" status.
*   **Invalidated Hypotheses:**
    *   The issue was NOT in the frontend styling logic - the backend was not sending the correct status data
    *   The issue was NOT in the frontend data loading - the API was returning incorrect status values
    *   The issue was NOT in the UI rendering - there was no "EDITED" data to render
*   **Root Cause:** Backend editing logic failure in the `POST /` endpoint when handling transactions with `originalTransactionId`.
*   **Status:** ✅ **RESOLVED** - Backend editing logic was fixed to properly set transaction statuses.

*   **Bug Summary (August 2025):** The `/recent` endpoint was not returning EDITED transactions, preventing them from appearing on the daily summary page and causing the styling bug where edited transactions appeared to have no visual indication.
*   **Validated Hypothesis:** The SQL query in the `GET /recent` endpoint was explicitly filtering out EDITED transactions with `WHERE status IN ('ACTIVE', 'CORRECTED')`, which excluded any transaction with a status containing "EDITED".
*   **Invalidated Hypotheses:**
    *   The issue was NOT in the frontend rendering logic - the frontend was working correctly when it received EDITED status data
    *   The issue was NOT in the database - EDITED transactions existed in the database
    *   The issue was NOT in the authentication - the API endpoint was accessible
*   **Root Cause:** The `/recent` endpoint's SQL query was filtering out EDITED transactions, preventing them from reaching the frontend.
*   **Resolution:** Modified the SQL query from `WHERE status IN ('ACTIVE', 'CORRECTED')` to `WHERE status = 'ACTIVE' OR status = 'CORRECTED' OR status LIKE 'EDITED%'` to include EDITED transactions.
*   **Status:** ✅ **RESOLVED** - EDITED transactions are now returned by the API and properly styled on the frontend.

*   **Bug Summary (August 2024):** The integration test for the transaction edit feature was failing. It successfully created two transactions but the subsequent `GET /api/transactions` call returned an empty array, causing the test's verification step to fail.
*   **Validated Hypothesis:** The logic for building the pagination `COUNT` query in the `GET /` handler was flawed. When no filters were applied (like `status=all`), the `if (conditions.length > 0)` block was skipped, and the `countParams` array was not correctly populated, leading to an incorrect total count and a failure to retrieve the correct set of transactions.
*   **Invalidated Hypotheses:**
    *   The issue was not a race condition; direct database queries showed the data was present immediately.
    *   The issue was not a client-side filtering problem or a staff name mismatch; the raw API response itself was empty.
*   **Resolution:** The logic for building the `countParams` array was corrected to ensure it was always derived from the main `params` array, correctly handling cases with and without filters. This synchronized the main query and the count query, resolving the bug.

## 5. Testing & Verification

*   **Comprehensive Test Suite:** Created `tests/integration/transaction-status-integration.test.js` to validate the transaction status logic, including:
    *   Happy Path Test: Confirms EDITED transactions are returned when status filter includes them
    *   Multiple Case Test: Confirms multiple EDITED transactions work correctly
    *   Edge Case Test: Confirms various EDITED status formats are handled
    *   Integration Test: Confirms the full edit workflow works end-to-end
*   **Visual Verification:** Created `tests/diagnostics/verify-styling-works.spec.js` to perform end-to-end testing of the styling functionality, including:
    *   Proper authentication through the browser UI
    *   Navigation to the daily summary page
    *   Verification that EDITED transactions appear with correct styling
    *   Screenshot capture for visual verification
*   **Test Results:** All tests pass, confirming that:
    *   EDITED transactions are now returned by the `/recent` API endpoint
    *   Frontend styling is applied correctly (edited-transaction class, edited-status-badge)
    *   Edit buttons are properly disabled for EDITED transactions
