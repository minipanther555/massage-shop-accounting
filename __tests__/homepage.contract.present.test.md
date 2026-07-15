# `__tests__/homepage.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This test guards the Home Dashboard UI/database contract. It verifies that both static and EJS home pages load API-backed shared state before rendering dashboard widgets, expose compact clickable drilldown cards, keep manager links inside the top navigation, render truthful loading/error/success state, trust the already date-scoped transaction array, escape dynamic labels, and keep behavior-critical scripts mirrored.

**End-to-End Data Flow:** The test reads `web-app/index.html` and `web-app/index.ejs` as source text. It asserts that `refreshHomeData()` runs `loadData()` before dashboard/recent/payment rendering, that the refresh loop uses the same path, that manager links are inside the top navigation boundary, that live/fallback states are explicit, that the three dashboard cards expose click/drilldown contracts, and that rendered transaction/payment/staff/expense strings pass through `escapeHomeHtml()`.

## 2. Module API & Logic Breakdown

### Jest suite `home dashboard API/data contract`

- **Purpose:** Preserve homepage data freshness, card interactivity, mirrored templates, and safe rendering.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail result.
- **Raises / Throws:** Fails if either mirrored page stops loading shared API state first, separates manager links below the dashboard, hides date-scoped transactions with a `Date`/string comparison, loses data-state signaling or compact cards, stops escaping dynamic labels, presents a future non-financial booking as revenue, hides the staff busy/booking-buffer explanation, or drifts from the other page.

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

- **Bug Summary:** Home Recent Activity rendered every future `BOOKED` reservation as green `+฿50.00`, even though the reservation had not arrived, been paid, or created a transaction.
- **Validated Hypothesis:** The Home booking mapper assigned `amount: 50` directly; the booking API and local database kept the reservation non-financial.
- **Invalidated Hypotheses:** The future booking insertion path was not corrupting payment data; the ฿50 value belongs to the deferred requested-staff credit shown only after arrival.
- **Resolution:** Mark booking activity amounts as non-financial and render `ยังไม่ชำระ` while retaining the booking detail's deferred-credit explanation.

- **Bug Summary:** Home Active Staff detail exposed the internal `booking_buffer` label and ambiguous bare timestamps.
- **Validated Hypothesis:** The renderer discarded the available start/end/buffer fields and concatenated only the raw state, count, and one time value.
- **Invalidated Hypotheses:** The current-status API did not need a new state or database change; it already returned the required operational times.
- **Resolution:** Require both mirrored templates to render plain-language busy and booking-buffer explanations, including the 15-minute buffer and free-again time.

- **Bug Summary:** The Home dashboard cards were static and could not show today's revenue, active staff, or expense detail inline.
- **Validated Hypothesis:** Source inspection showed the cards were plain `.dashboard-card` containers with no `data-home-card` contract, no detail regions, and no toggle/render functions.
- **Invalidated Hypotheses:** The Home page needed new backend routes; the existing Daily Summary compact-card pattern could not be reused.
- **Resolution:** Extend this test to require compact clickable cards, one behavior-critical script shared by both templates, and escaping for transaction, staff, and expense detail labels.

- **Bug Summary:** Manager links were below the dashboard and the Revenue drilldown filtered date-scoped `Date` objects against a date string, producing a false empty list.
- **Validated Hypothesis:** Source and browser tracing showed the API array was populated while the extra client comparison rejected every dated transaction.
- **Invalidated Hypotheses:** The Home page did not need a new endpoint or database change.
- **Resolution:** Require top-grid manager navigation, explicit Home loading/error/success state, and removal of the redundant `transaction.date === today` filter.
