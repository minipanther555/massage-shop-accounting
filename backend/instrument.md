# `backend/instrument.md`

## 1. Header Section

*   **Overall Purpose:** This module is singularly responsible for initializing the Sentry Node.js SDK. Its entire purpose is to be the very first piece of code executed by the application to ensure that Sentry is available to catch any and all errors that may occur during the application's startup and runtime, including within other modules' top-level code.
*   **End-to-End Data Flow:** When `server.js` starts, its very first line is `require("./instrument.js")`. This executes the code in this module, which calls `Sentry.init()`. This call configures the Sentry SDK with the project-specific DSN and other settings. From this point forward, the Sentry SDK is active and will automatically capture unhandled exceptions and monitor performance for the entire lifecycle of the Node.js process.

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

*   This file was created as the resolution to a major bug. See `backend/server.md` for the full history of the Sentry integration debugging process.
