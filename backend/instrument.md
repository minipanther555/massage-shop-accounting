# `backend/instrument.md`

## 1. Header Section

*   **Overall Purpose:** This module is singularly responsible for initializing the Sentry SDKs for both the Node.js backend and the vanilla JavaScript frontend. Its entire purpose is to be the very first piece of code executed by the application to ensure that Sentry is available to catch any and all errors that may occur during the application's startup and runtime. The co-located documentation here serves as the central reference for all Sentry-related configuration and debugging.
*   **End-to-End Data Flow (Backend):** When `server.js` starts, its very first line is `require("./instrument.js")`. This executes the code in this module, which calls `Sentry.init()` for the Node SDK. From this point forward, the Sentry SDK is active and will automatically capture unhandled exceptions and monitor performance for the entire lifecycle of the Node.js process.
*   **End-to-End Data Flow (Frontend):** When a user's browser loads any HTML page from the `web-app`, the Sentry Browser SDK loader script is loaded from a CDN. This script then loads the full SDK, and the `Sentry.init()` call within `web-app/shared.js` is executed via a `Sentry.onLoad` callback. Once initialized, the SDK automatically captures uncaught frontend JavaScript errors and sends them to the appropriate Sentry.io project.

## 2. Module API & Logic Breakdown

This module does not export any functions or classes. It executes the `Sentry.init()` function directly.

*   **`Sentry.init(options)`:**
    *   **Purpose:** To configure and activate the Sentry SDK.
    *   **Parameters / Props:**
        *   `dsn`: (string, required) The unique Data Source Name for the Sentry project.
        *   `sendDefaultPii`: (boolean) Set to `true` to include potentially personally identifiable information in error reports.
        *   `tracesSampleRate`: (number) The percentage of transactions to be captured for performance monitoring (1.0 means 100%).
    *   **Logic Notes:** Per the official Sentry documentation for SDK version 8 and above, critical integrations like `httpIntegration` and `expressIntegration` are enabled automatically by default when the SDK detects it is running in an Express environment. They do not need to be manually added to the `integrations` array.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** `backend/server.js` (must be the first `require`).
    *   **Input Data Contracts / Schemas:** None.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:** `@sentry/node` SDK.
    *   **Output Data Contracts / Schemas:** Sends configuration and telemetry data to the Sentry.io service.

## 4. Bug & Resolution History

*   See `backend/server.md` for the full history of the **backend** Sentry integration debugging process.

*   **Bug Summary (August 2024):** Multi-day, complex failure to initialize the Sentry Browser SDK on the frontend. The final symptom was that error events were being successfully sent from the browser but were rejected by the Sentry server with a `403 Forbidden` HTTP status code.
*   **Validated Hypothesis:** The root cause was a **DSN Mismatch**. The `Sentry.init` call in `web-app/shared.js` was using the DSN (public key) for the **backend** Sentry project instead of the correct DSN for the **frontend** project. Sentry's server correctly identified that a key for one project was being used to send events to another and rejected the event as forbidden.
*   **Invalidated Hypotheses:**
    *   **Simple Race Condition:** The initial hypothesis was that the test error was firing before `Sentry.init` completed. While plausible, wrapping the init call in `Sentry.onLoad` did not fix the issue.
    *   **Ad-Blocker Interference:** It was hypothesized that a browser extension was blocking the Sentry CDN scripts. Testing in an incognito window with shields down disproved this.
    *   **Content Security Policy (CSP) Issues:** This was a major contributing factor that masked the true root cause. The initial CSP was missing directives for `*.sentry-cdn.com` and `*.sentry.io`, preventing the SDK from loading at all. After fixing this, a `worker-src: blob:` directive was also found to be missing, which prevented the Sentry `onLoad` callback from firing. Correcting the CSP was necessary but did not resolve the final `403` error.
*   **Resolution:**
    1.  **Systematic Debugging:** A temporary diagnostic script (`diagnostics/sentry_verify_diag.js`) using Playwright was created to automate testing and provide detailed browser console and network logs. This was crucial in identifying the `403` error.
    2.  **External Knowledge Gap Protocol:** A formal research query was generated to understand all possible causes for a Sentry `403` error. The research confirmed that DSN mismatch was a primary cause.
    3.  **Final Fix:** The incorrect backend DSN in `web-app/shared.js` was replaced with the correct frontend DSN provided by the user. Subsequent tests with the Playwright script showed a `200 OK` response from Sentry, and the event appeared in the dashboard.
