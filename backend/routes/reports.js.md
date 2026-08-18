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

### Add-on aware aggregation (2026-07-23)
Paid Time Extension stores add-ons as ordinary `transactions` rows linked by `parent_transaction_id`, which makes money aggregate correctly for free but makes counting and pending money wrong by default. Both rules now come from the single shared helper `backend/services/add-on-sql.js`:

- **`isSettled('t')`** is applied to every revenue and fee sum, so a `PENDING` add-on contributes nothing to revenue, masseuse fees, or payable staff pay until reception settles it.
- **`countsAsMassage('t')`** is applied to `massage_count` and `weekly_massages`, so a `DURATION_UPGRADE` does not inflate the number of massages performed while an `ADDITIONAL_SERVICE` does.

The `transaction_count` figures are deliberately **not** filtered by the massage-count rule: they sit beside `total_revenue` and an add-on genuinely is a separate sale, so excluding it there would misreport activity.

### End-day preserves outstanding add-ons (2026-07-23)
`POST /end-day` summarises the day and then deletes the day's transaction rows. The delete now excludes any `PENDING` add-on **and the parent it points at**, as a linked pair in one predicate, so neither can be orphaned and an outstanding payment cannot silently vanish. Ordinary settled transactions are still cleared as before. The wider correctness of this deletion (no status filter; UTC rather than Bangkok business day) is tracked separately as item 22 in `00-project-docs/steps/current-steps.md`.

### The day's money did not count an edited transaction (2026-08-18)
- **Bug Summary:** After reception edited a transaction, that customer's money vanished from every same-day money figure this router produces. A walk-in recorded at 399 and corrected to 798 contributed **zero** to the day's takings, so the cash the manager expected for that customer simply was not there. The row list still showed the edit; the headline number did not. Operator-reported 2026-08-18.
- **Validated Hypothesis:** An edit does not update a transaction in place. It relabels the original `EDITED (Corrected by <id>)` (`backend/routes/transactions.js:693-696`) and inserts a replacement carrying status `CORRECTED` (`:713`). **After an edit neither row is `ACTIVE`**, so all six of this router's live-row filters skipped both. The date-range reports (`:109`, `:148`, `:169`, `:240`) already filtered `status IN ('ACTIVE', 'CORRECTED')` and were always right, which is why the two report families disagreed on exactly the edited transactions.
- **Invalidated Hypotheses:** That the write path should mark the replacement `ACTIVE` instead — that contradicts `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md` FR-003 and §6, which fix the status vocabulary, and it would silently disable the audit-integrity repair tool at `backend/routes/transactions.js:782-825` that matches on the `CORRECTED` status. The audit trail is a fraud control, so degrading it was not an acceptable cost. That a "not cancelled" predicate would do — it would also admit the superseded row beside its replacement and double-count every edited transaction's money.
- **Resolution:** All six money filters now call `countsAsLiveWork()` from `backend/services/transaction-status-sql.js`, yielding `status IN ('ACTIVE', 'CORRECTED')` — identical to the date-range reports that were already correct. The converted sites are the daily report's transaction summary (`:25`), its payment breakdown (`:46`) and its per-masseuse performance (`:64`); today's summary (`:205`) and its payment breakdown (`:216`); and the end-day archive (`:457`). `isSettled()` is unchanged at all four sites that carry it — the settled-money rule is orthogonal to the live-row rule. The date-range reports were deliberately left untouched as the reference implementation.

### 🔴 The permanent archive was the worst of it (2026-08-18)
`POST /end-day` summed the day into `daily_summaries` filtering live rows only, and **then** deleted the day's transaction rows (`:480-492`). Nothing writes `archived_transactions`. So closing a day that contained an edit archived a total missing that money *and* destroyed the source rows — permanently unrecoverable, and the wrong figure was the one a manager would audit months later. Fixing the on-screen summary while leaving this would have moved the defect into the books. The archive query now uses the same shared predicate; `tests/integration/edited-transaction-end-day-archive.integration.test.js` pins it in its own database, because end-day empties the day and would otherwise destroy any fixture sharing it.

The **pending-add-on preservation subquery** in that same handler (`:485`, `:488`) was deliberately **not** changed. It selects rows to *rescue from deletion*, not rows to count, and add-on rows are inserted `ACTIVE` and are never relabelled by an edit — an edit replaces the parent, not the add-on. Widening it would change what survives the close, which is `PTE-END-001`'s contract, not this one's.
