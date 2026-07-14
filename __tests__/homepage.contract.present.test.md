# `__tests__/homepage.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This test guards the Home Dashboard UI/database contract. It verifies that both static and EJS home pages load API-backed shared state before rendering dashboard widgets, escape dynamic activity/payment labels, and keep behavior-critical scripts mirrored.

**End-to-End Data Flow:** The test reads `web-app/index.html` and `web-app/index.ejs` as source text. It asserts that `loadData()` runs before dashboard/recent/payment rendering, that the refresh loop also reloads data, and that rendered transaction/payment strings pass through `escapeHomeHtml()`.

## 2. Module API & Logic Breakdown

### Jest suite `home dashboard API/data contract`

- **Purpose:** Preserve homepage data freshness and safe rendering.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail result.
- **Raises / Throws:** Fails if either mirrored page stops loading shared API state, stops escaping dynamic labels, or drifts from the other page.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** Jest test runner.
- **Input Data Contracts / Schemas:** Source text from `web-app/index.html` and `web-app/index.ejs`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** Node filesystem APIs and Jest assertions.
- **Output Data Contracts / Schemas:** Test status.

## 4. Bug & Resolution History

- **Bug Summary:** The Home Dashboard rendered staff counts, recent activity, expense counts, and payment breakdown from `appData` without first calling `loadData()`, and dynamic activity/payment labels entered `innerHTML` without escaping.
- **Validated Hypothesis:** Source inspection showed the page called update functions immediately after auth while relying on `appData` populated by shared loaders that were never called on this page.
- **Invalidated Hypotheses:** The dashboard summary endpoint itself was not absent.
- **Resolution:** Call `loadData()` before initial render and each refresh, escape dynamic labels, keep `index.html` and `index.ejs` mirrored, and add this guard.
