# Simplified Staff System - Feature Specification

## Overview
Replacement of complex multi-status staff management with simplified "next in line" queue system and role-based staff administration.

## Background & Motivation
**Current System Issues:**
- Complex status tracking (Available/Busy/Break/Off/Next) creates unnecessary overhead
- User requested simplification to just track "who's next"
- No role-based access control for staff management
- Single table approach lacks separation between master staff list and daily roster
- **🔴 CRITICAL**: Payment tracking fields stored in daily roster table instead of master staff table
- **🔴 CRITICAL**: Staff administration page completely broken due to database architecture mismatch

**Database Architecture Problem Identified (August 18, 2025)**:
- **Current Architecture (INCORRECT)**:
  - `staff` table: Simple master list with only `{id, name, active, created_at}` - TOO SIMPLE
  - `staff_roster` table: Daily roster with complex payment tracking fields like `total_fees_earned`, `total_fees_paid`, `last_payment_date`, etc. - WRONG PLACE

- **What Should Happen (CORRECT)**:
  - `staff_roster` table: Should ONLY contain daily stats (position, masseuse_name, status, today_massages, busy_until)
  - `staff` table: Should contain ALL long-term payment tracking fields (total_fees_earned, total_fees_paid, last_payment_date, hire_date, notes, etc.)

**Why This Makes Sense**:
- **Staff roster** = "Who's working today and what's their queue status?" (daily, clearable)
- **Staff master** = "What's the total payment history and long-term stats for each staff member?" (permanent, not clearable)

**Business Requirements:**
- Receptionists need simple queue management for daily operations
- Managers need administrative control over master staff list
- System should automatically advance queue with manual override capability
- Daily roster should reset at start of each day

## New System Architecture

### Two-Level Staff Management

#### 1. Master Staff List (Manager-Only)
**Purpose**: Permanent database of all possible masseuses
**Access**: Manager role only
**Features**:
- Add new masseuses to system
- Remove masseuses from system
- View complete staff directory
- Administrative functions only

**Database Table**: `master_staff`
```sql
CREATE TABLE master_staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    masseuse_name TEXT UNIQUE NOT NULL,
    hire_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Daily Staff Roster (Reception Access)
**Purpose**: Today's working masseuses in queue order
**Access**: Both reception and manager roles
**Features**:
- Select masseuses from master list for today
- Arrange queue order via drag-and-drop or up/down buttons
- Manual "next in line" pointer adjustment
- Auto-advance queue when transactions created

**Database Table**: `daily_roster` (modified from current staff_roster)
```sql
CREATE TABLE daily_roster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    position INTEGER NOT NULL,
    masseuse_name TEXT NOT NULL,
    is_next_in_line BOOLEAN DEFAULT FALSE,
    today_massages INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (masseuse_name) REFERENCES master_staff(masseuse_name)
);
```

### Queue Management Logic

#### Next In Line System
**Single Pointer Approach:**
- Only ONE masseuse marked as `is_next_in_line = TRUE` at any time
- When transaction created with "next in line", automatically advance to next position
- Manual override allows selecting any masseuse without affecting queue

**Auto-Advance Algorithm:**
```javascript
async function advanceQueue() {
    // Find current next in line
    const current = await getCurrentNextInLine();
    
    // Clear current marker
    await clearNextInLineFlag();
    
    // Find next position in roster order
    const nextPosition = (current.position % rosterCount) + 1;
    const nextMasseuse = await getRosterByPosition(nextPosition);
    
    // Set new next in line
    await setNextInLine(nextMasseuse.id);
}
```

#### Queue Reset (Daily)
**Start of Day Process:**
- Daily roster cleared for new day
- Manager/reception selects working masseuses from master list
- Queue pointer reset to position 1
- Previous day's massage counts archived

## Authentication & Role System

### Basic Authentication
**Login Screen:**
- Simple username/password form
- Two roles: "reception" and "manager"
- No complex permission system initially

**Role Definitions:**
```javascript
const ROLES = {
    RECEPTION: {
        permissions: ['view_daily_roster', 'manage_daily_roster', 'create_transactions']
    },
    MANAGER: {
        permissions: ['view_daily_roster', 'manage_daily_roster', 'create_transactions', 
                     'manage_master_staff', 'view_reports', 'end_day']
    }
};
```

### Access Control
**Reception Access:**
- Daily Staff Roster page (view/edit)
- Transaction creation
- Basic reporting

**Manager Access:**
- All reception features
- Master Staff List page (add/remove masseuses)
- End Day operations
- Full reporting access

## User Interface Changes

### New Pages Required

#### 1. Login Page (`login.html`)
```
┌─────────────────────────────┐
│ MASSAGE SHOP POS LOGIN      │
├─────────────────────────────┤
│ Username: [_____________]   │
│ Password: [_____________]   │
│ Role: [Reception ▼]         │
│           [Login]           │
└─────────────────────────────┘
```

#### 2. Master Staff List (`master-staff.html`) - Manager Only
```
┌─────────────────────────────────────────┐
│ MASTER STAFF LIST                       │
├─────────────────────────────────────────┤
│ [Add New Masseuse] [Import from CSV]    │
├─────────────────────────────────────────┤
│ ☑ สา                    [Edit] [Remove] │
│ ☑ แพท                   [Edit] [Remove] │  
│ ☑ จิ้บ                   [Edit] [Remove] │
│ ... (all 16 masseuses)                  │
└─────────────────────────────────────────┘
```

#### 3. Enhanced Daily Roster (`staff.html`)
```
┌─────────────────────────────────────────┐
│ DAILY STAFF ROSTER                      │
├─────────────────────────────────────────┤
│ [Add from Master List] [Reset Queue]    │
├─────────────────────────────────────────┤
│ 1. สา          ← NEXT IN LINE [↑] [↓]   │
│ 2. แพท                        [↑] [↓]   │
│ 3. จิ้บ                        [↑] [↓]   │
│ ... (today's selected staff)            │
└─────────────────────────────────────────┘
```

### Modified Transaction Form
**Next In Line Integration:**
- Default selection shows current "next in line" masseuse
- Dropdown still allows manual override for customer requests
- Auto-advance queue when using "next in line" selection

## API Changes Required

### New Endpoints

#### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/session` - Check current session

#### Master Staff Management
- `GET /api/master-staff` - Get all masseuses
- `POST /api/master-staff` - Add new masseuse
- `PUT /api/master-staff/:id` - Update masseuse
- `DELETE /api/master-staff/:id` - Remove masseuse

#### Daily Roster Management
- `GET /api/daily-roster/today` - Get today's roster
- `POST /api/daily-roster/setup` - Setup daily roster from master list
- `PUT /api/daily-roster/reorder` - Reorder queue positions
- `POST /api/daily-roster/advance` - Advance next in line pointer

### Modified Endpoints
- `GET /api/staff/roster` → `GET /api/daily-roster/today`
- Enhanced with next_in_line indicator

## Database Migration

### Migration Steps
1. **Create new tables** (`master_staff`, `daily_roster`)
2. **Migrate existing data** from `staff_roster` to `master_staff`
3. **Create today's roster** from master staff list
4. **Add authentication tables** for user sessions
5. **Update foreign key constraints**

### Data Preservation
- Current 16 masseuse names preserved in master_staff
- Current roster positions mapped to daily_roster
- Transaction history maintains masseuse_name references

## Testing Requirements

### Authentication Testing
- [ ] Login functionality with reception/manager roles
- [ ] Session management and logout
- [ ] Role-based page access restrictions

### Master Staff Management Testing
- [ ] Add new masseuse (manager only)
- [ ] Remove masseuse (manager only)
- [ ] Access restrictions (reception blocked)

### Daily Roster Testing
- [ ] Setup daily roster from master list
- [ ] Reorder queue positions
- [ ] Next in line pointer management
- [ ] Auto-advance functionality

### Queue System Testing
- [ ] Create transaction with "next in line" → auto-advance
- [ ] Create transaction with manual selection → queue unchanged
- [ ] Manual queue pointer adjustment
- [ ] Daily reset functionality

## Implementation Priority

### Phase 1: Database & Backend (Current)
1. Create authentication system
2. Create master_staff table and populate
3. Modify daily_roster table structure
4. Implement new API endpoints

### Phase 2: Frontend Authentication
1. Create login page
2. Implement session management
3. Add role-based navigation

### Phase 3: Staff Management UI
1. Create master staff list page
2. Enhance daily roster page
3. Update transaction form integration

### Phase 4: Testing & Refinement
1. Comprehensive testing of all features
2. User experience refinements
3. Performance optimization

## Success Criteria
- ✅ Simple "next in line" queue system replaces complex status tracking
- ✅ Role-based access control functional
- ✅ Manager can add/remove masseuses independently
- ✅ Reception can manage daily roster without master list access
- ✅ Queue auto-advances with manual override capability
- ✅ Daily roster resets properly at start of each day
- ✅ All existing transaction functionality preserved

## Current Status (August 18, 2025)

### ✅ What's Working
- **Staff Roster System**: Fully operational with all features working correctly
- **Staff Addition to Roster**: Staff can be added sequentially to daily roster
- **Dropdown Population**: Populates with all 16 available staff names from master list
- **Database Operations**: INSERT/UPDATE operations working correctly for roster management
- **API Endpoints**: All staff roster endpoints functional and returning correct data
- **Transaction Page Compatibility**: New transaction page still works with roster data

### ❌ What's Broken
- **Staff Administration Page**: Completely broken due to database architecture mismatch
- **Staff Management Functions**: Cannot add, edit, or remove staff members
- **Payment Tracking**: Cannot view or manage staff payment data
- **Long-term Staff Data**: Cannot access historical staff information

### 🔴 Critical Blocker: Database Architecture Mismatch
**Root Cause**: Payment tracking fields are stored in `staff_roster` table (daily table) instead of `staff` table (master table).

**Impact**: Staff administration page cannot function because it's trying to read/write payment data from the wrong table structure.

**Solution Required**: Restructure database schema to move payment tracking fields from `staff_roster` to `staff` table.

### Next Steps
1. **🔴 CRITICAL**: Restructure database schema to fix staff administration page
2. **HIGH PRIORITY**: Fix 'Busy Until' time reset issue
3. **HIGH PRIORITY**: Add duration and location to financial reports

**Status**: System is **PARTIALLY OPERATIONAL** - staff roster functionality working, but staff administration page completely broken until database architecture is fixed.
