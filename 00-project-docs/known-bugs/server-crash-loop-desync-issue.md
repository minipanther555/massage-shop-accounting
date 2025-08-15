# Server Crash Loop due to Code Desynchronization - RESOLVED

## Issue Overview
**Status**: ✅ RESOLVED
**Priority**: CRITICAL
**Date Identified**: August 15, 2025
**Date Resolved**: August 15, 2025
**Impact**: The entire production application was down and stuck in a `systemd` restart loop, blocking all access and development.

## Issue Description
Following an attempt to repair the `testing03` branch by restoring corrupted files locally, the production server entered a crash loop. The `systemd` service status showed the application was failing immediately on startup with a `status=1/FAILURE` exit code.

## Business Impact
- **Complete Service Outage**: The application was inaccessible to all users.
- **Blocked Deployment**: All attempts to deploy new code failed due to git conflicts, preventing any fixes from being applied.

## Technical Analysis & Root Cause

The investigation revealed a multi-layered problem stemming from a desynchronization between the local development environment and the production server.

1.  **Proximate Cause: Syntax Error on Server**: The immediate cause of the crash was a fatal `SyntaxError` in `/opt/massage-shop/backend/middleware/csrf-protection.js` on the production server. An extra single quote had been introduced, causing the Node.js process to fail on startup.

2.  **Underlying Cause: Code Desynchronization**: The critical discovery was that this syntax error **did not exist** in the local `testing03` branch. The production server was running a broken, modified version of the file that had been changed directly on the server at some point.

3.  **Deployment Failure**: When we attempted to deploy the corrected code from the local `testing03` branch, the `git pull` command failed. Git correctly detected that the broken `csrf-protection.js` file on the server had local changes that would be overwritten, and it aborted the merge to prevent data loss.

This created a catch-22: the server was crashed because of a bad file, and the bad file could not be fixed because its uncommitted state was blocking the deployment of the good file.

## Solution Implemented

A multi-step process was executed to resolve the issue:

1.  **Local Branch Repair**: The local `testing03` branch was first repaired by restoring several 0-byte files from the `9cf7381` git baseline.
2.  **Push to Remote**: The repaired local branch was pushed to the `origin` remote to ensure the central repository contained the correct code.
3.  **Forced Server Update**: A `git reset --hard origin/testing03` command was executed on the production server. This command instructed git to discard any local changes and uncommitted work on the server, and to forcibly match the state of the remote `testing03` branch. This erased the broken, modified file.
4.  **Service Restart**: The `massage-shop` service was restarted via `systemctl`. With the correct code now in place, the application started successfully, and the crash loop was resolved.

## Lessons Learned

1.  **Server Drift is a Critical Risk**: This incident highlights the danger of "server drift," where the code running on a server becomes different from the code in the version control system. Manual, on-server edits are a primary cause of this and should be strictly forbidden.
2.  **`git reset --hard` as a Recovery Tool**: In situations where the server's local state is known to be incorrect and is preventing a pull, `git reset --hard` is a powerful tool to force synchronization with the remote repository. It is destructive and should be used with caution, but it is the correct tool for this specific failure mode.
3.  **Verify Local vs. Remote Code**: When debugging a server-side error, it is crucial to verify that the code on the server is identical to the code being inspected locally. A simple `cat` of the problematic file on the server would have revealed the discrepancy much earlier.
