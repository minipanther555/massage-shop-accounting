# Massage Shop POS System - Master Plan

## Overview
Complete Point-of-Sale and bookkeeping system for massage shop operations, migrating from Google Sheets to a modern web application with backend database.

## Architecture Blueprint

### System Components
1. **Backend API** (Node.js/Express/SQLite)
   - RESTful API for all data operations
   - SQLite database for persistence
   - Real-time data processing
   - Database archiving and rollover

2. **Web Application** (HTML/CSS/JavaScript)
   - Multi-page tablet-optimized interface
   - Real-time dashboard
   - Transaction management
   - Staff roster management
   - Expense tracking

3. **Database Schema**
   - `transactions` - All massage service transactions
   - `staff_roster` - Staff management and status
   - `services` - Service types and pricing
   - `payment_methods` - Payment options
   - `expenses` - Daily expense tracking
   - `daily_summaries` - End-of-day archived data
   - `archived_transactions` - Historical transaction data

## Core Features

### Transaction Management
- Record massage services with pricing
- Customer contact tracking (optional)
- Payment method recording
- Transaction correction/voiding
- Real-time revenue tracking

### Staff Management
- **Simplified Queue System**: "Next in Line" pointer only (removed complex status tracking)
- **Master Staff List**: Manager-controlled permanent staff database (16 masseuses)
- **Daily Staff Roster**: Reception-accessible daily queue management
- Automatic queue advancement with manual override capability
- Daily massage count tracking
- Performance reporting

### Financial Operations
- Real-time revenue calculation
- Masseuse fee tracking
- Daily expense recording
- Payment method breakdown
- Historical reporting

### End Day Operations
- **DATABASE ARCHIVING** (replaces CSV export)
- Move today's data to `daily_summaries`
- Archive old transactions to `archived_transactions`
- Reset roster for next day
- Maintain data integrity

## Migration Status
- ✅ Google Sheets functionality mapped
- ✅ Backend API complete and all endpoints functional
- ✅ Web app connected to API (connectivity issues resolved)
- ✅ Critical bugs resolved (API endpoints + script loading + dropdown race condition)
- ✅ Staff roster populated with 16 masseuse names
- ✅ Transaction workflow completely functional (creation, display, summaries)
- ✅ Frontend display bugs resolved (DOM manipulation, async handling, script loading)
- ✅ Authentication system implementation (reception/manager roles, session management)
- ✅ UI display issue resolution (staff cards, payment breakdown, summary loading, drag-drop)
- ✅ Staff system database integration (staff roster page fixed, transaction submission working)
- ✅ Service selection system validation (location+service+duration combinations working correctly)
- ✅ Queue management system integration (both pages using same database source)
- 🔄 Performance optimization (daily summary loading delays)
- ⏳ Comprehensive functional testing (core transaction workflow completed)
- ⏳ Production deployment

## Technology Stack
- **Backend**: Node.js, Express, SQLite, nodemon
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Database**: SQLite with proper schema design
- **Development**: Local testing with HTTP servers
- **Production**: app-server deployment via SSH

## Key Differences from Google Sheets
1. **Data Persistence**: SQLite database vs Google Sheets
2. **End Day**: Database archiving vs CSV export
3. **Performance**: Faster local operations
4. **Offline**: Works without internet connectivity
5. **Scalability**: Can handle larger transaction volumes

## Success Metrics
- All Google Sheets functions replicated
- End Day database archiving working
- Real-time updates functioning
- Transaction workflow complete
- Staff management operational
