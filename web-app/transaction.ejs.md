# `web-app/transaction.ejs.md`

## 1. Header Section

**Overall Purpose:** This EJS template is the rendered-server mirror of `web-app/transaction.html`. It provides the same Thai-first New Customer workflow for walk-in intake, future reservation creation, booking arrival conversion, correction, and normal walk-in cancellation while preserving the same DOM IDs and frontend contracts used by shared JavaScript.

**End-to-End Data Flow:** A user reaches the rendered transaction page, the template sends the same HTML/CSS/JavaScript contract as the static page, and the browser initializes through `shared.js` and `api.js`. Staff select or accept the next walk-in staff member, service, duration, payment, and optional customer contact. Choosing a different available staff member while Walk-in mode is active remains a walk-in; only explicit Booking mode creates a booking. Submissions call `submitTransaction()` for walk-ins or booking arrivals, while correction and cancellation actions call the same shared/API functions as `transaction.html`. Backend writes occur through `/api/transactions`, `/api/bookings`, and `/api/transactions/:transactionId/cancel`; UI refresh then reloads current transactions, current shop status, summaries, and upcoming bookings.

## 2. Module API & Logic Breakdown

### Rendered Template
- **Purpose:** Emits the New Customer page markup for environments that serve EJS templates instead of the static HTML file.
- **Parameters / Props:** None from EJS locals are required by the current template; runtime data is loaded client-side.
- **Returns / Renders:** A Thai-first transaction workflow with hidden legacy selects, visible service/duration/payment button layers, correction controls, upcoming bookings, summaries, recent transactions, and expense panels.
- **Raises / Throws:** None at template render time under the current contract.
- **Usage & Logic Notes:** Must stay mirrored with `transaction.html` for every functional DOM ID, inline helper, and hidden contract control. The mirrored cancellation controls are `#cancel-correction-button` and `cancelLoadedCorrection()`. The mirror must keep `requestedStaffBooking: false` for normal transaction submission because manual staff selection in Walk-in mode is not booking intent.

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

### Non-Next Walk-In Must Not Imply Booking (2026-07-23)
- **Bug Summary:** A manual staff override in Walk-in mode could create booking rows and booking credit even when reception did not choose Booking mode.
- **Validated Hypothesis:** The EJS mirror carried the same hidden `requestedStaffBooking` inference as the static template.
- **Invalidated Hypotheses:** Manual non-next selection always means requested booking; static template changes alone are enough.
- **Resolution:** The EJS mirror now submits `requestedStaffBooking: false` for ordinary walk-ins and documents that explicit Booking mode is the only booking creation UI path.
