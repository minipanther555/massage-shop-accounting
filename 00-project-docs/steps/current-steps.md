# Current Project Steps

1.  **[Infra] Stabilize the Docker-based Local Development Environment.**
    *   **Status**: ✅ `completed`
    *   **Priority**: CRITICAL (BLOCKER)
    *   **Required**: The local development server was consistently crashing on startup when connected to a production-like database.
    *   **Notes**: This multi-stage debugging effort involved:
        *   Fixing a `TypeError` in `server.js` related to incorrect `rateLimiter` middleware configuration.
        *   Discovering the root cause was an unhandled "duplicate column name" error during database initialization.
        *   Refactoring the `addMissingColumns` function in `database.js` to be fully idempotent, which resolved the startup crash.
        *   Troubleshooting multiple environment issues (`docker daemon` not running) and process management flows (`nohup`, background processes).

2.  **[Test] Scaffold E2E Test for "Edit Transaction" Workflow and Discover Critical Bug.**
    *   **Status**: ✅ `completed`
    *   **Priority**: High
    *   **Required**: Create a new E2E test to validate the transaction editing functionality.
    *   **Notes**: Used Playwright Codegen to create `tests/e2e/transaction-edit-flow_2025-08-26.spec.js`. This process immediately uncovered a **new critical bug**: editing a transaction creates a duplicate entry instead of updating the original. This is now the highest priority bug to fix. Co-located documentation was created for this test, logging the bug.

3.  **[Bugfix] Investigate and Fix "Edit Transaction Creates Duplicate" Bug.**
    *   **Status**: ✅ `completed`
    *   **Priority**: CRITICAL (BLOCKER)
    *   **Required**: Analyze the backend route responsible for updating transactions (likely `PUT /api/transactions/:id`) and correct the logic to perform an `UPDATE` rather than an `INSERT`.
    *   **Notes**: This evolved into a comprehensive debugging session that revealed multiple issues:
        *   **Root Cause 1**: The `/recent` API endpoint was filtering out EDITED transactions with `WHERE status IN ('ACTIVE', 'CORRECTED')`, preventing them from reaching the frontend.
        *   **Root Cause 2**: The transaction editing logic was working correctly in the backend, but the frontend couldn't display the styling because EDITED transactions weren't being returned by the API.
        *   **Resolution**: Modified the SQL query in `GET /api/transactions/recent` from `WHERE status IN ('ACTIVE', 'CORRECTED')` to `WHERE status = 'ACTIVE' OR status = 'CORRECTED' OR status LIKE 'EDITED%'` to include EDITED transactions.
        *   **Verification**: Created comprehensive test suite (`tests/integration/transaction-status-integration.test.js`) and visual verification test (`tests/diagnostics/verify-styling-works.spec.js`) to confirm the fix works end-to-end.

4.  **[Test] Create E2E Tests for Admin Workflows and Debug Environment.**
    *   **Status**: ✅ `completed`
    *   **Priority**: High
    *   **Required**: Create E2E tests for adding a new staff member and a new payment type.
    *   **Notes**: This task evolved into a deep debugging session.
        *   **Discovered Bug 1: CSRF Race Condition.** Uncovered a non-deterministic race condition during server startup that caused intermittent "Invalid CSRF Token" errors in the interactive `codegen` browser. The root cause was the server accepting requests before the CSRF middleware was fully initialized.
        *   **Resolution 1:** Implemented a dedicated `testing` environment (`docker/.env.testing`) that correctly sets `NODE_ENV=testing`, disabling CSRF protection for reliable test generation.
        *   **Discovered Bug 2: Modal UI Failure.** The "Add New Payment Type" form was not appearing in a modal. The root cause was missing modal CSS, which was defined locally in the staff admin page but not globally.
        *   **Resolution 2:** Migrated the modal CSS to the shared `web-app/styles.css` file and removed the redundant local styles.
        *   **Discovered Bug 3: Test Data Pollution.** The new tests were not cleaning up the data they created.
        *   **Resolution 3:** Implemented robust teardown logic in both new E2E tests (`staff-add-flow.spec.js`, `payment-type-add-flow.spec.js`) to ensure they are atomic and idempotent.

5.  **[Bugfix] Investigate and Fix Payment Type Deletion UI/Logic.**
    *   **Status**: 🔵 `next_up`
    *   **Priority**: High
    *   **Required**: The UI only allows "deactivation" and not permanent deletion, which is confusing and leaves inactive test data visible. The next step is to investigate the backend `DELETE` logic and the frontend rendering logic in `admin-payment-types.html` to implement a proper deletion or filtering mechanism.

6.  **[Bugfix] Fix Transaction Display Issues on Daily Summary Page.**
    *   **Status**: ⚪ `pending`
    *   **Priority**: High
    *   **Required**: While the EDITED transaction styling is now working, there are additional issues discovered:
        *   **Issue 1**: Transactions are displayed in reverse chronological order (newest first), making it difficult to find older transactions
        *   **Issue 2**: The page shows transactions from multiple days instead of filtering to show only today's transactions
        *   **Impact**: Users have to scroll through many transactions to find the EDITED one, and the chronological ordering is confusing
    *   **Next Steps**: 
        *   Fix the chronological ordering to show transactions in proper time sequence
        *   Implement proper date filtering to show only today's transactions
        *   Apply the same fixes to both the daily summary page and the new transaction page

7.  **[Next Phase] Address remaining linting issues and prepare for production deployment.**
    *   **Status**: ⚪ `pending`
    *   **Priority**: Medium
    *   **Required**: Address remaining non-critical linting errors in core application files and prepare the system for production deployment.
