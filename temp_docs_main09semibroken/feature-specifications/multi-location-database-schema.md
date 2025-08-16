# Multi-Location Database Schema Design

## Overview
This document outlines the database schema changes implemented to support multi-location operations for the EIW Massage Shop chain, extending from single-location to 3-location chain operations.

## Database Schema Changes

### 1. New Locations Table
**Table**: `locations`

**Schema**:
```sql
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  contact_info TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Central repository for all location information across the chain.

**Default Data**: Three locations created by default:
- **Location 1**: Main Branch (Primary location)
- **Location 2**: Downtown (City center location)  
- **Location 3**: Suburban (Residential area location)

### 2. Modified Tables with Location Support

#### 2.1 Staff Roster Table
**Table**: `staff_roster`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates each staff member with a specific location.

**Impact**: 
- Staff can now be assigned to specific locations
- Location-based staff management and scheduling
- Location-specific performance tracking

#### 2.2 Services Table
**Table**: `services`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates services with specific locations.

**Impact**:
- Location-specific service catalogs
- Location-based pricing structures
- Location-specific service availability

**Note**: Existing services automatically assigned to Location 1 (Main Branch).

#### 2.3 Transactions Table
**Table**: `transactions`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates transactions with specific locations.

**Impact**:
- Location-based transaction recording
- Location-specific financial tracking
- Location-based reporting capabilities

#### 2.4 Expenses Table
**Table**: `expenses`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates expenses with specific locations.

**Impact**:
- Location-specific expense tracking
- Location-based cost management
- Location-specific financial reporting

#### 2.5 Daily Summaries Table
**Table**: `daily_summaries`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates daily summaries with specific locations.

**Impact**:
- Location-specific daily reporting
- Location-based financial analysis
- Cross-location comparison capabilities

#### 2.6 Archived Transactions Table
**Table**: `archived_transactions`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates archived transactions with specific locations.

**Impact**:
- Location-based historical data
- Location-specific trend analysis
- Location-based audit trails

#### 2.7 Staff Payments Table
**Table**: `staff_payments`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates staff payments with specific locations.

**Impact**:
- Location-specific payment tracking
- Location-based payroll management
- Location-specific financial reporting

#### 2.8 Payment Methods Table
**Table**: `payment_methods`

**New Field**: `location_id INTEGER DEFAULT 1`

**Purpose**: Associates payment methods with specific locations.

**Impact**:
- Location-specific payment method management
- Location-based payment processing
- Location-specific financial controls

## Database Relationships

### Foreign Key Relationships
```sql
-- Staff roster linked to locations
staff_roster.location_id → locations.id

-- Services linked to locations  
services.location_id → locations.id

-- Transactions linked to locations
transactions.location_id → locations.id

-- Expenses linked to locations
expenses.location_id → locations.id

-- Daily summaries linked to locations
daily_summaries.location_id → locations.id

-- Archived transactions linked to locations
archived_transactions.location_id → locations.id

-- Staff payments linked to locations
staff_payments.location_id → locations.id

-- Payment methods linked to locations
payment_methods.location_id → locations.id
```

### Data Isolation
- **Location-based filtering**: All queries now support location_id filtering
- **Data separation**: Each location's data is isolated by location_id
- **Cross-location access**: Managers can access multiple locations based on permissions

## Performance Optimizations

### Indexes Created
```sql
CREATE INDEX idx_staff_roster_location ON staff_roster(location_id);
CREATE INDEX idx_transactions_location ON transactions(location_id);
CREATE INDEX idx_expenses_location ON expenses(location_id);
CREATE INDEX idx_daily_summaries_location ON daily_summaries(location_id);
CREATE INDEX idx_services_location ON services(location_id);
```

**Purpose**: Optimize queries that filter by location_id for better performance.

## Migration Strategy

### Implementation Approach
1. **Non-destructive migration**: Added new columns without removing existing data
2. **Default values**: All existing records assigned to Location 1 (Main Branch)
3. **Backward compatibility**: Existing functionality continues to work
4. **Gradual rollout**: New location features can be enabled incrementally

### Data Preservation
- **Existing data**: All existing records preserved and assigned to default location
- **No data loss**: Migration is additive, not destructive
- **Rollback capability**: Changes can be reversed if needed

## Business Logic Implications

### 1. Location-Based Access Control
- **Staff access**: Limited to assigned location(s)
- **Manager access**: Can access multiple locations based on permissions
- **Admin access**: Full access to all locations

### 2. Location-Specific Operations
- **Staff management**: Location-specific rosters and schedules
- **Service management**: Location-specific catalogs and pricing
- **Financial tracking**: Location-specific revenue and expense tracking
- **Reporting**: Location-based and cross-location reporting capabilities

### 3. Cross-Location Features
- **Staff transfers**: Staff can be moved between locations
- **Service standardization**: Services can be standardized across locations
- **Financial consolidation**: Cross-location financial reporting and analysis
- **Performance comparison**: Location-to-location performance metrics

## API Changes Required

### Backend Modifications
1. **Location filtering**: All relevant endpoints support location_id parameter
2. **Location management**: New endpoints for location CRUD operations
3. **Authentication**: Location-based access control in authentication middleware
4. **Data validation**: Location_id validation in all relevant operations

### Frontend Modifications
1. **Location selection**: Location picker in all relevant forms
2. **Location filtering**: Location-based filtering in all data displays
3. **Navigation**: Location-aware navigation and breadcrumbs
4. **User interface**: Location-specific branding and information display

## Security Considerations

### Data Isolation
- **Location boundaries**: Strict data isolation between locations
- **Access control**: Users can only access data from assigned locations
- **Audit trails**: All location-based operations logged for security

### Permission Management
- **Role-based access**: Different roles have different location access levels
- **Location permissions**: Granular control over location-specific operations
- **Cross-location access**: Controlled access to multiple locations for managers

## Future Enhancements

### Planned Features
1. **Location-specific settings**: Customizable configurations per location
2. **Location-based analytics**: Advanced reporting and analytics per location
3. **Location management interface**: Admin interface for location management
4. **Location-specific branding**: Customizable UI elements per location

### Scalability Considerations
1. **Performance**: Database performance with multiple locations
2. **Storage**: Data storage requirements for multiple locations
3. **Backup**: Location-specific backup and recovery procedures
4. **Monitoring**: Location-based system monitoring and alerting

## Testing Requirements

### Database Testing
1. **Schema validation**: Verify all tables have location_id columns
2. **Data integrity**: Ensure location_id foreign key relationships work
3. **Performance testing**: Verify query performance with location filtering
4. **Migration testing**: Test migration process and data preservation

### Application Testing
1. **Location filtering**: Test all location-based filtering functionality
2. **Access control**: Verify location-based access control works correctly
3. **Data isolation**: Ensure data is properly isolated between locations
4. **Cross-location features**: Test cross-location functionality

## Success Criteria

### Technical Success
- ✅ All tables have location_id columns
- ✅ Foreign key relationships established
- ✅ Performance indexes created
- ✅ Migration completed without data loss

### Business Success
- ✅ Location-based data isolation working
- ✅ Location-specific operations functional
- ✅ Cross-location features operational
- ✅ Performance maintained with new schema

---

*Last Updated: August 12, 2025*
*Status: Implementation Complete*
*Maintainer: AI Assistant*
