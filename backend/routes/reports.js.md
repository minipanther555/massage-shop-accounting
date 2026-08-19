# `backend/routes/reports.js`

## 1. Header Section

**Overall Purpose:** This Express router owns financial reporting endpoints for Daily Summary, manager reports, end-day archive/reset behavior, and report filter lists. It reads `transactions`, `expenses`, `services`, and `daily_summaries`.

**End-to-End Data Flow:** Frontend pages call report endpoints through `web-app/api.js`. Daily/weekly/monthly endpoints aggregate transaction and expense tables for fixed periods. `GET /financial` accepts date/staff/service/location filters, applies them to `transactions`, aggregates revenue, fees, expenses, payment methods, locations, services, and staff, then returns the grouped report plus filtered `detailRows` so `admin-reports.html` can open mini tables under clicked report tiles without a second API request.

## 2. Module API & Logic Breakdown

### `GET /daily/:date?`

- **Purpose:** Return a daily summary for one **Bangkok business day**.
- **Parameters / Props:** Optional `date` path parameter, interpreted as a business day. With no parameter the current Bangkok business day is derived from `backend/utils/business-day.js`.
- **Returns / Renders:** `date`, `business_day` (the same value, named explicitly), transaction summary, expense summary, payment breakdown, masseuse performance, and net profit.
- **Raises / Throws:** Returns 500 on database failure.
- **Usage & Logic Notes:** The three transaction queries filter `transactions.business_day` and the shared `isLiveWork()` predicate, so a correction replacement (`CORRECTED`) is counted and its superseded original (`EDITED (Corrected by …)`) is not. The expense query still filters `expenses.date`, because `expenses` has no business-day column until `RIT-DB-001` adds one; it is given the same day string so the report stays about one day rather than two.

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

- **Purpose:** Return the current **Bangkok business day's** compact report summary.
- **Parameters / Props:** None.
- **Returns / Renders:** `business_day`, transaction summary, and payment breakdown.
- **Raises / Throws:** Returns 500 on database failure.
- **Usage & Logic Notes:** Both queries filter `transactions.business_day` and `isLiveWork()`. `business_day` is returned so this panel and `GET /api/staff/current-status` can be compared directly instead of assumed equal — between 02:00 and 07:00 Bangkok they previously reported two different days.

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

### Add-on aware aggregation (2026-07-23)
Paid Time Extension stores add-ons as ordinary `transactions` rows linked by `parent_transaction_id`, which makes money aggregate correctly for free but makes counting and pending money wrong by default. Both rules now come from the single shared helper `backend/services/add-on-sql.js`:

- **`isSettled('t')`** is applied to every revenue and fee sum, so a `PENDING` add-on contributes nothing to revenue, masseuse fees, or payable staff pay until reception settles it.
- **`countsAsMassage('t')`** is applied to `massage_count` and `weekly_massages`, so a `DURATION_UPGRADE` does not inflate the number of massages performed while an `ADDITIONAL_SERVICE` does.

The `transaction_count` figures are deliberately **not** filtered by the massage-count rule: they sit beside `total_revenue` and an add-on genuinely is a separate sale, so excluding it there would misreport activity.

### End-day preserves outstanding add-ons (2026-07-23)
`POST /end-day` summarises the day and then deletes the day's transaction rows. The delete now excludes any `PENDING` add-on **and the parent it points at**, as a linked pair in one predicate, so neither can be orphaned and an outstanding payment cannot silently vanish. Ordinary settled transactions are still cleared as before. The wider correctness of this deletion (no status filter; UTC rather than Bangkok business day) is tracked separately as item 22 in `00-project-docs/steps/current-steps.md`.

### Today's figures moved onto the Bangkok business day and the shared live-work rule (2026-08-19, `RIT-LIVE-002`)
Two defects sat in the same queries. Today's figures filtered `status = 'ACTIVE'` inline, so a correction replacement — the row that records the massage that actually happened — was invisible to the money panel while the staff panel counted it. And "today" was the **UTC calendar date**, so between 02:00 and 07:00 Bangkok the money panel and the staff panel were keyed to two different days.

- **`GET /daily/:date?` and `GET /summary/today`** now filter `transactions.business_day` and the shared `isLiveWork()` predicate from `backend/services/transaction-status-sql.js`. Both return `business_day` explicitly. Spec: `reception-intake-truth-and-non-massage-income.md` FR-001, FR-002, AC-002, AC-003.
- **`POST /end-day`** adopted `isLiveWork()` for its archive totals only. Its **day basis is deliberately unchanged**: the two `DELETE` statements in the same handler share that value, and moving it would change which rows are removed. That wider question stays tracked as item 22 in `00-project-docs/steps/current-steps.md`.
- **The date-range reports at `/weekly`, `/monthly` and `/financial` were not touched.** They already read `status IN ('ACTIVE','CORRECTED')` and filter `transactions.date`, and they still do. `tests/integration/reports.date-range.regression.integration.test.js` locks their figures: it was written and run GREEN **before** this change and again after, with a fixture whose `business_day` values deliberately differ from its `date` values so a column swap fails loudly.
- **A row with a NULL `business_day` is excluded from today's figures**, per FR-002's Failure Modes — never coalesced onto the current day. It stays in the ledger and a data-integrity query still finds it; that assertion is in `tests/integration/reports.today-business-day.corrected-row.integration.test.js`.
- **Query plans improved.** `EXPLAIN QUERY PLAN` on the old and new forms: the today-scoped queries went from `SCAN transactions` to `SEARCH transactions USING INDEX idx_transactions_business_day_staff (business_day=?)`. `transactions.date` is not indexed; `business_day` is.
