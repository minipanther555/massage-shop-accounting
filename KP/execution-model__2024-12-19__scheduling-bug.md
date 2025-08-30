# Execution Model - Scheduling Bug Investigation

**Generated:** 2024-12-19  
**Trace ID:** scheduling-bug  
**Status:** CFEP Analysis Complete

---

## **SITUATION ANALYSIS**

**Core Problem:** Staff busy status is not being cleared after service end time passes, causing staff to appear unavailable when they should be free.

**First Principles:** The scheduling system must automatically manage staff availability based on time-based constraints. When a service ends, the staff member's busy status should automatically reset to available.

**Key Variables:**
- Staff busy status tracking in `staff_roster` table
- Service end time calculations and storage
- Automatic status reset mechanism
- Frontend state synchronization with backend

---

## **EXECUTION MODEL SYNTHESIS**

### **Full Data Path Analysis**

Based on the bounded CFEP analysis, here's the complete execution model for the scheduling bug:

#### **1. Frontend Transaction Flow**
```
User selects service → Duration calculated → Start/End time auto-filled → 
Staff selected → Transaction submitted → Backend processes → 
Staff status set to "Busy until [end_time]" → Frontend updates roster display
```

**Key Functions:**
- `updatePricing()` in `transaction.html` - Calculates end time based on duration
- `handleSubmit()` in `transaction.html` - Packages transaction data
- `submitTransaction()` in `shared.js` - Sends to backend API

#### **2. Backend Staff Status Management**
```
POST /api/transactions → Transaction created → 
POST /api/staff/set-busy → Staff status updated to "Busy until [end_time]" → 
Database updated with status and busy_until fields
```

**Key Functions:**
- `set-busy` endpoint in `staff.js` - Sets staff as busy until end time
- `resetExpiredBusyStatuses()` in `staff.js` - Should clear expired statuses
- Database operations in `database.js` - Manages staff_roster table

#### **3. Status Reset Mechanism**
```
GET /api/staff/roster → resetExpiredBusyStatuses() called → 
Time comparison: current_time vs busy_until → 
If expired: status reset to NULL, busy_until cleared → 
Updated roster returned to frontend
```

**Key Functions:**
- `resetExpiredBusyStatuses()` in `staff.js` - Core status reset logic
- Time parsing and comparison logic
- Database UPDATE operations

---

## **KEY INSIGHTS FROM CFEP ANALYSIS**

### **Frontend State Management**
From `shared.js.md` lines 45-50:
> "`appData` (Object) - Central application state container holding all runtime data... All functions read from and write to this object, ensuring data consistency across the application"

**Critical Finding:** The frontend maintains staff status in `appData.roster` but this may not be synchronized with the backend's automatic status reset.

### **Backend Status Reset Logic**
From `staff.js` lines 8-75:
> "`resetExpiredBusyStatuses()` - Helper function to reset expired busy statuses... Compares current time with busy_until field and resets expired statuses"

**Critical Finding:** The backend has a `resetExpiredBusyStatuses()` function that should automatically clear expired busy statuses, but it's only called when `/api/staff/roster` is accessed.

### **Time Format Handling**
From `staff.js` lines 35-50:
> "Handle different time formats... Convert '8:34 PM' format to '20:34' format... Compare times using normalized format"

**Critical Finding:** The backend handles multiple time formats and normalizes them for comparison, but there may be edge cases in time parsing.

### **Database Schema**
From `database.js` lines 60-70:
> "`staff_roster` table: position, masseuse_name, status, today_massages, busy_until, last_updated, location_id"

**Critical Finding:** The database has the correct structure with `busy_until` field for time-based status management.

---

## **ROOT CAUSE HYPOTHESIS**

**Primary Hypothesis:** The `resetExpiredBusyStatuses()` function is only called when the roster is explicitly fetched via `/api/staff/roster`, but the frontend may not be calling this endpoint frequently enough to trigger automatic status clearing.

**Secondary Hypothesis:** There may be a time format parsing issue in the `resetExpiredBusyStatuses()` function that prevents proper time comparison.

**Tertiary Hypothesis:** The frontend state (`appData.roster`) is not being synchronized with backend status changes, causing the UI to show stale busy status information.

---

## **AFFECTED MODULES IN CHAIN**

1. **`web-app/transaction.html`** - Transaction form and time calculations
2. **`web-app/shared.js`** - Global state management and API calls
3. **`web-app/api.js`** - API client wrapper
4. **`backend/routes/staff.js`** - Staff status management endpoints
5. **`backend/models/database.js`** - Database operations
6. **`backend/routes/transactions.js`** - Transaction processing (calls staff status updates)

---

## **NEXT ACTION RECOMMENDATION**

**Immediate Action:** Start with **Frontend Logic Trace** to understand how the frontend manages staff status updates and identify where the synchronization gap occurs.

**Rationale:** The backend has the status reset mechanism, but the frontend may not be triggering it frequently enough or may not be properly displaying the updated status. Starting with the frontend will reveal the user experience flow and identify the exact point where the bug manifests.
