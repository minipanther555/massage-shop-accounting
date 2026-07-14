# Expense Source-of-Truth Presence Test

## Overall Purpose

This regression test prevents Daily Summary from applying page-local aliases to expense descriptions. Expense names must come from the expense API and database so every page displays the same value.

## Contract

- Both static and EJS summary templates render `expense.description` with HTML escaping.
- Neither template contains `getExpenseDisplayName` or the preview seed marker.

## Dependency Mapping

- **Upstream:** Jest.
- **Downstream:** `web-app/summary.html` and `web-app/summary.ejs`.

## Bug & Resolution History

Daily Summary previously translated two raw demo descriptions to `Big C` and `Oil` only at render time. New Customer correctly showed the database values, producing inconsistent labels. The regression contract requires the database/API value to remain the single source of truth.
