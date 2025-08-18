# Manager Administrative Pages - Feature Specification

## Overview
Complete administrative interface accessible only to manager role for system configuration, staff management, financial reporting, and operational oversight.

## Business Requirements

### Access Control
- **Manager-Only Access**: All admin pages redirect reception users to main dashboard
- **Role Verification**: Server-side validation of manager role for all admin API endpoints
- **Navigation Integration**: Admin menu items only visible to manager accounts

### 🔴 CRITICAL ISSUE IDENTIFIED (August 18, 2025)
**Staff Administration Page Completely Broken**: The staff administration page (`admin-staff.html`) is completely non-functional due to fundamental database architecture issues.

**Root Cause**: Payment tracking fields are stored in `staff_roster` table (daily table) instead of `staff` table (master table).

**Current Architecture (INCORRECT)**:
- **`staff` table**: Simple master list with only `{id, name, active, created_at}` - TOO SIMPLE
- **`staff_roster` table**: Daily roster with complex payment tracking fields like `total_fees_earned`, `total_fees_paid`, `last_payment_date`, etc. - WRONG PLACE

**What Should Happen (CORRECT)**:
- **`staff_roster` table**: Should ONLY contain daily stats (position, masseuse_name, status, today_massages, busy_until)
- **`staff` table**: Should contain ALL long-term payment tracking fields (total_fees_earned, total_fees_paid, last_payment_date, hire_date, notes, etc.)

**Impact**: Staff administration page cannot function because it's trying to read/write payment data from the wrong table structure.

**Solution Required**: Restructure database schema to move payment tracking fields from `staff_roster` to `staff` table before any admin functionality can be implemented.

### Core Administrative Functions
1. **Staff Management**: Add/remove masseuses, view performance stats, track payment history
2. **Service Management**: Edit service offerings, adjust prices and masseuse fees
3. **Financial Reporting**: Weekly/monthly breakdowns, staff salary calculations
4. **System Configuration**: Modify payment methods, service categories, operational settings

## Page Specifications

### 1. Manager Staff Administration (`admin-staff.html`)

#### Features Required:
**Master Staff List Management:**
- View all masseuses with hire dates and status
- Add new masseuses to system with validation
- Remove masseuses (soft delete with confirmation)
- Edit masseuse details (name, hire date, notes)

**Staff Performance Analytics:**
- Today's massage count per masseuse
- Weekly massage totals with trending
- Monthly performance comparison
- Revenue generated per masseuse

**Payment & Salary Tracking:**
- Last payment date and amount per masseuse
- Outstanding fees owed to each masseuse
- Payment history log with date/amount records
- Generate payment summaries for payroll

**Database Requirements:**
```sql
-- Extend existing staff_roster table
ALTER TABLE staff_roster ADD COLUMN hire_date DATE;
ALTER TABLE staff_roster ADD COLUMN last_payment_date DATE;
ALTER TABLE staff_roster ADD COLUMN last_payment_amount DECIMAL(10,2);
ALTER TABLE staff_roster ADD COLUMN total_fees_owed DECIMAL(10,2) DEFAULT 0;
ALTER TABLE staff_roster ADD COLUMN notes TEXT;

-- New payment history table
CREATE TABLE staff_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    masseuse_name TEXT NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (masseuse_name) REFERENCES staff_roster(masseuse_name)
);
```

#### UI Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ 👤 STAFF ADMINISTRATION (Manager Only)              [Logout] │
├─────────────────────────────────────────────────────────────┤
│ [Add New Staff] [Import CSV] [Export Payment Report]       │
├─────────────────────────────────────────────────────────────┤
│ MASTER STAFF LIST                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name      │Hired   │Massages│Revenue │Last Pay│Owed    │ │
│ │ สา        │2024-01 │  45    │฿9,000  │Dec 20  │฿1,200  │ │
│ │ แพท       │2024-02 │  38    │฿7,600  │Dec 18  │฿950    │ │
│ │ [Edit] [Remove] [Pay] [View History]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ PERFORMANCE SUMMARY                                         │
│ │ This Week: 156 massages, ฿31,200 revenue                │ │
│ │ Top Performer: สา (12 massages)                          │ │
│ │ Outstanding Payments: ฿8,450 total                       │ │
└─────────────────────────────────────────────────────────────┘
```

### 2. Service & Pricing Management (`admin-services.html`)

#### Features Required:
**Service Configuration:**
- View all services with current pricing
- Add new service types with location/duration variations
- Edit existing service prices and masseuse fees
- Disable/enable services (soft delete)

**Price Management:**
- Bulk price adjustments with percentage increases
- Seasonal pricing variations
- Home service premium calculations (20% markup)
- Historical price change tracking

**Fee Structure Management:**
- Masseuse fee percentages per service type
- Tiered fee structures based on experience/performance
- Special event or holiday fee adjustments

**Database Requirements:**
```sql
-- Extend services table
ALTER TABLE services ADD COLUMN active BOOLEAN DEFAULT TRUE;
ALTER TABLE services ADD COLUMN created_date DATE DEFAULT (date('now'));
ALTER TABLE services ADD COLUMN last_modified DATE DEFAULT (date('now'));
ALTER TABLE services ADD COLUMN notes TEXT;

-- Price history table
CREATE TABLE price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    location TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    old_masseuse_fee DECIMAL(10,2),
    new_masseuse_fee DECIMAL(10,2),
    change_date DATE DEFAULT (date('now')),
    reason TEXT,
    changed_by TEXT DEFAULT 'manager'
);
```

#### UI Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ 💰 SERVICE & PRICING MANAGEMENT (Manager Only)     [Logout] │
├─────────────────────────────────────────────────────────────┤
│ [Add Service] [Bulk Price Update] [Export Price List]      │
├─────────────────────────────────────────────────────────────┤
│ SERVICE CATALOG                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │Service        │Location│Duration│Price  │Fee   │Active │ │
│ │Thai Massage   │In-Shop │60 min  │฿450   │฿120  │  ✓    │ │
│ │Thai Massage   │Home    │60 min  │฿540   │฿140  │  ✓    │ │
│ │[Edit] [Duplicate] [Disable] [Price History]            │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ QUICK ACTIONS                                               │
│ │ Increase all prices by: [5%] [Apply]                    │ │
│ │ Update home service markup: [20%] [Apply]               │ │
│ │ Last price update: December 15, 2024                    │ │
└─────────────────────────────────────────────────────────────┘
```

### 3. Financial Reports & Analytics (`admin-reports.html`)

#### Features Required:
**Weekly/Monthly Reporting:**
- Revenue breakdown by service type, location, payment method
- Staff performance rankings with earnings
- Expense analysis and profit margins
- Trend analysis with charts/graphs

**Advanced Analytics:**
- Customer frequency analysis (repeat customers)
- Peak hours and scheduling optimization
- Service popularity trends
- Seasonal performance patterns

**Export Functions:**
- PDF reports for accounting
- CSV data exports for external analysis
- Print-friendly summary reports
- Email report scheduling

**Database Queries Required:**
```sql
-- Weekly revenue by masseuse
SELECT 
    masseuse_name,
    COUNT(*) as massage_count,
    SUM(payment_amount) as total_revenue,
    SUM(masseuse_fee) as total_fees,
    date(timestamp) as date
FROM transactions 
WHERE date >= date('now', '-7 days') AND status = 'ACTIVE'
GROUP BY masseuse_name, date(timestamp)
ORDER BY total_revenue DESC;

-- Monthly service popularity
SELECT 
    service_type,
    COUNT(*) as bookings,
    AVG(payment_amount) as avg_price,
    SUM(payment_amount) as total_revenue
FROM transactions 
WHERE date >= date('now', 'start of month') AND status = 'ACTIVE'
GROUP BY service_type
ORDER BY bookings DESC;
```

#### UI Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 FINANCIAL REPORTS & ANALYTICS (Manager Only)    [Logout] │
├─────────────────────────────────────────────────────────────┤
│ [Weekly] [Monthly] [Custom Range] [Export PDF] [Print]     │
├─────────────────────────────────────────────────────────────┤
│ PERFORMANCE DASHBOARD                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ This Week: ฿45,680 revenue │ 89 massages │ 12 staff    │ │
│ │ Last Week: ฿42,130 revenue │ 85 massages │ +8.4% ↗️    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ STAFF EARNINGS                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name    │Massages│Revenue  │Fees Earned│Outstanding    │ │
│ │ สา      │   12   │ ฿6,400  │ ฿1,680     │ ฿1,200       │ │
│ │ แพท     │   10   │ ฿5,200  │ ฿1,350     │ ฿950         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ SERVICE BREAKDOWN                                           │
│ │ [Chart: Revenue by Service Type]                         │ │
│ │ [Chart: Bookings by Day of Week]                         │ │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints Required

### Staff Management APIs
```javascript
// Staff administration
GET    /api/admin/staff                    // Get all staff with stats
POST   /api/admin/staff                    // Add new staff member
PUT    /api/admin/staff/:id                // Update staff details
DELETE /api/admin/staff/:id                // Remove staff (soft delete)

// Payment management
GET    /api/admin/staff/:id/payments       // Get payment history
POST   /api/admin/staff/:id/payments       // Record new payment
GET    /api/admin/staff/outstanding-fees   // Get all outstanding fees

// Performance analytics
GET    /api/admin/staff/performance        // Staff performance stats
GET    /api/admin/staff/rankings          // Performance rankings
```

### Service Management APIs
```javascript
// Service configuration
GET    /api/admin/services                 // Get all services with pricing
POST   /api/admin/services                 // Add new service
PUT    /api/admin/services/:id             // Update service/pricing
DELETE /api/admin/services/:id             // Disable service

// Price management
POST   /api/admin/services/bulk-update     // Bulk price adjustments
GET    /api/admin/services/price-history   // Price change history
POST   /api/admin/services/price-rollback  // Rollback price changes
```

### Reporting APIs
```javascript
// Financial reports
GET    /api/admin/reports/weekly           // Weekly performance report
GET    /api/admin/reports/monthly          // Monthly performance report
GET    /api/admin/reports/custom           // Custom date range report
GET    /api/admin/reports/staff-earnings   // Staff earnings breakdown
GET    /api/admin/reports/service-analysis // Service popularity analysis

// Export functions
GET    /api/admin/exports/pdf              // Generate PDF report
GET    /api/admin/exports/csv              // Generate CSV data
POST   /api/admin/exports/email            // Email report
```

## Implementation Phases

### Phase 1: Staff Administration Page
1. Create `admin-staff.html` with staff list and basic management
2. Implement staff CRUD APIs with role validation
3. Add payment tracking database tables and APIs
4. Create staff performance analytics queries

### Phase 2: Service Management Page
1. Create `admin-services.html` with service/pricing interface
2. Implement service management APIs with price history
3. Add bulk update functionality for price adjustments
4. Create price change audit trail

### Phase 3: Financial Reporting Page
1. Create `admin-reports.html` with dashboard and analytics
2. Implement complex reporting queries and APIs
3. Add export functionality (PDF, CSV)
4. Create visual charts and performance indicators

### Phase 4: Integration & Testing
1. Add navigation links to admin pages for manager role only
2. Implement role-based access control on all admin routes
3. Test complete workflow with both reception and manager accounts
4. Verify data consistency and reporting accuracy

## Security Considerations

### Role-Based Access Control
```javascript
// Middleware for admin routes
function requireManagerRole(req, res, next) {
    if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Manager access required' });
    }
    next();
}

// Apply to all admin routes
app.use('/api/admin/*', requireManagerRole);
```

### Frontend Protection
```javascript
// Admin page protection
if (!hasRole('manager')) {
    window.location.href = 'index.html';
    return;
}
```

## Success Criteria
- ✅ Manager can add/remove staff members with proper validation
- ✅ Manager can adjust service prices and masseuse fees
- ✅ Manager can perform bulk price updates with percentage-based multipliers
- ✅ Manager can view and manage all services (active and inactive)
- ✅ Reception users cannot access any admin functionality
- ✅ All admin changes are logged with audit trail
- ✅ System maintains data integrity during admin operations
- ✅ Manager can view comprehensive financial reports and staff analytics
- ✅ Financial reports include filtering by date, staff, service type, and location
- ✅ Reports show revenue, transactions, fees, expenses, and net profit breakdowns

## Current Status (August 18, 2025)

### 🔴 CRITICAL BLOCKER: Database Architecture Issue
**Status**: All admin functionality **BLOCKED** until database schema is restructured.

**What's Broken**:
- **Staff Administration Page**: Completely non-functional due to wrong table structure
- **Staff Management Functions**: Cannot add, edit, or remove staff members
- **Payment Tracking**: Cannot view or manage staff payment data
- **Long-term Staff Data**: Cannot access historical staff information

**Root Cause**: Payment tracking fields are stored in `staff_roster` table (daily table) instead of `staff` table (master table).

**Impact**: The entire manager administrative system cannot function because it's trying to read/write payment data from the wrong table structure.

### ✅ What's Working
- **Staff Roster System**: Fully operational with all features working correctly
- **Transaction Management**: Transaction creation and management working correctly
- **Basic Authentication**: Login and session management working correctly
- **Service Management**: Service configuration and pricing working correctly

### Next Steps
1. **🔴 CRITICAL**: Restructure database schema to move payment tracking fields to correct tables
2. **HIGH PRIORITY**: Implement staff administration page functionality
3. **HIGH PRIORITY**: Implement service management page functionality
4. **HIGH PRIORITY**: Implement financial reporting page functionality

**Status**: System is **PARTIALLY OPERATIONAL** - basic functionality working, but all admin features completely broken until database architecture is fixed.
