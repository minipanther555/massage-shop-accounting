# Expense Source-of-Truth Presence Test

## Overall Purpose

This regression test prevents Daily Summary from applying page-local aliases to expense descriptions. Expense names must come from the expense API and database so every page displays the same value.

## Contract

- Both static and EJS summary templates render `expense.description` with HTML escaping.
- Neither template contains `getExpenseDisplayName` or the preview seed marker.
- New Customer expense deletion calls `api.deleteExpense(expense.id)`, reloads API data, and awaits the shared removal helper before refreshing side panels.

## Dependency Mapping

- **Upstream:** Jest.
- **Downstream:** `web-app/summary.html`, `web-app/summary.ejs`, `web-app/transaction.html`, `web-app/transaction.ejs`, `web-app/shared.js`, and `web-app/api.js`.

## Bug & Resolution History

Daily Summary previously translated two raw demo descriptions to `Big C` and `Oil` only at render time. New Customer correctly showed the database values, producing inconsistent labels. The regression contract requires the database/API value to remain the single source of truth.

New Customer also previously deleted expense rows only from `appData.expenses`, which could make the UI look corrected while the `expenses` table still contained the row. The shared helper now deletes by database id through `/api/expenses/:id`, reloads `loadTodayData()`, and only then refreshes the page side panels.
