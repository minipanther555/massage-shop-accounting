# Environmental Process Management Conflict - RESOLVED

## Issue Overview
**Status**: ✅ RESOLVED
**Priority**: CRITICAL
**Date Identified**: August 15, 2025
**Date Resolved**: August 15, 2025
**Impact**: Catastrophic state-persistence failure, server instability, invalid test results, blocked all CSRF debugging.

## Issue Description
During a high-priority investigation into a persistent CSRF token failure, all attempts at debugging and fixing the issue failed, and tests consistently showed that no state was being persisted between requests. The server was also observed to be restarting constantly. The root cause was not an application code bug, but a fundamental conflict in the server's process management environment, which was caused by operator error.

## Technical Analysis

### Root Cause: `systemd` vs. PM2 Conflict
The core of the problem was a misunderstanding of the production deployment architecture, which is explicitly documented in `00-project-docs/feature-specifications/production-deployment-guide.md`.

1.  **Designed Architecture**: The application is designed to be managed by **`systemd`**. The `deploy.sh` script creates a `massage-shop.service` unit file that runs the application directly with `node server.js`. `systemd` is the single source of truth for managing the application lifecycle.
2.  **Operator Error**: During debugging, the AI assistant (myself) failed to consult the documentation and incorrectly assumed **PM2** was the process manager. I then proceeded to run PM2 commands (`pm2 restart`, `pm2 logs`, etc.) on the server.
3.  **The Conflict**: This created a conflict where two different process managers were trying to control the same application on the same port (3000).
    *   The `systemd` service was already running the application.
    *   When I manually started a PM2 instance, it would attempt to bind to port 3000, which was already in use by the `systemd` process. This resulted in an `EADDRINUSE` (Address Already in Use) error.
4.  **Symptom Cascade**: This conflict produced a cascade of misleading symptoms that derailed the entire debugging process:
    *   **Constant Restarts**: PM2, failing to start, would enter a crash-restart loop, leading to the high restart count observed.
    *   **`ECONNREFUSED` Errors**: The test scripts were trying to connect to a server that was constantly crashing and restarting, leading to "Connection Refused" errors.
    *   **State Persistence Failure**: Because the process was being recycled on every request or every few seconds, no state (in-memory Maps or even database connections) could be persisted, making the CSRF token issue impossible to solve.
    *   **Hanging Log Commands**: `pm2 logs` would hang because the PM2 daemon was in a confused state, trying to manage a process that was never truly stable.

## Solution Implemented
The solution was to restore the environment to its documented, intended state.

1.  **Stop and Remove PM2 Processes**: All conflicting PM2 processes were stopped and deleted from the server's process list using `pm2 delete all`.
2.  **Adhere to `systemd`**: All subsequent application management was performed using the correct `systemd` commands (`sudo systemctl restart massage-shop`, `sudo journalctl -u massage-shop`).
3.  **Codebase Reset**: The codebase was reverted to a known-good state before the flawed debugging attempts began, allowing for a clean application of the correct fix.

## Lessons Learned

1.  **RTFM (Read The... Manual)**: This entire multi-hour debugging loop and series of regressions could have been avoided by reading the `production-deployment-guide.md` at the outset. This is the primary lesson.
2.  **Environmental Assumptions are Dangerous**: Never assume the nature of a deployment environment (e.g., process manager, file paths). Always verify with documentation or direct inspection.
3.  **Isolate Variables**: Introducing a new process manager (PM2) into an unknown environment added a confounding variable that made rational debugging impossible.
4.  **Symptoms vs. Root Cause**: The CSRF token failure was a *symptom*. The constant process restarts were a *symptom*. The `EADDRINUSE` error was the *key indicator* pointing to the true root cause: the process manager conflict.

## Prevention Measures
- **Strict Adherence to Documentation**: The deployment and management of the application must strictly follow the steps outlined in the `production-deployment-guide.md`.
- **Pre-Task Protocol Update**: The assistant's core operating protocol must be updated to include a mandatory check for deployment or architecture guides before interacting with a live server environment.
- **Single Process Manager**: Only `systemd` should be used to manage the application process on the production server. PM2 should not be installed or used.
