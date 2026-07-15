# `__tests__/transaction.walkin-refresh.present.test.js`

## 1. Header Section

* **Overall Purpose:** Locks the New Customer walk-in refresh contract after browser review showed that a completed walk-in did not advance the staff dropdown or recent transaction list.
* **End-to-End Data Flow:** The test reads the mirrored transaction templates, shared frontend helper, and recent-transaction route source. It verifies that the submit success path refreshes roster state before form reset and that recent transactions preserve backend newest-first ordering.

## 2. Module API & Logic Breakdown

* **`web-app/transaction.html refreshes Today Staff dropdown state after next-in-line submit` / EJS mirror**
  * **Purpose:** Ensures both templates call `refreshRosterForDropdown()` between successful submit and `clearForm()`.
  * **Parameters:** Template path from `test.each`.
  * **Returns:** Jest assertion result.
  * **Usage & Logic Notes:** Prevents the stale `autoSelectedMasseuse` regression that kept the dropdown on the served staff.

* **`web-app/transaction.html does not reference render-local next staff state during page setup` / EJS mirror**
  * **Purpose:** Ensures `populateDropdowns()` uses page-level `autoSelectedMasseuse` state and does not reference the render-local `nextInLineName` variable after `renderMasseuseDropdown()` returns.
  * **Parameters:** Template path from `test.each`.
  * **Returns:** Jest assertion result.
  * **Usage & Logic Notes:** Prevents a page-initialization `ReferenceError` that aborts service option population and leaves the large service button grid blank.

* **`shared recent transaction helper keeps API newest-first ordering`**
  * **Purpose:** Ensures `shared.js#getRecentTransactions()` applies `slice(0, limit)` and does not reverse backend ordering.
  * **Parameters:** None.
  * **Returns:** Jest assertion result.

* **`backend recent endpoint orders newest first with a deterministic tie-break`**
  * **Purpose:** Ensures `/api/transactions/recent` contains `ORDER BY datetime(t.timestamp) DESC, t.id DESC LIMIT ?`.
  * **Parameters:** None.
  * **Returns:** Jest assertion result.

## 3. Dependency Mapping

* **Upstream Dependencies:** Browser-reported New Customer walk-in regression; BKG-001 AC-008.
* **Downstream Dependencies:** `web-app/transaction.html`, `web-app/transaction.ejs`, `web-app/shared.js`, `backend/routes/transactions.js`.

## 4. Bug & Resolution History

* **Bug Summary:** The New Customer page kept the same masseuse selected and did not reliably show the newest transaction first after submit.
* **Validated Hypothesis:** Roster refresh and ordering contracts were missing from permanent tests.
* **Resolution:** Added source-level guards for submit refresh order and deterministic recent transaction ordering.

* **Bug Summary:** Browser review showed the `บริการ` section rendered only its label, with the expected Thai-first service buttons missing.
* **Validated Hypothesis:** `populateDropdowns()` logged `nextInLineName` outside the `renderMasseuseDropdown()` scope, throwing a `ReferenceError` before the service option and button initialization completed.
* **Resolution:** The templates now log `autoSelectedMasseuse`, the page-level next-staff state, and the test locks out the out-of-scope reference.

* **Bug Summary:** ISO timestamps with `Z` and `+07:00` offsets sorted lexically, leaving a newly submitted transaction below an older preview row.
* **Validated Hypothesis:** The API must order parsed datetime values, not raw strings, while retaining the `id` tie-break.
* **Resolution:** Updated the route and source contract to require `datetime(t.timestamp) DESC, t.id DESC`.
