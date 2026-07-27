# `backend/routes/transactions.js.md`

## 1. Header Section

*   **Overall Purpose:** This module defines financial transaction endpoints, including atomic conversion of a non-financial reservation after customer arrival. Requested-staff booking credit is tracked separately from base commission so it remains payable without changing Today Staff next-day ranking.

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
        *   `date` (string, optional): UTC date filter used by the current dashboard/New Customer summary views.
    *   **Logic:** Filters transactions by status to include:
        *   `ACTIVE` - Normal, unedited transactions
        *   `CORRECTED` - New transactions that replace edited ones
        *   `EDITED%` - Original transactions that have been edited (using LIKE for partial matching)
    *   **Returns:** Array of transaction objects ordered newest-first by `timestamp DESC, id DESC`, so rows created with the same timestamp still appear in deterministic insertion order. The date-filtered dashboard path is supported by `idx_transactions_recent_date_timestamp`.

*   **`GET /correction-candidates` and `GET /latest-for-correction`**
    *   **Purpose:** Returns correction targets for the active Bangkok business day. The candidate route returns at most ten `ACTIVE` or `CORRECTED` rows newest first; the latest route returns the first candidate.
    *   **Parameters:** `limit` is optional and capped at `10`.
    *   **Logic:** `EDITED` originals are excluded so an audit record cannot be selected again.

*   **`POST /:transactionId/cancel`**
    *   **Purpose:** Cancels a saved current-business-day normal walk-in when the customer leaves before service starts, without deleting the transaction row.
    *   **Parameters (Route):** `transactionId` string, required.
    *   **Parameters (Body):** `reason` string, optional; currently accepted for forward compatibility while the persisted status uses the governed customer-left cancellation label.
    *   **Returns:** The preserved transaction row after status transition, with active booking-credit amount joined as `0` when no active credit remains.
    *   **Logic:** Loads the target by `transaction_id`, rejects missing rows with `404`, and rejects historical, booking-backed, edited, corrected, or already cancelled rows with `409`. Eligible cancellation runs inside `BEGIN IMMEDIATE TRANSACTION`: subtracts the original base commission from `staff.total_fees_earned`, reverses any active linked booking credit through the shared credit reversal helper, and updates the row to `CANCELLED (Customer left before service)`. The update must affect exactly one active row before commit.
    *   **Raises / Throws:** Responds `500` and rolls back if any atomic write fails.

*   **`POST /add-ons`**
    *   **Purpose:** Creates a paid add-on (extra time, or an extra service) linked to an original sale, charging only the additional amount owed. Paid Time Extension `PTE-API-001`.
    *   **Parameters (Body):** `parent_transaction_id` and `add_on_kind` (`DURATION_UPGRADE` | `ADDITIONAL_SERVICE`) required; `service_type`, `location`, `duration` required; `payment_status` (`PAID` | `PENDING`, default `PAID`); `payment_method` required only when `PAID`; optional `masseuse_name` (honoured for `ADDITIONAL_SERVICE` only), `customer_contact`, `start_datetime`, `end_datetime`, `time_window_promotion_override`.
    *   **Returns:** `{ amount_due, add_on, parent }` with `201`.
    *   **Logic:** Rejects an unknown parent (`404`), a non-`ACTIVE` parent (`409`), and a parent that is itself an add-on (`400`, add-ons never nest). Pricing comes from `getTimeWindowQuote()` and is never taken from the client. A `DURATION_UPGRADE` must keep the same service and a strictly longer duration; its amount due is today's price for the longer duration **minus the parent's `payment_amount` actually paid** (not the parent's catalog price, so a promotional original sale is not overcharged), and its commission is the equivalent fee difference so the original commission is not paid twice. An `ADDITIONAL_SERVICE` charges the full current price and full commission. Both are clamped at zero — the route never emits a refund. The window is derived from the parent (`deriveAddOnWindow`) unless supplied. Staff pay is credited only when `payment_status = 'PAID'`. No booking credit is ever created.
    *   **Raises / Throws:** `500` with rollback if the atomic write fails.

*   **`POST /add-ons/:transactionId/settle`**
    *   **Purpose:** Records payment for a `PENDING` add-on, moving it into revenue and payable commission. `PTE-API-002`.
    *   **Parameters:** Route `transactionId`; body `payment_method` required.
    *   **Returns:** The updated add-on row.
    *   **Logic:** Rejects a non-add-on row (`400`), a cancelled add-on (`409`), and an already-settled add-on (`409`). Settlement uses a **guarded** `UPDATE ... WHERE payment_status = 'PENDING' AND status = 'ACTIVE'` and re-checks the affected row count before crediting commission, so two concurrent submits cannot both book the same money. The parent row is never touched.

*   **`POST /add-ons/:transactionId/cancel`**
    *   **Purpose:** Cancels an add-on entered in error, restoring the staff member's earlier free-at time. `PTE-API-003`.
    *   **Parameters (Route):** `transactionId`, required.
    *   **Returns:** The cancelled add-on row.
    *   **Logic:** Rejects a non-add-on row (`400`) and an already-cancelled add-on (`409`), using the same guarded-update pattern. Commission is reversed only when the add-on was `PAID`. The occupied window restores itself with no extra logic, because `GET /api/staff/current-status` selects the latest-ending `ACTIVE` row and a cancelled add-on is no longer `ACTIVE`. Distinct from `POST /:transactionId/cancel`, which cancels an original walk-in; the differing path-segment counts mean the two routes cannot shadow each other.

*   **`POST /quote`**
    *   **Purpose:** Returns the current server-calculated customer price for an active service selection before reception saves the transaction.
    *   **Parameters (Body):** `service_type`, `location`, `duration`, and optional boolean `time_window_promotion_override`.
    *   **Returns:** Base/final price, discount metadata, automatic/override state, and unchanged `masseuseFee`.
    *   **Logic:** Uses `backend/services/time-window-promotion-service.js`; it evaluates `Asia/Bangkok` time and the request-bound branch configuration. It never trusts a browser-supplied price.

*   **`POST /`**
    *   **Purpose:** Creates a new transaction. This is the main endpoint for submitting the "New Transaction" form. It also contains the logic for handling "transaction corrections" (edits).
    *   **Parameters (Body):** A JSON object containing all transaction details (`masseuse_name`, `service_type`, `location`, `duration`, etc.). If `original_transaction_id` is provided, the endpoint enters "edit mode".
    *   **Logic:** Every new transaction computes `business_day` through `backend/utils/business-day.js` so late-night Bangkok transactions before 2:00 a.m. belong to the previous business day. This value is stored alongside the legacy UTC-derived `date`. When the browser or booking flow provides `start_datetime` and `end_datetime`, the route persists those canonical service-window timestamps so Current Shop Status and booking buffer logic do not infer timing from creation time. The route recomputes any time-window promotion on the server and stores the base price, final paid amount, discount amount, promotion type, and label. The normal `services.masseuse_fee` is always used unchanged.
    *   **Logic (Booking Arrival):** With `booking_id`, the handler loads the `BOOKED` reservation and treats its service, duration, location, and optional requested staff as authoritative. One `BEGIN IMMEDIATE TRANSACTION` inserts the transaction, marks the booking `COMPLETED`, and creates one separate active `฿50` credit for booking arrivals.
    *   **Walk-In Staff Selection Boundary:** A normal walk-in remains a walk-in even when reception manually selects a non-next staff member. The route ignores stale `requested_staff_booking` payloads for ordinary transaction creation; only explicit booking rows passed by `booking_id` can create booking credits.
    *   **Failure Modes:** Missing or closed bookings, duplicate conversion, invalid staff/service, and violation of another booking's 15-minute buffer are rejected. Any write failure rolls back the conversion.
*   **Logic (Edit Mode):** When `original_transaction_id` is present, the handler will:
        1.  Find the original transaction.
        2.  Reverse the `masseuse_fee` from the original transaction's masseuse and reverse any active linked booking credit through the same helper used by cancellation.
        3.  Update the status of the original transaction to 'EDITED'.
        4.  Create the new transaction with a `corrected_from_id` linking it back to the original.
    *   **Correction Isolation:** A correction with `requested_staff_booking` remains a normal walk-in; it does not create an immediate booking or `฿50` credit solely because reception selected a replacement staff member.
    *   **Correction Availability:** Before the write transaction starts, a correction derives eligible replacement staff from the current Bangkok business day's active Today Staff roster, excluding the original transaction from workload and busy-state calculations. A missing replacement defaults to the least-workloaded eligible staff member with stable Today Staff position as the tie-break; a stale/busy manual replacement is rejected with `409` before audit or financial rows change.
    *   **Returns:** The newly created transaction object, including `business_day` when the schema column is present.

## 3. Dependency Mapping

*   **Upstream Dependencies:**
    *   **Calling Modules/Services:** Primarily called by the frontend (`web-app/api.js`, `web-app/shared.js`) and integration tests.
*   **Downstream Dependencies:**
*   **Called Modules/Services:** `backend/models/database.js`, `backend/utils/business-day.js`, and `backend/services/booking-service.js` for timestamp parsing, conflict checks, and requested-staff credit eligibility.
    *   **Promotion Dependency:** `backend/services/time-window-promotion-service.js` for branch-configured Bangkok-time quote and final-price calculation.

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

*   **Bug Summary (August 2025):** The `/recent` endpoint was not properly filtering transactions by date, causing the daily summary page to show transactions from multiple days instead of just today's transactions. Additionally, the new transaction page was showing different data than the daily summary page due to inconsistent API calls.
*   **Validated Hypothesis:** The SQL query construction in the `GET /recent` endpoint had a critical syntax error. The query was written as `WHERE status = 'ACTIVE' OR status = 'CORRECTED' OR status LIKE 'EDITED%' AND date = ?` which, due to missing parentheses, caused the `AND date = ?` condition to only apply to the last status condition, not to all of them. This meant that `ACTIVE` and `CORRECTED` transactions were returned regardless of date, bypassing the date filter entirely.
*   **Invalidated Hypotheses:**
    *   The issue was NOT in the database schema - the `date` field was properly defined as `DATE NOT NULL`
    *   The issue was NOT in the data types - all dates were stored as strings in consistent format
    *   The issue was NOT in the parameter passing - the date parameter was correctly received and passed to the SQL query
    *   The issue was NOT in the frontend API calls - the frontend was correctly passing the date parameter
*   **Root Cause:** Missing parentheses in the SQL WHERE clause caused the date filter to only apply to `EDITED%` transactions, not to `ACTIVE` and `CORRECTED` transactions.
*   **Resolution:** Fixed the SQL query by adding parentheses: `WHERE (status = 'ACTIVE' OR status = 'CORRECTED' OR status LIKE 'EDITED%') AND date = ?` to ensure the date filter applies to all status conditions.
*   **Status:** ✅ **RESOLVED** - Date filtering now works correctly, returning only today's transactions from the `/recent` endpoint.

*   **Bug Summary (2026-07-13):** The New Customer recent transactions list did not reliably put the just-submitted transaction first. Rows with identical timestamps could show older transactions before newer ones, and the frontend helper reversed a backend result that was not actually newest-first.
*   **Validated Hypothesis:** `GET /recent` used `ORDER BY timestamp ASC LIMIT ?`, then `shared.js#getRecentTransactions()` took the tail of the loaded array and reversed it. This split ordering responsibility across backend and frontend and had no deterministic tie-break for same-timestamp rows.
*   **Invalidated Hypotheses:**
    *   The transaction insert failed.
    *   The New Customer page was reading a different database than Daily Summary for recent transactions.
    *   The issue was only a CSS/responsive rendering problem.
*   **Resolution:** `/recent` now returns the authoritative newest-first order with `ORDER BY timestamp DESC, id DESC LIMIT ?`. `shared.js#getRecentTransactions()` preserves that order and only applies the visible limit.

*   **Bug Summary (2026-07-14):** Current Shop Status could show a staff member free too early because transaction rows did not persist the actual service start/end datetimes submitted by New Customer or booking arrival conversion.
*   **Validated Hypothesis:** `POST /api/transactions` destructured `start_datetime` and `end_datetime` but the insert omitted both fields, forcing `backend/routes/staff.js` to derive the busy window from transaction creation timestamp plus duration.
*   **Resolution:** Transaction creation now inserts `start_datetime` and `end_datetime`; legacy rows without those fields remain supported by the Current Shop Status fallback.

*   **Bug Summary (August 2025):** Transaction editing styling is not working on the new transaction page, while it works correctly on the daily summary page. EDITED transactions should appear with red highlight and strikethrough styling, but they appear unstyled on the new transaction page.
*   **Validated Hypothesis:** The backend transaction editing logic is working correctly - it properly sets `EDITED` status on original transactions and `CORRECTED` status on new transactions. The issue is in the frontend styling logic, not the backend.
*   **Invalidated Hypotheses:**
    *   The issue was NOT in the backend transaction editing logic - statuses are set correctly
    *   The issue was NOT in the API endpoints - both `/transactions` and `/transactions/recent` return correct data
    *   The issue was NOT in the database - transaction statuses are stored correctly
*   **Root Cause:** Frontend styling logic is missing or different between the daily summary page (where styling works) and the new transaction page (where styling doesn't work).
*   **Status:** 🔄 **IN PROGRESS** - Backend confirmed working, frontend styling issue needs investigation.

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

### Manual Walk-In Staff Selection and Credit Reads (updated 2026-07-23)
* **Bug Summary:** A present walk-in manually assigned to a non-next staff member could be converted into an unexpected completed booking and booking credit.
* **Validated Hypothesis:** Non-next selection does not always mean booking intent; the next queue member may be unable to perform the requested massage.
* **Invalidated Hypotheses:** The transaction route should trust `requested_staff_booking` on ordinary walk-ins; the credit should be merged into `transactions.masseuse_fee`; selecting non-next staff should automatically switch the browser into non-financial reservation mode.
* **Resolution:** `POST /` now treats ordinary manual staff selection as a normal walk-in and ignores stale immediate `requested_staff_booking` payloads. `GET /`, `GET /recent`, and the create response still expose `booking_credit_amount` for actual booking-arrival transactions; the paginated count query aliases `transactions` consistently with filtered conditions.

### Recent Transactions Used Unstable Timestamp Storage and Ordering (2026-07-14)
* **Bug Summary:** A successful submit updated revenue/count but the new row remained below older preview transactions, hiding its compact credit badge and making correction selection stale.
* **Validated Hypothesis:** The insert passed a JavaScript `Date` object to SQLite, yielding environment-dependent values, while raw string ordering compared UTC `Z` timestamps with `+07:00` timestamps lexically rather than chronologically.
* **Invalidated Hypotheses:** The transaction was not committed; frontend refresh did not run; responsive CSS reordered rows.
* **Resolution:** New transactions persist `timestamp.toISOString()`. Paginated, recent, and latest-for-correction queries order by `datetime(timestamp) DESC, id DESC`, so offset-aware timestamps use real chronological order with a deterministic tie-break.

### Current-Day Walk-In Cancellation Needed an Audit-Preserving Reversal Path (2026-07-23)
* **Bug Summary:** Reception could correct a wrong walk-in but had no governed way to cancel a saved current-day walk-in when the customer left before massage started.
* **Validated Hypothesis:** Cancellation needed to be a server-side status transition with atomic reversal of active staff effects, not a delete or a frontend-only hide.
* **Invalidated Hypotheses:** Deleting the transaction would preserve audit history; zeroing price/fee fields would be enough for reports; booking-backed cancellations could safely reuse normal walk-in semantics without a separate booking-state decision.
* **Resolution:** Added `POST /api/transactions/:transactionId/cancel`, kept the row with `CANCELLED (Customer left before service)`, reversed base commission and active linked booking credit, rejected ineligible targets, and relied on existing active-status report/status filters to exclude cancelled rows from active revenue, workload, busy state, and payday totals.

### Add-On API Client Double-Stringified Its Body (2026-07-23)
`createAddOn`, `settleAddOn`, and `cancelAddOn` in `web-app/api.js` originally passed `body: JSON.stringify(payload)`, but `APIClient.request()` already stringifies `config.body`. The browser would therefore have sent a double-encoded string and the server would have rejected every add-on call. Integration tests did not catch it because Supertest posts to the route directly, bypassing the API client. Found while integrating the walk-in cancellation branch, whose `cancelTransaction` used the correct raw-object convention. All three now pass raw objects, matching every other client method.
