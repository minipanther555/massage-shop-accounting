# `__tests__/admin-reports.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This test guards the manager Reports page contract. It verifies that report filters and financial reports use shared `api.js` methods, that report labels from the database are escaped, that tab switching no longer depends on a global browser event, that CSV export is real, and that the financial endpoint applies location filtering consistently.

**End-to-End Data Flow:** The test reads `web-app/admin-reports.html`, `web-app/api.js`, and `backend/routes/reports.js` as source text. It asserts that the page calls `api.getReportStaff()`, `api.getReportServiceTypes()`, `api.getReportLocations()`, and `api.getFinancialReport()`, while the backend filters financial queries by `transactions.location` and returns `staffBreakdown`.

## 2. Module API & Logic Breakdown

### Jest suite `admin reports page API/database contract`

- **Purpose:** Preserve Reports page UI-to-database wiring.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail result.
- **Raises / Throws:** Fails on direct page API fetches, missing API wrappers, unsafe report label rendering, global-event tab handling, fake PDF export controls, or missing location/staff backend contract.
- **Usage & Logic Notes:** This is static contract coverage; it should be paired with browser checks when changing report layout or export behavior.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** Jest test runner.
- **Input Data Contracts / Schemas:** Source text from `web-app/admin-reports.html`, `web-app/api.js`, and `backend/routes/reports.js`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** Node filesystem APIs and Jest assertions.
- **Output Data Contracts / Schemas:** Test status.

## 4. Bug & Resolution History

- **Bug Summary:** `admin-reports.html` used raw fetches, depended on global `event` in tab switching, rendered report labels without escaping, showed fake CSV/PDF exports, and expected staff breakdown data that the backend did not return. The backend also applied `location` only after some financial queries had already executed.
- **Validated Hypothesis:** Source inspection showed the page/backend contract drift.
- **Invalidated Hypotheses:** The financial report endpoint itself was not absent; it needed corrected filtering and response shape.
- **Resolution:** Added shared API wrappers, switched page reads to `api.js`, fixed tab state, escaped report labels, implemented CSV export, removed the fake PDF export button, applied location to all financial queries, returned staff breakdown, and added this guard.
