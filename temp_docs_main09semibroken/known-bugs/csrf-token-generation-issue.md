# CSRF Token Generation Issue - Post-Mortem

**Date**: 2025-08-16
**Status**: RESOLVED
**Severity**: CRITICAL - Blocked all local development and testing.

## Problem Description
The application was unstable during local testing, frequently failing with a variety of errors including `403 Forbidden` and `500 Internal Server Error`. The initial diagnosis pointed to a failure in the CSRF token generation or validation system, leading to a prolonged and circular debugging process.

## Root Cause Analysis

The investigation was plagued by several compounding issues that led to the incorrect initial diagnosis. The Triage & Debugging Protocol, with its emphasis on comprehensive logging, was ultimately required to uncover the true root cause.

### The Misleading Symptoms & Flawed Process

1.  **Initial Error (`403 Forbidden`)**: Early test runs failed with a `403` error, which is the correct response when a CSRF token is missing. This led to the reasonable but ultimately incorrect assumption that the CSRF system was the source of the bug.
2.  **Environmental Instability**: The local development environment was unstable. A "zombie" Node.js process was frequently left running, occupying port 3000. This caused subsequent attempts to start the server to fail with an `EADDRINUSE` error, but this error was not always caught, leading to confusion and the belief that the server was "crashing prematurely." The repeated, incorrect use of `kill %1` failed to solve this problem.
3.  **The Broken Rollback**: The most significant issue was the state of the `testing03` branch. A flawed git rollback had left several critical files (`server.js` and multiple middleware files) completely empty. This was the primary cause of the server instability, as the application could not be loaded correctly.

### The Breakthrough: Systematic Logging

After restoring the empty files from the `main08` branch, the Triage & Debugging Protocol was applied. Extensive `console.log` statements were added to every step of the application startup and request lifecycle.

A final test run with the instrumented code provided a clear and definitive log trace:
1.  **CSRF System Confirmed Working**: The logs showed the `addCSRFToken` and `validateCSRFToken` middleware functioning perfectly. A token was generated on login, a request without the token was correctly rejected with a `403`, and a request with the token was correctly validated and passed to the next handler.
2.  **True Root Cause Revealed**: The final log entry before the server crashed was:
    `Database run error: Error: SQLITE_ERROR: table staff_roster has no column named hire_date`

### True Root Cause

The 500 error was caused by a **database schema mismatch**. The application code in `backend/routes/admin.js` expected the `staff_roster` table to have a `hire_date` column, but the local `massage_shop.db` file was based on an older schema that did not include this column. The error occurred *after* all security checks had passed.

## Resolution

1.  **File Restoration**: All empty backend files on the `testing03` branch were restored with their correct contents from the `main08` branch.
2.  **Zombie Process Management**: The correct command (`kill -9 $(lsof -t -i:3000)`) was used to ensure port 3000 was free before starting the server.
3.  **Database Migration**: A simple migration check was added to `backend/models/database.js`. This code now checks if the `hire_date` column exists in the `staff_roster` table on startup and, if not, adds it using an `ALTER TABLE` command. This makes the application resilient to this specific schema mismatch.

## Lessons Learned

1.  **Don't Trust the Initial Symptom**: An error code (`403`) can be misleading. It's crucial to trace the entire request and not fixate on the first apparent issue.
2.  **Comprehensive Logging is Non-Negotiable**: The Triage & Debugging Protocol's emphasis on extensive logging is what broke the debugging loop. A complete trace of the execution flow is the fastest path to the root cause.
3.  **Validate the Environment First**: Before debugging application logic, ensure the environment is stable. The `EADDRINUSE` error and empty files should have been investigated and resolved before any time was spent on application-level code.
4.  **Schema Mismatches are Common**: In an evolving application, discrepancies between the code's expectations and the database's actual state are a frequent source of bugs. Robust startup checks or a formal migration system are essential.
