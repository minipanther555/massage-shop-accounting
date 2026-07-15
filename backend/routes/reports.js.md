# `backend/routes/reports.js`

## 1. Header Section

**Overall Purpose:** This Express router owns financial reporting endpoints for Daily Summary, manager reports, end-day archive/reset behavior, and report filter lists. It reads `transactions`, `expenses`, `services`, and `daily_summaries`.

**End-to-End Data Flow:** Frontend pages call report endpoints through `web-app/api.js`. Daily/weekly/monthly endpoints aggregate transaction and expense tables for fixed periods. `GET /financial` accepts date/staff/service/location filters, applies them to `transactions`, aggregates revenue, fees, expenses, payment methods, locations, services, and staff, then returns the grouped report plus filtered `detailRows` so `admin-reports.html` can open mini tables under clicked report tiles without a second API request.

## 2. Module API & Logic Breakdown

### `GET /daily/:date?`

- **Purpose:** Return a daily summary for one date.
- **Parameters / Props:** Optional `date` path parameter.
- **Returns / Renders:** Transaction summary, expense summary, payment breakdown, masseuse performance, and net profit.
- **Raises / Throws:** Returns 500 on database failure.

### `GET /weekly`

- **Purpose:** Return current-week masseuse fees.
- **Parameters / Props:** None.
- **Returns / Renders:** Week start/end and masseuse fee rows.
- **Raises / Throws:** Returns 500 on database failure.

### `GET /monthly/:year?/:month?`

- **Purpose:** Return monthly totals, expenses, and service breakdown.
- **Parameters / Props:** Optional year and month path parameters.
- **Returns / Renders:** Month range, totals, expenses, and service rows.
- **Raises / Throws:** Returns 500 on database failure.

### `GET /summary/today`

- **Purpose:** Return today's compact report summary.
- **Parameters / Props:** None.
- **Returns / Renders:** Transaction summary plus payment breakdown.
- **Raises / Throws:** Returns 500 on database failure.

### `GET /financial`

- **Purpose:** Return the manager financial report for selected filters.
- **Parameters / Props:** Query `{ from_date, to_date, staff_member, service_type, location }`.
- **Returns / Renders:** `{ summary, serviceBreakdown, staffBreakdown, dateRange, breakdowns, detailRows, expenses, filters }`. `detailRows.transactions` contains filtered transaction source rows with base fee and `booking_credit_amount`; `detailRows.expenses` contains filtered expense rows.
- **Raises / Throws:** Returns 500 on database failure.
- **Usage & Logic Notes:** The `location` filter applies to `transactions.location` before all summary, breakdown, and detail-row queries run. Active requested-staff credits are joined separately and returned as base commission, booking credit, and combined staff pay. Detail rows are bounded by the same selected report date range and filters that produced the clicked totals.

### `POST /end-day`

- **Purpose:** Archive current-day totals and clear current-day transaction/expense rows.
- **Parameters / Props:** None.
- **Returns / Renders:** Cleared counts and daily summary.
- **Raises / Throws:** Returns 500 on database failure.
- **Usage & Logic Notes:** This is a destructive operation and should be treated separately from read-only report auditing.

### `GET /staff`, `GET /service-types`, `GET /locations`

- **Purpose:** Return distinct filter values for the manager reports page.
- **Parameters / Props:** None.
- **Returns / Renders:** Arrays of strings.
- **Raises / Throws:** Returns 500 on database failure.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** `web-app/api.js`, `web-app/admin-reports.html`, Daily Summary code, and end-day controls.
- **Input Data Contracts / Schemas:** Report filter query strings and end-day POST request.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** `backend/models/database.js`.
- **Output Data Contracts / Schemas:** Aggregated report objects, filtered transaction/expense detail rows, filter arrays, and end-day mutation confirmation.

## 4. Bug & Resolution History

### Financial Report Tiles Needed Source Rows (2026-07-15)
- **Bug Summary:** Browser review found summary cards and report breakdown tiles showed totals but did not reveal the transactions or expenses behind those totals.
- **Validated Hypothesis:** `GET /financial` returned aggregate totals and grouped breakdowns only; the frontend could not build a mini source table for a clicked tile from the existing response.
- **Invalidated Hypotheses:** This did not require a schema change or a new endpoint per tile. The filtered report payload already has the selected date/staff/service/location context, so the same response can carry bounded source rows.
- **Resolution:** Added filtered `detailRows.transactions` with active booking credit joins and filtered `detailRows.expenses`, ordered for manager drilldowns.

- **Bug Summary:** The manager financial endpoint applied `location` only after some queries had already executed and did not return `staffBreakdown` even though the page rendered it.
- **Validated Hypothesis:** Source inspection showed `location` appended after payment breakdown and before a location-only join, and no `staffBreakdown` property in the response.
- **Invalidated Hypotheses:** The endpoint was not missing.
- **Resolution:** Apply `location` to the base `transactions` where clause before all financial queries, group location by `transactions.location`, add staff breakdown aggregation, and add `__tests__/admin-reports.contract.present.test.js`.

### Requested-Staff Credit Was Invisible In Financial Reports (2026-07-14)
- **Bug Summary:** `booking_credits` paid staff correctly but report totals and per-staff rows only summed `transactions.masseuse_fee`, so managers could not see or reconcile the extra `฿50`.
- **Validated Hypothesis:** Credit is a separate pay component and must be joined into reports without changing base commission or Today Staff ranking.
- **Invalidated Hypotheses:** The credit belonged in service revenue; `total_masseuse_fees` should remain base-only while another page handled credit.
- **Resolution:** Daily, weekly, monthly, today-summary, and financial report queries join active credits. Financial responses expose `base_masseuse_fees`, `booking_credits`, `total_staff_pay`, plus per-staff `baseFees`, `bookingCredits`, and `totalStaffPay`; net profit subtracts combined staff pay.
