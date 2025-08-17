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

## Future Considerations

1. **Database Migration Scripts**: Create automated scripts for database setup and validation
2. **Configuration Validation**: Add startup-time validation of all critical paths and permissions
3. **Backup Strategy**: Implement automated database backups to prevent data loss
4. **Health Monitoring**: Add real-time monitoring of database accessibility and performance
5. **Documentation**: Keep this document updated with any new issues or solutions encountered
