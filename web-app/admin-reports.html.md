# `web-app/admin-reports.html`

## 1. Header Section

**Overall Purpose:** `admin-reports.html` renders the manager Financial Reports page. It lets managers choose a date range, filter by staff/service/location, load financial summaries, inspect payment/service/staff/location breakdowns, export the loaded report to CSV, and print the visible report.

**End-to-End Data Flow:** Filter dropdowns call `api.getReportStaff()`, `api.getReportServiceTypes()`, and `api.getReportLocations()`, which read report filter values from the backend. `loadReports()` sends the selected dates and filters through `api.getFinancialReport()`. `backend/routes/reports.js` reads `transactions` and `expenses`, applies the selected filters, returns summary/breakdown objects plus filtered `detailRows`, and the page renders them into report sections. Summary cards and report-section rows are clickable tiles that open one inline mini table directly below the selected tile group; sibling tiles dim while the table is open so the selected source data stays visually dominant. CSV export serializes the loaded `currentReports` object in the browser.

## 2. Module API & Logic Breakdown

### `initializeFilters()`

- **Purpose:** Populate staff, service, and location filters from backend data.
- **Parameters / Props:** None.
- **Returns / Renders:** Adds `<option>` rows to `#filter-staff`, `#filter-service`, and `#filter-location`.
- **Raises / Throws:** Catches API errors and logs them.
- **Usage & Logic Notes:** Uses shared `api.js` methods instead of page-local raw fetches.

### `setTimePeriod(period, clickedTab = null)`

- **Purpose:** Update tab state, set date inputs for a standard period, and load reports.
- **Parameters / Props:** `period` string; `clickedTab` button element.
- **Returns / Renders:** Updates active tab class and date input values.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Does not rely on implicit global browser `event`.

### `loadReports()`

- **Purpose:** Load the financial report for the selected filters.
- **Parameters / Props:** Reads date/staff/service/location inputs.
- **Returns / Renders:** Sets `currentReports` and calls `displayReports()`.
- **Raises / Throws:** Catches API errors and renders a retry state.
- **Usage & Logic Notes:** Calls `api.getFinancialReport()` with `from_date`, `to_date`, `staff_member`, `service_type`, and `location`.

### `displayReports()`

- **Purpose:** Render summary cards and report sections from `currentReports`.
- **Parameters / Props:** Reads `currentReports`.
- **Returns / Renders:** Updates summary cards and `#reports-container`.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Database-provided labels such as payment method, service name, and staff name must use `escapeReportHtml()`. After replacing `#reports-container`, call `setupReportTileToggles()` so generated report rows become keyboard/click toggles.

### `setupReportTileToggles(scope)`, `toggleReportTileDetail(tileKey, tile)`, `clearReportTileSelection()`

- **Purpose:** Attach accessible click/keyboard behavior to summary cards and report-section rows.
- **Parameters / Props:** Optional `scope` element for newly rendered reports; `tileKey` string from `data-report-summary-card` or `data-report-tile`; `tile` clicked element.
- **Returns / Renders:** Inserts one `.report-detail-panel` immediately after the selected tile, removes any prior panel, marks the selected tile `.is-open`, and dims sibling tiles with `.report-tile-dimmed`.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** The detail panel uses `grid-column: 1 / -1`, so it occupies the full row below the tile group instead of overlapping adjacent tiles.

### `renderReportTileDetailTable(tileKey)` and Table Helpers

- **Purpose:** Convert the loaded `currentReports.detailRows` into the mini table for a selected tile.
- **Parameters / Props:** `tileKey` identifies summary totals, revenue/cost/performance rows, payment methods, services, or staff.
- **Returns / Renders:** HTML for `.report-detail-table`, including transaction rows with revenue/base/booking columns or expense/profit rows with totals.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Transaction/service/staff/payment filters are applied client-side from the already filtered backend `detailRows`, and dynamic row strings are escaped before interpolation.

### `exportReport(format)` and `exportToCSV()`

- **Purpose:** Export the loaded report.
- **Parameters / Props:** `format` currently supports `csv`.
- **Returns / Renders:** Creates a browser download for a CSV file.
- **Raises / Throws:** Shows a toast if no report is loaded.
- **Usage & Logic Notes:** PDF export is intentionally not shown because there is no backend or client PDF generator.

### `printReport()`

- **Purpose:** Print the visible loaded report.
- **Parameters / Props:** None.
- **Returns / Renders:** Calls `window.print()` when a report is loaded.
- **Raises / Throws:** Shows a toast if no report is loaded.

### `escapeReportHtml(value)`

- **Purpose:** Escape report labels before HTML interpolation.
- **Parameters / Props:** `value`, any scalar value.
- **Returns / Renders:** Escaped string.
- **Raises / Throws:** None expected.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** `backend/routes/admin.js` serves the page at `GET /api/admin/reports-page`; browser events invoke page functions.
- **Input Data Contracts / Schemas:** Report filters `{ from_date, to_date, staff_member, service_type, location }`; financial report response with `summary`, `serviceBreakdown`, `staffBreakdown`, `dateRange`, `breakdowns.by_payment_method`, `breakdowns.by_location`, `expenses`, and `filters`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** `web-app/api.js` report methods and browser Blob/download APIs.
- **Output Data Contracts / Schemas:** Rendered report sections and CSV rows.

## 4. Bug & Resolution History

### Financial Report Tiles Needed Inline Source Tables (2026-07-15)
- **Bug Summary:** Browser review found summary cards and report-section tiles were static; clicking totals such as Total Revenue or Total Transactions should show the source transactions/expenses in a mini table below the selected tile.
- **Validated Hypothesis:** The page had static `.summary-card`, `.report-section`, and `.report-item` markup with no tile keys, no toggle handler, and no detail-table renderer. The prior implementation risked overlap because no full-width detail panel contract existed.
- **Invalidated Hypotheses:** A separate modal or below-the-fold table was not acceptable because the desired behavior is inline under the clicked tile. A new API request per click was unnecessary because the report response can include filtered source rows.
- **Resolution:** Summary cards and report items now use data attributes and accessible toggles, one `.report-detail-panel` opens below the selected tile group, sibling tiles dim, and the panel renders transaction/expense source rows from `currentReports.detailRows`.

- **Bug Summary:** The page used raw fetches, tab switching relied on global `event`, report labels were not escaped, CSV/PDF exports were fake toasts, and staff breakdown rendering expected backend data that was not returned.
- **Validated Hypothesis:** Source inspection showed the UI/backend contract drift and the backend applied `location` after summary/payment/service queries had already run.
- **Invalidated Hypotheses:** The financial report endpoint did exist; it needed response-shape and filter fixes.
- **Resolution:** Added API wrappers, moved page reads to `api.js`, fixed tab state, escaped report labels, implemented CSV export, removed fake PDF export, fixed backend location filtering, returned `staffBreakdown`, and added `__tests__/admin-reports.contract.present.test.js`.

### Requested-Staff Pay Was Not Reconciliable (2026-07-14)
- **Bug Summary:** Manager reports showed one staff-fee number and did not identify the separate `฿50` booking credit.
- **Validated Hypothesis:** The backend report now provides base, credit, and total fields; the page must display those components directly rather than infer them.
- **Invalidated Hypotheses:** Booking credit belonged in service revenue; a separate unlinked statistics page was sufficient.
- **Resolution:** The cost summary shows `ค่าแรงนวด`, `ค่าจองพนักงาน`, and `ค่าแรงรวม`; per-staff cards show base pay, booking credit, and total staff pay.
