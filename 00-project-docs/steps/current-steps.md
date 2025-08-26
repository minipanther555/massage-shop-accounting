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
    *   **Status**: 🔵 `next_up`
    *   **Priority**: CRITICAL (BLOCKER)
    *   **Required**: Analyze the backend route responsible for updating transactions (likely `PUT /api/transactions/:id`) and correct the logic to perform an `UPDATE` rather than an `INSERT`.

4.  **[Test] Create E2E Test for "Add New Staff" Workflow.**
    *   **Status**: ⚪ `pending`
    *   **Priority**: High
    *   **Required**: Once the server is stable, create the originally planned E2E test for adding a new staff member.

5. **[Next Phase] Address remaining linting issues and prepare for production deployment.**
    *   **Status**: ⚪ `pending`
    *   **Priority**: Medium
    *   **Required**: Address remaining non-critical linting errors in core application files and prepare the system for production deployment.
