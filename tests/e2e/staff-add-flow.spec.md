# E2E Test: Staff Add Workflow Specification

## 1. Header Section

*   **Overall Purpose:** This E2E test validates the complete user flow for a manager adding a new staff member to the master staff list. It ensures that the UI modal for adding staff functions correctly, the form submission is processed by the backend, the new staff member is persisted in the database, and the UI updates to reflect the change. Crucially, this test also includes a teardown step to clean up after itself by deleting the newly created staff member, ensuring the test is atomic and does not pollute the database.
*   **End-to-End Data Flow:**
    1.  The test begins by navigating to the login page and programmatically logging in as a "manager".
    2.  It navigates to the "Staff Administration" page by clicking the appropriate link.
    3.  It clicks the "➕ Add New Staff" button.
    4.  It verifies that the "Add New Staff Member" modal has become visible.
    5.  It fills the form with a unique name (using `Date.now()`) and other details.
    6.  It submits the form, which triggers a `POST` request to the `/api/admin/staff` endpoint.
    7.  It verifies that the modal has closed and the new staff member's name is now visible on the page.
    8.  For teardown, it locates the row containing the new staff member and clicks the "❌" (delete) button.
    9.  It programmatically accepts the browser's `confirm()` dialog.
    10. It verifies that the row containing the new staff member is no longer visible on the page.

## 2. Module API & Logic Breakdown

This file is a Playwright test script. It consumes the application's UI, which is driven by the backend API.

## 3. Dependency Mapping

*   **Upstream Dependencies:**
    *   **Calling Modules/Services:** Initiated by the Playwright test runner (`npx playwright test`).
*   **Downstream Dependencies:**
    *   **Called Modules/Services:** `/api/auth/login`, `/api/admin/staff`.
    *   **Interacts with Pages:** `login.html`, `index.html`, `admin-staff.html`.

## 4. Bug & Resolution History

*   **Initial Implementation (August 2025):** The test was created via Playwright Codegen. It served as a baseline "working" test that helped diagnose a login failure in the `payment-type-add-flow` test by highlighting a discrepancy in the login logic.
*   **Enhancement (August 2025):** The test was enhanced to include a verification step to ensure the "Add New Staff" modal was correctly displayed, making the test more robust against UI regressions.
*   **Enhancement (August 2025):** A comprehensive teardown process was added to the test. It now deletes the staff member it creates, ensuring the test is idempotent and does not leave test data in the database.
