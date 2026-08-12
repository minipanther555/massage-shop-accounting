# `web-app/transaction.ejs.md`

## 1. Header Section

**Overall Purpose:** This EJS template is the rendered-server mirror of `web-app/transaction.html`. It provides the same Thai-first New Customer workflow for walk-in intake, future reservation creation, booking arrival conversion, correction, and normal walk-in cancellation while preserving the same DOM IDs and frontend contracts used by shared JavaScript.

**End-to-End Data Flow:** A user reaches the rendered transaction page, the template sends the same HTML/CSS/JavaScript contract as the static page, and the browser initializes through `shared.js` and `api.js`. Staff select or accept the next walk-in staff member, service, duration, payment, and optional customer contact. Submissions call `submitTransaction()` for walk-ins or booking arrivals, while correction and cancellation actions call the same shared/API functions as `transaction.html`. Backend writes occur through `/api/transactions`, `/api/bookings`, and `/api/transactions/:transactionId/cancel`; UI refresh then reloads current transactions, current shop status, summaries, and upcoming bookings.

## 2. Module API & Logic Breakdown

### Rendered Template
- **Purpose:** Emits the New Customer page markup for environments that serve EJS templates instead of the static HTML file.
- **Parameters / Props:** None from EJS locals are required by the current template; runtime data is loaded client-side.
- **Returns / Renders:** A Thai-first transaction workflow with hidden legacy selects, visible service/duration/payment button layers, correction controls, upcoming bookings, summaries, recent transactions, and expense panels.
- **Raises / Throws:** None at template render time under the current contract.
- **Usage & Logic Notes:** Must stay mirrored with `transaction.html` for every functional DOM ID, inline helper, and hidden contract control. The mirrored cancellation controls are `#cancel-correction-button` and `cancelLoadedCorrection()`.

### `loadCorrection(transactionId = null)`
- **Purpose:** Loads the latest or selected current-business-day correction target into the form.
- **Parameters / Props:** `transactionId` string optional.
- **Returns / Renders:** Populates the form fields and reveals `#cancel-correction-button`.
- **Raises / Throws:** API errors are shown through existing toast/error surfaces.
- **Usage & Logic Notes:** The target ID is stored in `appData.originalTransactionId` and remains the server-authoritative cancellation/correction target.

### `cancelLoadedCorrection()`
- **Purpose:** Cancels the loaded normal walk-in after receptionist confirmation.
- **Parameters / Props:** None; reads `appData.originalTransactionId`.
- **Returns / Renders:** Calls `cancelCorrectionTransaction()`, clears the form on success, hides the cancellation button, and refreshes displays.
- **Raises / Throws:** None to the page; shared/API errors are shown as Thai-first toast feedback.
- **Usage & Logic Notes:** The action is hidden during ordinary transaction entry and appears only after a target is loaded.

### `exitCorrectionMode()`
- **Purpose:** Clears correction/cancellation state in both local page state and shared `appData`.
- **Parameters / Props:** None.
- **Returns / Renders:** Hides the banner, removes correction styling, resets correction info text, and hides `#cancel-correction-button`.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** Must clear `appData.correctionMode` and `appData.originalTransactionId` because shared helpers and browser smoke assert against those values.

## 3. Dependency Mapping

**Upstream Dependencies (Inputs):**
- Served by the Express/static template stack when the rendered transaction route is used.
- Consumes client-side data from `web-app/shared.js`, `web-app/api.js`, and backend endpoints documented in `transaction.html.md`.

**Downstream Dependencies (Outputs):**
- Calls `POST /api/transactions` for walk-in saves and booking arrival conversion.
- Calls `POST /api/bookings` and booking status endpoints for reservation workflow.
- Calls `GET /api/transactions/latest-for-correction`, `GET /api/transactions/correction-candidates`, and `POST /api/transactions/:transactionId/cancel` for correction/cancellation workflow.

## 4. Bug & Resolution History

### Missing Mirror Documentation for Cancellation Control (2026-07-23)
- **Bug Summary:** The EJS mirror carried functional New Customer cancellation behavior but had no co-located module specification.
- **Validated Hypothesis:** The rendered template should document the same cancellation contract as `transaction.html` because both files are touched and must remain mirrored.
- **Invalidated Hypotheses:** The static `transaction.html.md` alone was sufficient for the rendered template; the cancellation button could be treated as static markup only.
- **Resolution:** Added this co-located mirror spec and documented the cancellation control, shared reset contract, and backend route dependency.

### Sub-Panel Generalization Mirrored From transaction.html (2026-08-09, ISVSB-UI-001)
- **Bug Summary:** `transaction.html` gained a generalized sub-panel for multi-variant service categories (Oil → Oil massage + Deep oil; Aroma → Aroma massage + Deep aroma) by renaming `#combo-service-panel` → `#variant-service-panel`, adding `#variant-service-title`, deleting `getPreferredCategoryService` + `preferredServiceNames`, adding `sortVariantServices` + `openVariantPanel` helpers, and reordering `serviceCategoryDefinitions` so `coconut` precedes `oil`. The mirror had to receive the identical change or the shared source-contract test `__tests__/transaction.oil-category-promotion.present.test.js` (which asserts `test.each([html, ejs])`) would fail.
- **Validated Hypothesis:** A single commit updating both files together keeps the mirror invariant satisfied. `diff web-app/transaction.html web-app/transaction.ejs` continues to show only the two CSRF-token placeholder differences (L6 `<meta>` and L50 hidden input) — the intended mirror invariant.
- **Resolution:** All button-layer edits from ISVSB-UI-001 applied to this file at the same line numbers. The rendered template's behavior is now defined by the same rules described in [`web-app/transaction.html.md`](web-app/transaction.html.md) §2 (see "Service, Duration, and Payment Button Layer" and the "Superseded (2026-08-09, ISVSB-UI-001)" note under bug history). This co-located doc intentionally does not re-derive those rules; it points at the html co-located doc so a single edit keeps both in sync.
