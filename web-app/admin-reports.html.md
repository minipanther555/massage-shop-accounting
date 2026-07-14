# `web-app/admin-reports.html`

## 1. Header Section

**Overall Purpose:** `admin-reports.html` renders the manager Financial Reports page. It lets managers choose a date range, filter by staff/service/location, load financial summaries, inspect payment/service/staff/location breakdowns, export the loaded report to CSV, and print the visible report.

**End-to-End Data Flow:** Filter dropdowns call `api.getReportStaff()`, `api.getReportServiceTypes()`, and `api.getReportLocations()`, which read report filter values from the backend. `loadReports()` sends the selected dates and filters through `api.getFinancialReport()`. `backend/routes/reports.js` reads `transactions` and `expenses`, applies the selected filters, returns summary/breakdown objects, and the page renders them into report sections. CSV export serializes the loaded `currentReports` object in the browser.

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
- **Usage & Logic Notes:** Database-provided labels such as payment method, service name, and staff name must use `escapeReportHtml()`.

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

- **Bug Summary:** The page used raw fetches, tab switching relied on global `event`, report labels were not escaped, CSV/PDF exports were fake toasts, and staff breakdown rendering expected backend data that was not returned.
- **Validated Hypothesis:** Source inspection showed the UI/backend contract drift and the backend applied `location` after summary/payment/service queries had already run.
- **Invalidated Hypotheses:** The financial report endpoint did exist; it needed response-shape and filter fixes.
- **Resolution:** Added API wrappers, moved page reads to `api.js`, fixed tab state, escaped report labels, implemented CSV export, removed fake PDF export, fixed backend location filtering, returned `staffBreakdown`, and added `__tests__/admin-reports.contract.present.test.js`.
