# Database Issues and Permanent Solutions

## Overview
This document captures the critical database issues encountered during development and their permanent solutions to prevent recurrence.

## Critical Issues Encountered

### 1. Two-Database Problem
**Problem**: The system was attempting to connect to two different `massage_shop.db` files:
- **Correct DB**: `/opt/massage-shop/backend/data/massage_shop.db` (8 payment methods, complete data)
- **Incorrect DB**: `/opt/massage-shop/data/massage_shop.db` (6 payment methods, incomplete data)

**Root Cause**: 
- Environment variable mismatch: `.env` used `DB_FILENAME` while `database.js` looked for `DATABASE_PATH`
- Systemd service `WorkingDirectory=/opt/massage-shop` caused relative paths to resolve incorrectly
- Fallback path `./data/massage_shop.db` resolved to the wrong location

**Impact**: 
- Backend connected to empty/incomplete database
- 500 Internal Server Errors during transaction creation
- Data inconsistency between frontend and backend

### 2. Database Permissions Problem
**Problem**: Database file became read-only (`SQLITE_READONLY: attempt to write a readonly database`)

**Root Cause**: 
- File ownership reverted to `root:root` after system operations
- Insufficient permissions (644 instead of 666)
- Systemd service user `massage-shop` couldn't write to database

**Impact**:
- All database write operations failed
- 500 Internal Server Errors
- Transaction creation completely blocked

### 3. Server Logging Issues
**Problem**: Server logs were not accessible due to permission issues

**Root Cause**:
- Log files owned by wrong user/group
- Insufficient write permissions for `massage-shop` user
- Old log content preventing fresh error diagnosis

**Impact**:
- Could not diagnose 500 errors
- Delayed problem resolution
- Difficulty tracking system state

### 4. Broken Directory/Database Creation Logic in `database.js`
**Problem**: The `database.js` file was automatically creating data directories and database files on app startup

**Root Cause**:
- Code included `fs.mkdirSync(dataDir, { recursive: true })` to create missing directories
- This was a "fix" for deployment problems that created more problems
- App should fail if deployment is broken, not create empty databases

**Impact**:
- Created the second database automatically
- Masked deployment configuration errors
- Led to data inconsistency and confusion

**Status**: ✅ **FIXED** - Removed the broken logic

### 5. 2:58 AM Database Creation Mystery
**Problem**: Both databases were created simultaneously at 2:58 AM on August 18, 2025

**Evidence**:
- We've been working on this project for at least a week
- 2:58 AM is middle of the night (not normal development time)
- Both databases created within 2 seconds of each other
- This timing suggests automated process, not manual operation

**Theories**:
- Automated "next day" or "end of day" process
- System maintenance or backup process
- Scheduled database operations
- Unknown automated system process

**Status**: ❌ **UNSOLVED** - We don't know what's running at 2:58 AM

### 6. Recurring `SQLITE_READONLY` Errors
**Problem**: Database keeps becoming read-only after we fix it, despite setting correct permissions

**What We've Tried**:
- Fixed permissions to `666` (read/write for all)
- Fixed ownership to `massage-shop:massage-shop`
- Made directory immutable with `chattr +i`
- Applied immutable flag to database file (but this caused more problems)

**Pattern**:
- Permissions keep reverting to `root:root` and `644`
- This happens after Git operations and deployments
- Even without manually running `deploy.sh`

**Why It Happens**: Unknown - something keeps changing the permissions back automatically

**Status**: ❌ **UNSOLVED** - Root cause of permission reversion unknown

### 7. Two Conflicting `.env` Files
**Problem**: Had two `.env` files with different settings causing configuration conflicts

**What We Found**:
- `/opt/massage-shop/.env` (manually edited, contained correct `DATABASE_PATH`)
- `/opt/massage-shop/backend/.env` (created by `deploy.sh`, contained `DB_FILENAME`)

**Impact**:
- App was using wrong environment variables
- Database path resolution was inconsistent
- Configuration was fragmented and confusing

**Status**: ✅ **FIXED** - Consolidated to single `.env` file in correct location

### 8. Second Database Keeps Regenerating
**Problem**: Even after deleting the second database multiple times, it keeps reappearing

**Evidence**:
- Deleted `/opt/massage-shop/data/massage_shop.db` multiple times
- It keeps coming back with 0 services (empty)
- Main database has 92 services, second has 0
- This happens automatically, not through manual operations

**Impact**:
- App connects to empty database instead of correct one
- API endpoints return empty arrays `[]`
- Frontend shows no data

**Status**: ❌ **UNSOLVED** - We don't know what's automatically recreating it

## Permanent Solutions Implemented

### 1. Database Path Standardization
**Solution**: Unified environment variable naming and absolute path resolution

```bash
# .env file - CORRECTED
DATABASE_PATH=./backend/data/massage_shop.db
```

**Why This Works**:
- Matches the variable name expected by `database.js`
- Resolves correctly from systemd `WorkingDirectory=/opt/massage-shop`
- Final path: `/opt/massage-shop/backend/data/massage_shop.db`

### 2. Database File Consolidation
**Solution**: Remove duplicate database files

```bash
# DELETE the incorrect database
sudo rm /opt/massage-shop/data/massage_shop.db

# KEEP only the correct database
/opt/massage-shop/backend/data/massage_shop.db
```

**Verification**: Correct database has 8 payment methods, complete services and staff data

### 3. Permanent Permission Fix
**Solution**: Set correct ownership and permissions with sticky attributes

```bash
# Set correct ownership
sudo chown massage-shop:massage-shop /opt/massage-shop/backend/data/massage_shop.db

# Set correct permissions (666 for read/write)
sudo chmod 666 /opt/massage-shop/backend/data/massage_shop.db

# Make permissions sticky (prevent automatic changes)
sudo chattr +i /opt/massage-shop/backend/data/massage_shop.db
```

**Why This Works**:
- `massage-shop` user owns the file
- 666 permissions allow read/write for all users
- `chattr +i` makes the file immutable (prevents accidental changes)

### 4. Logging Permission Fix
**Solution**: Set correct log file ownership and permissions

```bash
# Set correct ownership for log files
sudo chown massage-shop:massage-shop /var/log/massage-shop/output.log /var/log/massage-shop/error.log

# Set correct permissions
sudo chmod 664 /var/log/massage-shop/output.log /var/log/massage-shop/error.log

# Make permissions sticky
sudo chattr +i /var/log/massage-shop/output.log /var/log/massage-shop/error.log
```

## Prevention Measures

### 1. Database Path Validation
**Add to deployment scripts**:
```bash
# Verify database path before starting service
if [ ! -f "/opt/massage-shop/backend/data/massage_shop.db" ]; then
    echo "ERROR: Database not found at expected path"
    exit 1
fi

# Verify database is writable
if [ ! -w "/opt/massage-shop/backend/data/massage_shop.db" ]; then
    echo "ERROR: Database is not writable"
    exit 1
fi
```

### 2. Environment Variable Validation
**Add to server startup**:
```javascript
// In database.js - add validation
if (!process.env.DATABASE_PATH) {
    throw new Error('DATABASE_PATH environment variable is required');
}

// Verify database file exists and is writable
const fs = require('fs');
if (!fs.existsSync(this.dbPath)) {
    throw new Error(`Database file not found: ${this.dbPath}`);
}

try {
    fs.accessSync(this.dbPath, fs.constants.R_OK | fs.constants.W_OK);
} catch (err) {
    throw new Error(`Database file not accessible: ${this.dbPath}`);
}
```

### 3. Systemd Service Hardening
**Update massage-shop.service**:
```ini
[Service]
# ... existing config ...
# Add protection against permission changes
ProtectSystem=strict
ReadWritePaths=/opt/massage-shop/backend/data
ReadWritePaths=/var/log/massage-shop
# Prevent service from changing file permissions
NoNewPrivileges=true
```

### 4. Monitoring and Alerting
**Add health checks**:
```bash
# Cron job to check database health
*/5 * * * * /opt/massage-shop/scripts/check-db-health.sh
```

**check-db-health.sh**:
```bash
#!/bin/bash
DB_PATH="/opt/massage-shop/backend/data/massage_shop.db"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "CRITICAL: Database file missing at $DB_PATH"
    exit 1
fi

# Check if database is writable
if [ ! -w "$DB_PATH" ]; then
    echo "CRITICAL: Database not writable at $DB_PATH"
    exit 1
fi

# Check ownership
if [ "$(stat -c '%U:%G' $DB_PATH)" != "massage-shop:massage-shop" ]; then
    echo "WARNING: Database ownership incorrect"
    exit 1
fi

echo "Database health check passed"
exit 0
```

## Recovery Procedures

### If Database Becomes Read-Only Again
```bash
# 1. Check current state
ls -la /opt/massage-shop/backend/data/massage_shop.db

# 2. Fix permissions
sudo chown massage-shop:massage-shop /opt/massage-shop/backend/data/massage_shop.db
sudo chmod 666 /opt/massage-shop/backend/data/massage_shop.db

# 3. Make sticky
sudo chattr +i /opt/massage-shop/backend/data/massage_shop.db

# 4. Restart service
sudo systemctl restart massage-shop
```

### If Duplicate Database Appears Again
```bash
# 1. Identify correct database (should have 8 payment methods)
sqlite3 /opt/massage-shop/backend/data/massage_shop.db "SELECT COUNT(*) FROM payment_methods;"
sqlite3 /opt/massage-shop/data/massage_shop.db "SELECT COUNT(*) FROM payment_methods;" 2>/dev/null || echo "File not found"

# 2. Delete incorrect database
sudo rm /opt/massage-shop/data/massage_shop.db

# 3. Verify environment variable
grep DATABASE_PATH /opt/massage-shop/.env
```

## Lessons Learned

1. **Environment Variable Consistency**: Always use the same variable names in code and configuration files
2. **Absolute vs Relative Paths**: Systemd services with specific working directories require careful path resolution
3. **Permission Persistence**: Use `chattr +i` to prevent automatic permission changes
4. **Database Validation**: Add startup checks to catch configuration errors early
5. **Monitoring**: Implement health checks to detect issues before they cause failures

## Current Status (August 18, 2025)

### ✅ RESOLVED ISSUES:
1. **500 Internal Server Error**: Fixed by removing broken directory creation logic
2. **Database Connection**: App now connects successfully to database
3. **Broken Directory Creation**: Removed from `database.js`
4. **Conflicting .env Files**: Consolidated to single file

### ❌ UNSOLVED MYSTERIES:
1. **Second Database Regeneration**: Still automatically reappearing
2. **2:58 AM Process**: Unknown automated process creating databases
3. **Permission Reversion**: Database permissions keep changing back to read-only
4. **API Empty Data**: App connects to wrong database, returns empty arrays

### 🔍 INVESTIGATION STATUS:
- **What We've Eliminated**:
  - ✅ Not `deploy.sh` (no code calls it automatically)
  - ✅ Not cron jobs (none found)
  - ✅ Not GitHub Actions (none found)
  - ✅ Not end-day functionality (it's normal)
  - ✅ Not broken `database.js` logic (fixed)

- **What We Still Don't Know**:
  - What's automatically recreating the second database
  - What's running at 2:58 AM
  - What's changing database permissions back to read-only
  - Why the app sometimes connects to the wrong database

## Future Considerations

1. **Database Migration Scripts**: Create automated scripts for database setup and validation
2. **Configuration Validation**: Add startup-time validation of all critical paths and permissions
3. **Backup Strategy**: Implement automated database backups to prevent data loss
4. **Health Monitoring**: Add real-time monitoring of database accessibility and performance
5. **Documentation**: Keep this document updated with any new issues or solutions encountered
6. **Automated Database Creation Investigation**: Find what's creating the second database at 2:58 AM
7. **Permission Persistence Investigation**: Find what's reverting database permissions
