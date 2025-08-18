# Testing Plan - Massage Shop POS System

## Current Testing Status

### ✅ Staff Roster Functionality Testing - COMPLETED (August 18, 2025)
**Status**: ✅ **COMPLETED** - All tests passing

**What Was Tested**:
- Staff roster dropdown population from master staff list
- Staff addition to daily roster (INSERT/UPDATE operations)
- Staff removal from daily roster
- Daily roster clearing functionality
- API endpoint functionality (`/api/staff/allstaff`, `/api/staff/roster/:position`)
- Database permissions and file ownership
- Git tracking cleanup and .gitignore updates

**Results**: All tests passed. Staff roster system is fully operational with all features working correctly.

### ✅ Database Permissions Testing - COMPLETED (August 18, 2025)
**Status**: ✅ **COMPLETED** - All tests passing

**What Was Tested**:
- Database file ownership (massage-shop:massage-shop)
- Database file permissions (666)
- Git tracking removal (database file no longer tracked)
- .gitignore updates (database file excluded from tracking)
- Service restart after permission changes
- SQLITE_READONLY error resolution

**Results**: All tests passed. Database permissions are stable and no more read-only errors occur.

### 🔴 Staff Administration Page Testing - CRITICAL PRIORITY (August 18, 2025)
**Status**: 🔴 **CRITICAL** - Cannot test until database architecture is fixed

**What Needs Testing**:
- Staff administration page loading and functionality
- Staff list display with payment information
- Add new staff member functionality
- Edit existing staff member functionality
- Remove staff member functionality
- Payment tracking display and management

**Blocking Issue**: Staff administration page is completely broken due to database architecture mismatch. Cannot test until database schema is restructured.

**Root Cause**: Payment tracking fields are stored in `staff_roster` table (daily table) instead of `staff` table (master table). Staff administration page is trying to read/write from wrong table.

### ✅ Database Permissions Testing - COMPLETED (August 18, 2025)
**Status**: ✅ **COMPLETED** - All tests passing

**What Was Tested**:
- Database file ownership (massage-shop:massage-shop)
- Database file permissions (666)
- Git tracking removal (database file no longer tracked)
- .gitignore updates (database file excluded from tracking)
- Service restart after permission changes
- SQLITE_READONLY error resolution

**Results**: All tests passed. Database permissions are stable and no more read-only errors occur.

### 🔴 Staff Administration Page Testing - CRITICAL PRIORITY (August 18, 2025)
**Status**: 🔴 **CRITICAL** - Cannot test until database architecture is fixed

**What Needs Testing**:
- Staff administration page loading and functionality
- Staff list display with payment information
- Add new staff member functionality
- Edit existing staff member functionality
- Remove staff member functionality
- Payment tracking display and management

**Blocking Issue**: Staff administration page is completely broken due to database architecture mismatch. Cannot test until database schema is restructured.

**Root Cause**: Payment tracking fields are stored in `staff_roster` table (daily table) instead of `staff` table (master table). Staff administration page is trying to read/write from wrong table.

## Next Phase Testing Priorities

### 🔴 Phase 1: Database Schema Restructuring Testing (CRITICAL PRIORITY)
**Status**: 🔴 **PENDING** - Required to fix staff administration page

**Testing Requirements**:
1. **Database Schema Updates**:
   - Verify `staff` table has all payment tracking fields
   - Verify `staff_roster` table only has daily fields
   - Test data migration from `staff_roster` to `staff` table

2. **API Endpoint Updates**:
   - Test admin staff endpoints using `staff` table
   - Verify staff roster endpoints still work with daily data
   - Test data integrity across both tables

3. **Data Migration Testing**:
   - Verify existing payment data migrated correctly
   - Test that daily clearing doesn't affect long-term data
   - Verify both tables serve their intended purposes

**Success Criteria**:
- ✅ Staff administration page loads and functions correctly
- ✅ Staff can be added, edited, and removed from master staff list
- ✅ Payment tracking data persists across daily roster clears
- ✅ Daily roster clearing only affects daily stats, not long-term data
- ✅ Both `staff` and `staff_roster` tables serve their intended purposes

### 🔴 Phase 2: Busy Time Reset Issue Testing (HIGH PRIORITY)
**Status**: 🔴 **PENDING** - Depends on Phase 1 completion

**Testing Requirements**:
1. **Status Reset Functionality**:
   - Test automatic status reset for expired busy times
   - Verify statuses reset to "Available" after duration expires
   - Test with various duration values and time zones

2. **UI Updates**:
   - Verify status display updates correctly in real-time
   - Test status changes are reflected immediately
   - Verify no staff remain stuck in "Busy until..." status

**Success Criteria**:
- ✅ Staff statuses automatically reset to "Available" after duration expires
- ✅ No staff remain stuck in "Busy until..." status indefinitely
- ✅ Status updates are reflected immediately in the UI
- ✅ System handles various duration values correctly

### 🔴 Phase 3: Financial Reports Enhancement Testing (HIGH PRIORITY)
**Status**: 🔴 **PENDING** - Depends on Phase 1 completion

**Testing Requirements**:
1. **Report Structure Updates**:
   - Verify duration column visible in all financial reports
   - Verify location column visible in all financial reports
   - Test report calculations include duration and location data

2. **Data Compatibility**:
   - Test existing reports continue to work without errors
   - Verify backward compatibility with existing data
   - Test new reports provide enhanced business insights

**Success Criteria**:
- ✅ Duration column visible in all financial reports
- ✅ Location column visible in all financial reports
- ✅ Report calculations include duration and location data
- ✅ Existing reports continue to work without errors
- ✅ New reports provide enhanced business insights

## Testing Infrastructure

### Current Testing Tools
- **Headless Browser Testing**: Puppeteer for comprehensive frontend testing
- **API Testing**: Direct HTTP requests to test backend endpoints
- **Database Testing**: Direct SQL queries to verify data integrity
- **Manual Testing**: Browser-based testing for user experience validation
- **Comprehensive Diagnostic Script**: `check_database_health.js` for systematic issue detection

### Comprehensive Diagnostic Script - `check_database_health.js`
**Status**: ✅ **COMPLETED** - Ready for deployment and testing

**What It Tests**:
1. **Two-Database Problem**: Check for duplicate database files
2. **Database Permissions**: Verify ownership and permissions
3. **Environment Files**: Check .env file locations and content
4. **Database Schema**: Validate table structures and payment fields
5. **Git Tracking**: Verify database and .env files are not tracked
6. **Systemd Service**: Check service configuration and status
7. **PM2 Status**: Check for PM2 processes running as root
8. **Automated Processes**: Look for cron jobs or systemd timers
9. **File System**: Check directory contents and permissions

**Evolution**:
- **Initial Version**: Had false positive for Git tracking due to broad grep patterns
- **Refined Version**: Uses precise patterns (`massage_shop\.db$` for DB files, `^\.env$` for .env files)
- **Separate Checks**: Database files and .env files checked independently
- **Comprehensive Output**: Provides actionable recommendations for each issue detected

**Current Status**: Script committed to `testing2002` branch, ready for deployment to server for comprehensive system analysis.

### Testing Environment
- **Local Development**: Full testing environment with local database
- **Production Server**: Limited testing on production server
- **Database**: SQLite database with test data
- **Browser**: Chrome/Chromium for headless testing

### Test Data Management
- **Test Staff Data**: 16 staff members with various payment histories
- **Test Transaction Data**: Sample transactions with duration and location
- **Test Payment Data**: Sample payment records for staff members
- **Data Cleanup**: Automated cleanup after testing to prevent data pollution

## Risk Mitigation

### High Risk Testing Items
- **Database Schema Changes**: Major schema modifications affecting core functionality
- **Data Migration**: Risk of data loss during payment data migration
- **API Endpoint Updates**: Changes to admin staff endpoints may introduce bugs

### Mitigation Strategies
1. **Database Backup**: Create full backup before schema changes
2. **Incremental Testing**: Test changes in small, verifiable increments
3. **Comprehensive Validation**: Test all functionality thoroughly after changes
4. **Rollback Testing**: Verify ability to revert changes if issues arise

## Current Testing Status Summary

**Overall Status**: 🔴 **PARTIALLY OPERATIONAL** - Critical functionality broken

**Working Systems**:
- ✅ Staff roster functionality (100% operational)
- ✅ Database permissions and file ownership
- ✅ Transaction creation and management
- ✅ Authentication and session management

**Broken Systems**:
- 🔴 Staff administration page (completely non-functional)
- 🔴 Long-term staff management (cannot add/edit/remove staff)
- 🔴 Payment tracking and management (data in wrong tables)

**Next Testing Priority**: Database schema restructuring to fix staff administration page

The system requires immediate database architecture restructuring before comprehensive testing can resume. The staff administration page is completely broken due to fundamental database design issues that must be resolved first.
