# Next Phase Requirements

## Current Status: 🔴 IN PROGRESS - Database Architecture Restructuring for Staff Management

### Phase Status: NEW CRITICAL ISSUE IDENTIFIED
**DATABASE ARCHITECTURE ISSUE IDENTIFIED**: While the staff roster functionality is working, we've discovered a fundamental architectural problem with the staff management system. The staff administration page is broken because it's using the wrong table structure, and we need to restructure the database to properly separate daily operations from long-term staff management.

**Current Focus**: 🔴 **IN PROGRESS** - We need to restructure the database schema to fix the staff administration page and establish proper separation between daily operations and long-term staff management.

**Recent Development Work**: Created comprehensive diagnostic script `check_database_health.js` to systematically check all known database and environment issues, including two-database problem, permissions, environment files, Git tracking, systemd service, PM2 status, and automated processes.

## Recently Completed (August 18, 2025)

### ✅ Staff Roster Functionality Implementation
**Status**: ✅ **COMPLETED** - All features working correctly

**What Was Implemented**:
1. **Database Schema Redesign**: Created separate `staff` table for master list, kept `staff_roster` for daily working list
2. **New API Endpoint**: Created `/api/staff/allstaff` endpoint to fetch master staff list
3. **Frontend Logic Update**: Modified staff roster page to populate dropdown from master list, filter out already assigned staff
4. **API Method Conflict Resolution**: Renamed admin `updateStaff` to `updateAdminStaff` to resolve method name conflicts

**Success Metrics Achieved**:
- ✅ **Staff Roster Dropdown**: Now populates correctly with all 16 available staff names
- ✅ **Staff Addition**: Staff can be successfully added to daily roster with proper database operations
- ✅ **API Endpoints**: All staff roster endpoints working correctly
- ✅ **Transaction Page Compatibility**: New transaction page still works with roster data

### ✅ Database Permissions Issue Resolution
**Status**: ✅ **RESOLVED** - `SQLITE_READONLY` errors completely resolved

**What Was Resolved**:
1. **Git Tracking Cleanup**: Removed database file from Git tracking to prevent permission reversion
2. **Database Ownership Fix**: Changed ownership to `massage-shop:massage-shop` with proper permissions
3. **System Stability**: No more 500 errors during staff roster operations

**Root Cause Identified**: The database file `backend/data/massage_shop.db` was tracked by Git, causing automatic permission reversion after every Git operation.

## Next Phase: Database Architecture Restructuring

### Immediate Next Actions (August 18, 2025)

#### 1. Restructure Database Schema 🔴 **CRITICAL PRIORITY**
**Priority**: CRITICAL - Required to fix staff administration page  
**Impact**: Staff administration page completely broken until fixed  
**Required**: Database schema migration and API endpoint updates

**Current Architecture (INCORRECT)**:
- **`staff` table**: Simple master list with only `{id, name, active, created_at}` - TOO SIMPLE
- **`staff_roster` table**: Daily roster with complex payment tracking fields like `total_fees_earned`, `total_fees_paid`, `last_payment_date`, etc. - WRONG PLACE

**What Should Happen (CORRECT)**:
- **`staff_roster` table**: Should ONLY contain daily stats (position, masseuse_name, status, today_massages, busy_until)
- **`staff` table**: Should contain ALL long-term payment tracking fields (total_fees_earned, total_fees_paid, last_payment_date, hire_date, notes, etc.)

**Why This Makes Sense**:
- **Staff roster** = "Who's working today and what's their queue status?" (daily, clearable)
- **Staff master** = "What's the total payment history and long-term stats for each staff member?" (permanent, not clearable)

**Files to Modify**:
- `backend/models/database.js` - Update table schemas
- `backend/routes/admin.js` - Change endpoints to use `staff` table
- `backend/routes/staff.js` - Ensure roster endpoints only handle daily data
- Database: Migrate existing payment data to correct tables

#### 2. Fix 'Busy Until' Time Reset Issue 🔴 **HIGH PRIORITY**
**Priority**: HIGH - Critical for staff scheduling and customer service  
**Impact**: Staff appear unavailable when they should be free  
**Required**: Implement automatic status reset mechanism for expired busy times

**Current Status**: 🔴 **NOT IMPLEMENTED** - Staff status shows "busy" perpetually even after time passes

**Technical Requirements**:
- Implement automatic status reset for expired busy times
- Update `resetExpiredBusyStatuses()` function to work correctly
- Ensure statuses are reset to "Available" after duration expires
- Test with various duration values and time zones

**Files to Modify**:
- `backend/routes/staff.js` - Update status reset logic
- `web-app/staff.html` - Ensure status display updates correctly
- Database: Verify `busy_until` field handling

#### 3. Add Duration and Location to Financial Reports 🔴 **HIGH PRIORITY**
**Priority**: HIGH - Critical for business reporting and analysis  
**Impact**: Financial reports lack essential transaction details  
**Required**: Update admin-reports.html and backend/routes/reports.js to include duration and location breakdowns

**Current Status**: 🔴 **NOT IMPLEMENTED** - Financial reports missing duration and location columns

**Technical Requirements**:
- Add duration column to financial reports
- Add location column to financial reports
- Update report calculations to include duration and location data
- Ensure backward compatibility with existing data

**Files to Modify**:
- `web-app/admin-reports.html` - Add duration and location columns
- `backend/routes/reports.js` - Update report generation logic
- Database: Verify `duration` and `location_id` fields are available

### Previous Accomplishments (Before Staff Roster Discovery)

#### ✅ Critical 500 Internal Server Error Resolution (August 18, 2025)
**Status**: ✅ **RESOLVED** - System is now 100% operational with no more 500 errors

**What Was Resolved**:
1. **Environment File Consolidation**: Moved single .env file to root directory
2. **Systemd Service Optimization**: Updated service to use correct WorkingDirectory and ExecStart paths
3. **Git Tracking Cleanup**: Removed deploy.sh and .env files from Git tracking
4. **Database Path Resolution**: Fixed DATABASE_PATH to resolve correctly

#### ✅ Transaction Form Debugging Completed
**Status**: ✅ **RESOLVED** - All issues resolved

**What Was Resolved**:
1. **Input Validation Middleware Fixed** - Calculated fields no longer validated
2. **Service Dropdown Population Fixed** - Services now populate correctly
3. **Final End-to-End Testing Completed** - Transaction form submission working perfectly

## Implementation Priority

### Phase 1: Database Schema Restructuring (CRITICAL PRIORITY)
**Estimated Effort**: 4-6 hours  
**Dependencies**: None - can be implemented immediately  
**Impact**: CRITICAL - Staff administration page completely broken until fixed

**Implementation Steps**:
1. **Update `staff` table schema** - Add all payment tracking fields (total_fees_earned, total_fees_paid, last_payment_date, hire_date, notes)
2. **Simplify `staff_roster` table schema** - Remove payment tracking fields, keep only daily fields
3. **Migrate existing payment data** - Move payment data from `staff_roster` to `staff` table
4. **Update admin staff endpoints** - Change to read/write from `staff` table instead of `staff_roster`
5. **Test staff administration page** - Verify it now works correctly

### Phase 2: Busy Time Reset Issue (HIGH PRIORITY)
**Estimated Effort**: 2-4 hours  
**Dependencies**: Phase 1 completion  
**Impact**: High - affects daily operations and customer service

**Implementation Steps**:
1. Investigate current `resetExpiredBusyStatuses()` function
2. Identify why statuses are not being reset
3. Fix the status reset logic
4. Test with various scenarios
5. Verify status display updates correctly

### Phase 3: Financial Reports Enhancement (HIGH PRIORITY)
**Estimated Effort**: 4-6 hours  
**Dependencies**: Phase 1 completion  
**Impact**: High - affects business reporting and analysis

**Implementation Steps**:
1. Review current financial reports structure
2. Add duration and location columns to reports
3. Update report generation logic
4. Test with existing data
5. Verify backward compatibility

## Success Criteria

### For Database Schema Restructuring
- ✅ Staff administration page loads and functions correctly
- ✅ Staff can be added, edited, and removed from master staff list
- ✅ Payment tracking data persists across daily roster clears
- ✅ Daily roster clearing only affects daily stats, not long-term data
- ✅ Both `staff` and `staff_roster` tables serve their intended purposes

### For Busy Time Reset Issue
- ✅ Staff statuses automatically reset to "Available" after duration expires
- ✅ No staff remain stuck in "Busy until..." status indefinitely
- ✅ Status updates are reflected immediately in the UI
- ✅ System handles various duration values correctly

### For Financial Reports Enhancement
- ✅ Duration column visible in all financial reports
- ✅ Location column visible in all financial reports
- ✅ Report calculations include duration and location data
- ✅ Existing reports continue to work without errors
- ✅ New reports provide enhanced business insights

## Risk Assessment

### High Risk Items
- **Database Schema Restructuring**: Major schema changes affecting core functionality
- **Data Migration**: Risk of data loss during payment data migration

### Medium Risk Items
- **API Endpoint Updates**: Changes to admin staff endpoints may introduce bugs
- **Frontend Updates**: Admin staff page updates may cause display issues

### Low Risk Items
- **Busy Time Reset Issue**: Well-contained functionality, low risk of breaking other features
- **Financial Reports Enhancement**: Additive changes, low risk of regression

### Mitigation Strategies
1. **Comprehensive Testing**: Test all changes thoroughly before deployment
2. **Data Backup**: Create database backup before schema changes
3. **Incremental Implementation**: Implement changes in small, testable increments
4. **Rollback Plan**: Maintain ability to revert changes if issues arise

## Next Steps

### Immediate (Next 24 hours)
1. **Start Database Schema Restructuring** - Begin updating table schemas and migrating data
2. **Plan API Endpoint Updates** - Design the new endpoint structure for admin staff operations

### Short Term (Next Week)
1. **Complete Database Schema Restructuring** - Finish schema updates and data migration
2. **Update Admin Staff Endpoints** - Modify endpoints to use correct tables
3. **Test Staff Administration Page** - Verify all functionality works correctly

### Long Term (Next Month)
1. **Implement Busy Time Reset** - Fix automatic status reset functionality
2. **Enhance Financial Reports** - Add duration and location columns
3. **Comprehensive Testing** - Test all changes thoroughly

The system is now **PARTIALLY OPERATIONAL** with staff roster functionality working correctly, but staff administration page completely broken due to database architecture mismatch. The next phase focuses on restructuring the database schema to fix the staff administration page and establish proper data separation between daily operations and long-term staff management.

This is a critical architectural issue that must be resolved before the system can be considered fully operational for business use.
