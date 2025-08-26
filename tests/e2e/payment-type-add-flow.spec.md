# E2E Test: Payment Type Add Workflow Specification

## 1. Header Section

*   **Overall Purpose:** This E2E test validates the complete user flow for a manager adding a new payment type. It ensures that a manager can log in, navigate to the payment types admin page, open the "Add New" modal, and submit the form. The test then verifies that the new payment type appears in the UI. Finally, it includes a crucial teardown step to deactivate the newly created payment type, ensuring the test does not pollute the database.
*   **End-to-End Data Flow:**
    1.  The test begins by navigating to the login page and programmatically logging in as a "manager".
    2.  It navigates from the main dashboard to the "Payment Types" admin page.
    3.  It clicks the "➕ Add New Payment Type" button.
    4.  It verifies that the "Add New Payment Type" modal has become visible by checking its CSS properties and title.
    5.  It fills the form with a unique name (using `Date.now()`).
    6.  It submits the form, which triggers a `POST` request to the `/api/payment-types` endpoint.
    7.  It verifies that the modal has closed and that a card with the new payment type's name is visible.
    8.  For teardown, it finds the new payment type's card and clicks its "Deactivate" button.
    9.  It verifies the confirmation modal appears and clicks the final "Deactivate" button.
    10. It verifies that the payment type card is now correctly marked as "Inactive".

## 2. Module API & Logic Breakdown

This file is a Playwright test script. It consumes the application's UI, which is driven by the backend API.

## 3. Dependency Mapping

*   **Upstream Dependencies:**
    *   **Calling Modules/Services:** Initiated by the Playwright test runner (`npx playwright test`).
*   **Downstream Dependencies:**
    *   **Called Modules/Services:** `/api/auth/login`, `/api/payment-types`.
    *   **Interacts with Pages:** `login.html`, `index.html`, `admin-payment-types.html`.

## 4. Bug & Resolution History

*   **Bug 1: Test Failing Due to Incorrect Login Logic**
    *   **Bug Summary:** The initial test created by Playwright Codegen failed to navigate from the dashboard to the payment types page.
    *   **Validated Hypothesis:** The trace file revealed the test was failing to log in correctly. A comparison with the working `staff-add-flow.spec.js` test showed the payment type test was missing the step to select "manager" from the username dropdown.
    *   **Resolution:** The login logic was corrected to be identical to the working test, which resolved the navigation failure.

*   **Bug 2: False Positive Test Pass for Unresponsive Button**
    *   **Bug Summary:** The user reported that the "Add New Payment Type" button was unresponsive in their manual browser, but the automated test was passing.
    *   **Validated Hypothesis:** The test was a "false positive." It was clicking the button but had no assertions to verify the expected outcome (the modal appearing). The click action itself doesn't fail even if the `onclick` event has no effect, so the test passed erroneously.
    *   **Resolution:** The test was enhanced with specific assertions to verify that the modal `div` becomes visible and has the correct title, ensuring the test now correctly fails if the button is unresponsive.

*   **Bug 3: Test Data Pollution**
    *   **Bug Summary:** The test was creating new payment types but never cleaning them up, leaving test data in the database.
    *   **Validated Hypothesis:** The test was missing a teardown step.
    *   **Resolution:** A comprehensive teardown process was added. The test now deactivates the payment type it creates, ensuring the test is idempotent.
