# `tests/e2e/transaction-edit-flow_2025-08-26.spec.md`

## 1. Header Section

*   **Overall Purpose:** This Playwright E2E test is designed to verify the complete user journey for editing a transaction. It ensures that a user can log in, navigate to the daily summary, select a transaction to edit, change its details, save it, and see the correct, updated information reflected on the summary page.
*   **End-to-End Data Flow:** The test script, driven by Playwright, launches a headless Chromium browser. It navigates to the `/login.html` page, programmatically fills in the manager credentials, and submits the form. It then navigates through the application by clicking on UI elements (`'Daily Summary'` link). It identifies a specific transaction and clicks its "Edit" button. It then interacts with the form on the transaction page, changing a value (e.g., Payment Method from 'Bank Transfer' to 'Cash'). After submitting the change, it navigates back to the summary page and asserts that the transaction now reflects the new data.

## 2. Module API & Logic Breakdown

This file is a Playwright test script, not a traditional API. Its logic is a sequence of simulated user actions and assertions.

*   **`test('should allow a user to edit a transaction...')`**
    *   **Purpose:** The main test case for the edit workflow.
    *   **Logic Notes:** The script uses a series of `await page.getByRole(...)` and `await page.getByLabel(...)` commands to locate and interact with elements. This sequence of actions faithfully reproduces the manual steps a user would take. The test implicitly validates the frontend-to-backend data flow by observing the final state of the UI.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** This test is executed by the Playwright test runner (`npx playwright test`). It requires the `webServer` (defined in `playwright.config.js`) to be running.
    *   **Input Data Contracts / Schemas:** The test relies on the existence of specific data in the test database (e.g., a staff member named 'พี่วัน', specific services and payment methods).

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:** The test script makes live HTTP requests to the running backend server via the browser, exercising the entire application stack.
    *   **Output Data Contracts / Schemas:** The output is a test result (pass or fail) and, on failure, a detailed trace file (`trace.zip`) containing a video, DOM snapshots, and network logs for debugging.

## 4. Bug & Resolution History

*   **Bug Summary (August 2025):** While using Playwright Codegen to create this test, a critical bug in the application was discovered. When a transaction was edited and saved, the system did not update the existing record. Instead, it created a new, duplicate transaction, and the data in the new entry did not always reflect the changes made in the edit form.
*   **Validated Hypothesis:** This bug is currently unresolved. The hypothesis is that the backend API endpoint for updating a transaction (`PUT /api/transactions/:id`) is incorrectly implemented. Instead of performing an `UPDATE` SQL operation, it is likely performing an `INSERT` operation, leading to the creation of duplicate records.
*   **Resolution:** Pending. The immediate next action is to investigate and fix the backend logic for transaction updates.
