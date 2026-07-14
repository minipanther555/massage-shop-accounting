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

* **`shared recent transaction helper keeps API newest-first ordering`**
  * **Purpose:** Ensures `shared.js#getRecentTransactions()` applies `slice(0, limit)` and does not reverse backend ordering.
  * **Parameters:** None.
  * **Returns:** Jest assertion result.

* **`backend recent endpoint orders newest first with a deterministic tie-break`**
  * **Purpose:** Ensures `/api/transactions/recent` contains `ORDER BY timestamp DESC, id DESC LIMIT ?`.
  * **Parameters:** None.
  * **Returns:** Jest assertion result.

## 3. Dependency Mapping

* **Upstream Dependencies:** Browser-reported New Customer walk-in regression; BKG-001 AC-008.
* **Downstream Dependencies:** `web-app/transaction.html`, `web-app/transaction.ejs`, `web-app/shared.js`, `backend/routes/transactions.js`.

## 4. Bug & Resolution History

* **Bug Summary:** The New Customer page kept the same masseuse selected and did not reliably show the newest transaction first after submit.
* **Validated Hypothesis:** Roster refresh and ordering contracts were missing from permanent tests.
* **Resolution:** Added source-level guards for submit refresh order and deterministic recent transaction ordering.
