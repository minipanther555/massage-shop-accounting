1.  **[Test] Run final integration test for the transaction edit feature.**
    *   **Status**: ✅ `completed`
    *   **Priority**: CRITICAL
    *   **Required**: Execute the `tests/test_transaction_edit_integration_2024-08-24.js` script to provide final sign-off on the feature.
    *   **Notes**: Completed after a lengthy debugging session that uncovered and fixed multiple bugs, including a server startup crash, an SQL typo, and a critical server-side filtering logic error.

3.  **[Infra] Set up Sentry for the frontend.**
    *   **Status**: ✅ `completed`
    *   **Notes**: This task was significantly more complex than anticipated and uncovered multiple deep-seated issues that have now been resolved.
        *   **Static File Serving:** Implemented `express.static` middleware in `server.js` to correctly serve the `web-app` directory.
        *   **Content Security Policy (CSP):** Performed multiple updates to the CSP in `security-headers.js` to allow Sentry's CDN scripts and data ingestion endpoints, including the critical `worker-src: blob:` directive required for the Session Replay feature.
        *   **DSN Mismatch:** The final root cause of the integration failure was the use of the backend Sentry project's DSN in the frontend code. This was corrected in `web-app/shared.js`.
        *   **Automated Testing:** Implemented a Playwright script (`diagnostics/sentry_verify_diag.js`) to provide automated, headless browser verification, which was essential for debugging the CSP and DSN issues.

4. **[Refactor] Clean up codebase.**
    *   **Status**: ✅ `completed`
    *   **Priority**: High
    *   **Required**: Now that the major bug-fixing effort is complete, perform a targeted cleanup of the codebase. This includes removing dead code, ensuring consistent formatting, and addressing any new linting errors that were introduced.
    *   **Notes**: Comprehensive cleanup completed successfully:
        *   **Temporary Files**: Removed `web-app/sentry-test.html` and `diagnostics/sentry_verify_diag.js`
        *   **Linting Errors**: Fixed 19 critical trailing comma errors in `web-app/shared.js`
        *   **Dead Code**: Removed commented-out helmet.js code and debug routes from `server.js`
        *   **Dependencies**: Removed 6 unused packages from `package.json`
        *   **Documentation**: Created comprehensive co-located docs for `shared.js` and `security-headers.js`
        *   **Code Quality**: Reduced server.js from 166 to 145 lines, improved maintainability

5. **[Next Phase] Address remaining linting issues and prepare for production deployment.**
    *   **Status**: 🔵 `next_up`
    *   **Priority**: Medium
    *   **Required**: Address remaining non-critical linting errors in core application files and prepare the system for production deployment.
    *   **Notes**: Current linting status shows 720 issues in core application files (44% of total). Most are style preferences and minor logic improvements that can be addressed systematically.
