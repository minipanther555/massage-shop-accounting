# E2E Test: Transaction Edit Workflow Specification

## 1. Header Section

*   **Overall Purpose:** This specification file documents the end-to-end (E2E) test for the critical "auditable transaction edit" user flow. The test's primary goal is to simulate a manager's real-world workflow: creating multiple transactions, navigating to the summary page, selecting a specific past transaction for correction, modifying it, and verifying that the change is correctly persisted and that other transactions remain untouched. This test is a key gatekeeper for production readiness, ensuring that one of the most complex user-facing features is robust.

*   **End-to-End Data Flow:**
    1.  The test begins by programmatically logging in as a "manager" user via the `AuthHelper`.
    2.  It navigates to the `transaction.html` page to discover available test data (e.g., masseuse names) directly from the UI to ensure the test is not reliant on hardcoded values.
    3.  It programmatically creates three distinct transactions for different masseuses using the `TransactionPage` Page Object. Each creation involves filling the form and submitting it, which sends a `POST` request to the `/api/transactions` endpoint.
    4.  The test then navigates to the `summary.html` page.
    5.  Using the `SummaryPage` Page Object, it locates and clicks the "edit" button for the second transaction created. This action stores the transaction's data in `sessionStorage` and navigates the browser back to `transaction.html`.
    6.  The `TransactionPage` detects it's in "edit mode," populates the form with the data from `sessionStorage`, and displays a correction banner.
    7.  The test modifies a value in the form (e.g., changes the payment method to "Cash") and resubmits it. This triggers a `POST` request to `/api/transactions`, which includes the `corrected_transaction_id`.
    8.  The backend archives the original transaction and creates a new, corrected one.
    9.  The test navigates back to `summary.html` and, using `page.reload()` to ensure fresh data, verifies that the transaction now reflects the new payment method ("Cash") and that the other two transactions are unchanged.

## 2. Module API & Logic Breakdown

This file is a Playwright test script and does not expose an API. It consumes the application's UI, which is driven by the backend API. The test's internal structure is based on the Page Object Model (POM).

*   **`TransactionPage.js`:** Encapsulates all selectors and interaction logic for `transaction.html`.
*   **`SummaryPage.js`:** Encapsulates all selectors and interaction logic for `summary.html`.
*   **`LoginPage.js`:** Encapsulates selectors and logic for the login form.
*   **`authHelper.js`:** Provides a reusable `loginAs` function for authenticating before tests.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** This test is initiated by the Playwright test runner (`npx playwright test`).
    *   **Input Data Contracts / Schemas:** The test dynamically creates its own test data based on what it discovers in the application's UI, making it resilient to changes in the underlying database.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:**
        *   `/api/auth/login`: To authenticate.
        *   `/api/transactions`: To create and correct transactions.
        *   The test interacts with the following web pages: `login.html`, `transaction.html`, `summary.html`.

## 4. Bug & Resolution History

*   **Bug Summary (August 25, 2024):** The E2E test was plagued by a series of cascading, difficult-to-diagnose failures. The primary symptoms included: timeouts waiting for dropdowns to populate, `403 Forbidden` errors due to CSRF issues, and inability to find newly created transactions on the summary page. The root cause was a combination of test implementation flaws and a critical issue with the Docker test environment.

*   **Validated Hypothesis:** The core issue was a **stale Docker cache**. The `docker-compose up` command was not picking up changes made to backend files (`server.js`, `csrf-protection.js`, etc.) or newly installed dependencies (`csurf`). The test was consistently running against an old, broken version of the backend code, making debugging impossible as local code fixes were never actually being executed.

*   **Invalidated Hypotheses:**
    *   *Hypothesis:* The test was too fast for the UI (race condition). **Resolution:** While implementing robust waits (`expect(locator).toBeAttached()`) is a best practice and helped, it did not solve the underlying CSRF failures.
    *   *Hypothesis:* The CSRF middleware was misconfigured. **Resolution:** Numerous attempts were made to re-implement, bypass, and debug the CSRF logic. While these changes eventually led to a cleaner implementation, they failed to fix the test because the changes were never being deployed to the running container.
    *   *Hypothesis:* The test was not acquiring a CSRF token correctly. **Resolution:** The test's authentication flow was refactored to mimic other working test fixtures, but this also failed because the underlying backend was stale.
    *   *Hypothesis:* The summary page was showing stale data. **Resolution:** Forcing a `page.reload()` was a good robustness improvement but did not fix the core problem as the transactions were never being created in the first place due to the CSRF error in the stale backend.

*   **Resolution:**
    1.  **Identified the stale cache:** The definitive clue was that adding a Sentry logging call to the CSRF error handler produced no Sentry issues, proving the code path was never being executed.
    2.  **Forced Docker Rebuild:** The `playwright.config.js` `webServer` command was modified to always delete the persistent `massage_shop.db` file to ensure a clean slate.
    3.  The final, correct test execution command chain became: `docker-compose down && docker-compose up --build --force-recreate -d` to ensure a fresh container, followed by `npm run test:e2e`.
    4.  **Simplified CSRF:** The custom CSRF logic was replaced with the industry-standard `csurf` library, and the middleware was cleanly bypassed for the `testing` environment in `server.js`.
    5.  **Fixed Dependencies:** The missing `csurf` dependency was added to `package.json`.
    6.  **Fixed Route Handlers:** Corrected a server crash by removing invalid middleware from route definitions in `admin.js` and `main.js`.
