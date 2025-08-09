# Detailed Testing Substeps - Massage Shop POS System

## Phase 1: Connectivity Resolution 🔄 ACTIVE

### Step 1.1: Systematic Network Diagnostics
- [ ] **1.1.1** Kill any existing Node processes: `pkill -f node`
- [ ] **1.1.2** Clear port 3000: `lsof -ti:3000 | xargs kill -9`
- [ ] **1.1.3** Start backend fresh: `cd backend && npm run dev`
- [ ] **1.1.4** Wait for startup messages completion
- [ ] **1.1.5** Verify process exists: `ps aux | grep node`
- [ ] **1.1.6** Check port binding: `lsof -i :3000`
- [ ] **1.1.7** Check network stats: `netstat -an | grep 3000`

### Step 1.2: HTTP Connection Testing
- [ ] **1.2.1** Test IPv4 localhost: `curl -v http://localhost:3000/health`
- [ ] **1.2.2** Test IPv4 127.0.0.1: `curl -v http://127.0.0.1:3000/health`
- [ ] **1.2.3** Test IPv6 localhost: `curl -v http://[::1]:3000/health`
- [ ] **1.2.4** Test with timeout: `curl --max-time 5 http://localhost:3000/health`
- [ ] **1.2.5** Test different port: `PORT=3001 node server.js`, then `curl localhost:3001/health`

### Step 1.3: Browser-Based Testing
- [ ] **1.3.1** Open web app: `http://localhost:8080`
- [ ] **1.3.2** Open browser dev tools (Network tab)
- [ ] **1.3.3** Attempt to load page and observe network requests
- [ ] **1.3.4** Check for CORS errors in console
- [ ] **1.3.5** Try direct backend URL in browser: `http://localhost:3000/health`

### Step 1.4: Server Configuration Verification
- [ ] **1.4.1** Check server.js binding configuration
- [ ] **1.4.2** Verify CORS settings in .env file
- [ ] **1.4.3** Test with explicit host binding: `app.listen(3000, '127.0.0.1')`
- [ ] **1.4.4** Check Express middleware order
- [ ] **1.4.5** Verify health endpoint exists and responds

**Success Criteria**: HTTP requests return JSON responses without errors

---

## Phase 2: Basic API Functionality Testing

### Step 2.1: Core Endpoints Verification
- [ ] **2.1.1** Test health endpoint: `GET /health`
- [ ] **2.1.2** Test services endpoint: `GET /api/services`
- [ ] **2.1.3** Test staff roster: `GET /api/staff/roster`
- [ ] **2.1.4** Test transaction summary: `GET /api/reports/summary/today`
- [ ] **2.1.5** Test expenses: `GET /api/expenses`

### Step 2.2: Database Connection Verification
- [ ] **2.2.1** Verify SQLite file exists: `ls -la backend/data/`
- [ ] **2.2.2** Check database schema: Open SQLite and run `.schema`
- [ ] **2.2.3** Verify default data exists: `SELECT * FROM services;`
- [ ] **2.2.4** Check staff roster: `SELECT * FROM staff LIMIT 5;`
- [ ] **2.2.5** Confirm empty transactions: `SELECT COUNT(*) FROM transactions;`

**Success Criteria**: All endpoints return expected JSON structure with database data

---

## Phase 3: Web App Integration Testing

### Step 3.1: Frontend-Backend Connection
- [ ] **3.1.1** Load web app homepage without errors
- [ ] **3.1.2** Verify dashboard loads data from API
- [ ] **3.1.3** Check transaction form populates services from API
- [ ] **3.1.4** Verify staff roster displays from API
- [ ] **3.1.5** Confirm no "failed to connect" errors

### Step 3.2: UI Component Functionality
- [ ] **3.2.1** Test service dropdown population
- [ ] **3.2.2** Test staff assignment dropdown
- [ ] **3.2.3** Test payment method selection
- [ ] **3.2.4** Verify form validation works
- [ ] **3.2.5** Check responsive design on tablet size

**Success Criteria**: All UI components load and function without API errors

---

## Phase 4: Transaction Workflow Testing

### Step 4.1: Create Transaction Flow
- [ ] **4.1.1** Navigate to transaction page
- [ ] **4.1.2** Fill complete transaction form:
  - Service: "Thai 60"
  - Staff: Select available masseuse
  - Payment: $250, Cash
  - Times: Set start/end times
- [ ] **4.1.3** Submit transaction
- [ ] **4.1.4** Verify success message
- [ ] **4.1.5** Check transaction appears in recent list

### Step 4.2: Database Persistence Verification
- [ ] **4.2.1** Query database: `SELECT * FROM transactions ORDER BY id DESC LIMIT 1;`
- [ ] **4.2.2** Verify all form data saved correctly
- [ ] **4.2.3** Check transaction_id format
- [ ] **4.2.4** Verify masseuse_fee calculation
- [ ] **4.2.5** Confirm timestamp accuracy

### Step 4.3: Transaction Correction Flow
- [ ] **4.3.1** Load transaction for correction
- [ ] **4.3.2** Modify transaction details
- [ ] **4.3.3** Submit correction
- [ ] **4.3.4** Verify original marked as VOID
- [ ] **4.3.5** Confirm new corrected transaction created

**Success Criteria**: Transactions persist correctly with all business logic intact

---

## Phase 5: Staff Management Testing

### Step 5.1: Staff Roster Management
- [ ] **5.1.1** Add masseuse names to roster positions
- [ ] **5.1.2** Update staff statuses manually
- [ ] **5.1.3** Verify changes persist after page refresh
- [ ] **5.1.4** Test status validation rules
- [ ] **5.1.5** Check today_massages counter updates

### Step 5.2: Serve Next Customer Flow
- [ ] **5.2.1** Set multiple staff to "Available"
- [ ] **5.2.2** Click "Serve Next Customer" button
- [ ] **5.2.3** Verify automatic staff assignment (first available)
- [ ] **5.2.4** Check status change: Available → Busy
- [ ] **5.2.5** Verify previous staff moved to Break (if applicable)

**Success Criteria**: Staff management workflow functions as designed

---

## Phase 6: Expense Tracking Testing

### Step 6.1: Daily Expense Management
- [ ] **6.1.1** Navigate to expense section
- [ ] **6.1.2** Add daily expense: "Office supplies - $25"
- [ ] **6.1.3** Verify expense appears in list
- [ ] **6.1.4** Check expense totals update in dashboard
- [ ] **6.1.5** Confirm data persists in database

### Step 6.2: Expense Validation
- [ ] **6.2.1** Test required field validation
- [ ] **6.2.2** Test numeric amount validation
- [ ] **6.2.3** Verify timestamp accuracy
- [ ] **6.2.4** Check expense summary calculations
- [ ] **6.2.5** Test multiple expenses per day

**Success Criteria**: Expense tracking works accurately with validation

---

## Phase 7: End Day Function Testing 🎯 CRITICAL

### Step 7.1: Pre-End Day Setup
- [ ] **7.1.1** Create 3-5 test transactions
- [ ] **7.1.2** Add 2-3 test expenses
- [ ] **7.1.3** Set various staff statuses (Busy, Break, Off)
- [ ] **7.1.4** Note current data counts for verification
- [ ] **7.1.5** Take database snapshot for rollback if needed

### Step 7.2: End Day Execution
- [ ] **7.2.1** Click "End Day" button
- [ ] **7.2.2** Confirm dialog acceptance
- [ ] **7.2.3** Wait for processing completion
- [ ] **7.2.4** Verify success message with archive count
- [ ] **7.2.5** Check system shows "next day" state

### Step 7.3: Database Verification
- [ ] **7.3.1** Check daily_summaries table:
  ```sql
  SELECT * FROM daily_summaries WHERE summary_date = date('now');
  ```
- [ ] **7.3.2** Verify totals match pre-end day calculations
- [ ] **7.3.3** Check staff roster reset:
  ```sql
  SELECT DISTINCT status FROM staff;
  ```
- [ ] **7.3.4** Confirm expenses cleared (if designed to reset)
- [ ] **7.3.5** Verify transaction archiving (if old data existed)

### Step 7.4: System State Verification
- [ ] **7.4.1** Refresh web app after end day
- [ ] **7.4.2** Verify dashboard shows reset state
- [ ] **7.4.3** Check transaction list is appropriate for new day
- [ ] **7.4.4** Confirm staff roster shows "Available"
- [ ] **7.4.5** Verify expense section reset

**Success Criteria**: End Day archives data to database instead of exporting CSV

---

## Phase 8: Data Persistence & Recovery Testing

### Step 8.1: Server Restart Testing
- [ ] **8.1.1** Create test data after End Day
- [ ] **8.1.2** Stop backend server
- [ ] **8.1.3** Restart backend server
- [ ] **8.1.4** Refresh web app
- [ ] **8.1.5** Verify all data still present

### Step 8.2: Error Recovery Testing
- [ ] **8.2.1** Test invalid transaction data submission
- [ ] **8.2.2** Test network interruption scenarios
- [ ] **8.2.3** Test database lock conditions
- [ ] **8.2.4** Verify graceful error handling
- [ ] **8.2.5** Confirm data integrity maintained

**Success Criteria**: System maintains data integrity under various conditions

---

## Testing Completion Criteria

### Must Pass All:
1. ✅ **Connectivity**: HTTP requests work reliably
2. ✅ **API Functionality**: All endpoints return correct data
3. ✅ **Transaction Workflow**: Complete booking process works
4. ✅ **Staff Management**: Roster and assignment functions
5. ✅ **Expense Tracking**: Daily expense management works
6. ✅ **End Day Function**: Database archiving replaces CSV export
7. ✅ **Data Persistence**: SQLite database maintains data integrity
8. ✅ **Error Handling**: Graceful degradation under failure conditions

### Success Metrics:
- **Performance**: Operations complete under 2 seconds
- **Reliability**: No data loss during any operation
- **Usability**: Interface responsive and intuitive
- **Accuracy**: All calculations match business requirements

**NEXT IMMEDIATE ACTION**: Begin Phase 1 connectivity resolution
