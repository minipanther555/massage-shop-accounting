# Production Bug: Server Logs Not Updating - RESOLVED

- **Date Identified**: Approx. 2025-08-15
- **Status**: ✅ **RESOLVED**
- **Priority**: CRITICAL
- **Impact**: Prevented all server-side debugging, making it impossible to trace requests, diagnose errors, or verify deployments. This completely stalled the investigation of other critical bugs.

## 1. Bug Description
On the production server, the application's log files located at `/var/log/massage-shop/output.log` and `/var/log/massage-shop/error.log` were not being updated. All attempts to view recent activity using `tail` or `cat` showed only old data, despite the application being live and serving requests. This created a "black box" environment where no visibility into the application's runtime behavior was possible.

## 2. Root Cause Analysis
The investigation revealed a file permission conflict between the user running the application and the user who owned the log files.

- **Application User**: For security, the Node.js application is run by a dedicated, non-root user named `massage-shop`.
- **Log File Owner**: The log files themselves (`output.log`, `error.log`) were owned by the `root` user.
- **The Conflict**: The `massage-shop` user process was attempting to write log entries to files it did not have permission to modify. The Linux operating system was correctly denying these write attempts, but this failure mode is silent—it does not crash the application, it simply discards the log entries.

## 3. Resolution
The fix was to grant the `massage-shop` user ownership of the log files it is responsible for writing to.

- **Command Executed on Server**: `sudo chown massage-shop:massage-shop /var/log/massage-shop/*.log`
- **Action**: This command changes the owner and the group for all files ending in `.log` inside the `/var/log/massage-shop/` directory to `massage-shop`.
- **Outcome**: The application process immediately gained the necessary permissions to write to the files. After a service restart (`sudo systemctl restart massage-shop`), new log entries began appearing in real-time as expected.

## 4. Key Learning: Differentiating Log Types

A key part of this investigation was clarifying the two different logging systems on the server.

- **`journalctl` (Service Logs)**:
    - **Command**: `sudo journalctl -u massage-shop`
    - **Purpose**: This command queries the logs for the `systemd` service manager. It **only** shows high-level events related to the service itself, such as `start`, `stop`, `restart`, or a catastrophic crash of the entire Node.js process.
    - **Limitation**: It does **not** capture the application's internal `console.log()` output. This is why these logs appeared static—the service was running, even if the application inside it was failing to log.

- **Application Logs (File-based)**:
    - **Command**: `tail -f /var/log/massage-shop/output.log`
    - **Purpose**: This is the **correct location** to view the application's real-time standard output. The PM2 process manager, which runs our Node.js app, is configured to redirect all `console.log` statements to this file.
    - **Use Case**: This is the single source of truth for tracing API requests, debugging business logic, and viewing application-specific error messages.
