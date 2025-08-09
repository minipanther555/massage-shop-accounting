# Testing Plan - Massage Shop POS System

## Test Environment
- **Backend**: `http://localhost:3000` (Node.js/Express/SQLite)
- **Frontend**: `http://localhost:8080` (Static HTML/CSS/JS)
- **Database**: SQLite file at `backend/data/massage_shop.db`

## Testing Phases

### Phase 1: Connectivity Resolution ✅ COMPLETED
**Objective**: Resolve server connectivity issues

**Tests**:
- [x] Server startup verification
- [x] Port binding confirmation  
- [x] HTTP request/response cycle
- [x] API health endpoint accessible
- [x] Web app can connect to backend
- [x] Staff dropdown functionality (race condition resolved)
- [x] Database populated with masseuse names

**Success Criteria**: ✅ ACHIEVED
- `curl http://localhost:3000/health` returns JSON response
- Web app loads without "failed to connect" errors
- All API endpoints functional across all pages
- Staff dropdown shows all 16 masseuse names correctly

### Phase 2: Basic API Functionality ✅ COMPLETED
**Objective**: Verify core API operations

**Tests**:
- [x] GET `/api/services` - Load service types
- [x] GET `/api/staff/roster` - Load staff roster (populated with names)
- [x] GET `/api/reports/summary/today` - Get daily summary (endpoint added)
- [x] GET `/api/expenses` - Load today's expenses

**Success Criteria**: ✅ ACHIEVED
- All endpoints return expected JSON data with populated content

### Phase 3: Staff System Enhancement 🔄 CURRENT
**Objective**: Implement simplified staff management system

**Test Scenarios**:
1. **Authentication System**
   - [ ] Create login page with reception/manager roles
   - [ ] Test role-based access control
   - [ ] Verify session management

2. **Master Staff List (Manager Only)**
   - [ ] Create master staff management page
   - [ ] Test adding new masseuses
   - [ ] Test removing masseuses
   - [ ] Verify reception cannot access

3. **Simplified Queue System**
   - [ ] Remove complex status tracking
   - [ ] Implement "next in line" pointer
   - [ ] Test auto-advance functionality
   - [ ] Test manual override capability

**Success Criteria**: Simplified staff system functional with role-based access

### Phase 4: Transaction Workflow
**Objective**: Complete transaction creation and management

**Test Scenarios**:
1. **Create Transaction**
   - [ ] Fill transaction form with populated masseuse dropdown
   - [ ] Submit transaction
   - [ ] Verify data saved to database
   - [ ] Check transaction appears in recent list
   - [ ] Verify queue auto-advance (if using "next in line")

2. **Transaction Correction**
   - [ ] Load transaction for correction
   - [ ] Modify transaction details
   - [ ] Submit correction
   - [ ] Verify original marked as VOID
   - [ ] Verify corrected transaction created

**Success Criteria**: Transactions persist in SQLite database with enhanced staff system

### Phase 5: Enhanced Staff Management
**Objective**: Test simplified staff management system

**Test Scenarios**:
1. **Daily Roster Management**
   - [ ] Setup daily roster from master staff list
   - [ ] Reorder queue positions via UI
   - [ ] Manually adjust "next in line" pointer
   - [ ] Verify updates persist after page refresh

2. **Queue Operations**
   - [ ] Use "next in line" selection in transaction form
   - [ ] Verify automatic queue advancement
   - [ ] Test manual masseuse selection (override)
   - [ ] Verify queue pointer remains unchanged on override

**Success Criteria**: Simplified queue system functions as designed

### Phase 6: Expense Tracking
**Objective**: Daily expense management

**Test Scenarios**:
- [ ] Add daily expense
- [ ] Verify expense appears in list
- [ ] Check expense totals update
- [ ] Verify data saved to database

**Success Criteria**: Expense data persists correctly

### Phase 7: End Day Function 🎯 CRITICAL
**Objective**: Database archiving replaces CSV export

**Pre-conditions**:
- Create several test transactions
- Add test expenses
- Set various staff statuses

**Test Steps**:
1. [ ] Click "End Day" button
2. [ ] Confirm dialog acceptance
3. [ ] Verify success message shows archive count
4. [ ] Check database tables:
   - [ ] `daily_summaries` has new row for today
   - [ ] Old transactions moved to `archived_transactions`
   - [ ] Staff roster reset to "Available"
   - [ ] Expenses cleared

**Database Verification**:
```sql
-- Check daily summary was created
SELECT * FROM daily_summaries WHERE date = date('now');

-- Check transactions were archived (if old data existed)
SELECT COUNT(*) FROM archived_transactions;

-- Check staff roster reset
SELECT DISTINCT status FROM staff_roster;
```

**Success Criteria**: 
- No data loss during archiving
- System ready for next day operations
- Database integrity maintained

### Phase 8: Data Persistence
**Objective**: Verify data survives server restarts

**Test Steps**:
1. [ ] Create test data (transactions, expenses, staff changes)
2. [ ] Restart backend server
3. [ ] Refresh web app
4. [ ] Verify all data still present

**Success Criteria**: SQLite persistence working correctly

## Regression Testing

### Daily Operations
- [ ] Complete massage booking workflow
- [ ] Staff status management
- [ ] Expense tracking
- [ ] Daily summaries accurate

### Error Scenarios
- [ ] Invalid transaction data
- [ ] Missing required fields
- [ ] Server connection loss
- [ ] Database errors

## Performance Testing
- [ ] Load time under 2 seconds
- [ ] Transaction submission under 1 second
- [ ] End day operation under 5 seconds
- [ ] Large data volume handling

## Browser Compatibility
- [ ] Chrome (primary)
- [ ] Safari (secondary) 
- [ ] Firefox (tertiary)
- [ ] Mobile Safari (tablet use)

## Documentation Updates
- [ ] Update README with testing results
- [ ] Document any configuration changes
- [ ] Record performance benchmarks
- [ ] Note any limitations discovered
