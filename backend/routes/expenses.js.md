# Expenses Route Module Specification

## Overall Purpose
This router owns same-day expense persistence for staff-facing pages. New Customer and Daily Summary read expense rows from this API so descriptions, amounts, timestamps, totals, and deletes reflect the `expenses` table rather than page-local aliases or transient browser state.

## End-to-End Data Flow
A staff user enters an expense on the New Customer page. `web-app/shared.js#addExpense()` calls `api.createExpense()`, which posts to `POST /api/expenses`; the route inserts an `expenses` row and returns it. `loadTodayData()` later reads `GET /api/expenses?date=YYYY-MM-DD` and maps each database row, including `id`, into `appData.expenses`. When the user deletes an expense, `shared.js#removeExpense()` calls `api.deleteExpense(expense.id)`, which sends `DELETE /api/expenses/:id`; the route deletes the database row and the UI reloads from the API.

## Other Writers of This Table
This router is no longer the only writer. `POST /api/transactions/add-ons` with `add_on_kind = 'TIP'`
inserts an `expenses` row as the second half of a tip — `backend/routes/transactions.js`,
`createMoneyOnlyAddOn()`, `RIT-MONEY-002`. A tip is income and expense in the same amount, so the book
stays net neutral while recording that the cash passed through the shop to a masseuse (feature spec
`reception-intake-truth-and-non-massage-income.md`, `FR-005`). Those rows differ from the ones this
router writes in two ways: they populate `masseuse_name` and `business_day` (both `NULL` on every row
this router creates), and their `description` ends with the paired transaction's id, which is the only
link between the two halves — `expenses` has no foreign key to `transactions`. Their `date` is the UTC
calendar day, exactly as `POST /` fills it, so every reader keyed on `date` treats a tip like any other
expense.

## Module API & Logic Breakdown

### `GET /`
- **Purpose:** Return expenses for a requested date.
- **Parameters:** `date` query string, optional, `YYYY-MM-DD`; defaults to the current UTC date string.
- **Returns:** Array of `expenses` rows ordered by `timestamp DESC`.
- **Raises / Throws:** HTTP 500 when database read fails.
- **Usage & Logic Notes:** This is the display source of truth for New Customer and Daily Summary expense lists.

### `POST /`
- **Purpose:** Create a new expense row.
- **Parameters:** JSON body `{ description, amount, date? }`.
- **Returns:** HTTP 201 with the inserted row.
- **Raises / Throws:** HTTP 400 for missing description/amount; HTTP 500 for database write failures.
- **Usage & Logic Notes:** The route stores the provided description verbatim. Display code must escape it rather than alias or reinterpret it.

### `GET /summary/today`
- **Purpose:** Return same-day expense count and total.
- **Parameters:** None.
- **Returns:** `{ expense_count, total_expenses }`.
- **Raises / Throws:** HTTP 500 when database read fails.
- **Usage & Logic Notes:** Used for summary cards where only totals are needed.

### `DELETE /:id`
- **Purpose:** Delete one stored expense row by database id.
- **Parameters:** `id` path parameter.
- **Returns:** `{ message: "Expense deleted successfully" }`.
- **Raises / Throws:** HTTP 404 if the row is absent; HTTP 500 for database delete failures.
- **Usage & Logic Notes:** UI callers must delete by the id loaded from `GET /api/expenses`, not by a browser array index.

## Dependency Mapping

### Upstream Dependencies
- `backend/server.js` mounts this router under `/api/expenses`.
- `web-app/api.js` exposes `getExpenses`, `createExpense`, `deleteExpense`, and `getTodayExpenseSummary`.
- `web-app/shared.js` uses those API wrappers for New Customer and Daily Summary state refresh.

### Downstream Dependencies
- `backend/models/database.js`: `expenses` table.

## Bug & Resolution History

### Bug Summary: New Customer Expense Delete Was Local-Only (2026-07-14)
The New Customer expense delete button removed a row from `appData.expenses` without calling `DELETE /api/expenses/:id`, so a refresh could bring the supposedly deleted database row back.

### Validated Hypothesis
`GET /api/expenses` already returned row ids and `api.deleteExpense()` already mapped to the route, but `shared.js#removeExpense()` never used that API.

### Resolution
`removeExpense()` now deletes by database id and reloads `loadTodayData()` after the route succeeds.
