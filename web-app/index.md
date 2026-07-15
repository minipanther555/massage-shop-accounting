# Index Page - Homepage Dashboard

**File:** `web-app/index.html`  
**Purpose:** Main homepage with dashboard overview and navigation  

## 🎯 Overall Purpose

The index page serves as the primary entry point for the massage shop POS system, providing users with a comprehensive dashboard overview of daily operations, quick access to key functions, and primary navigation to all system modules. This page was recently updated to remove sensitive financial data and implement bilingual navigation support.

## 🔄 End-to-End Data Flow

**User Journey:**
1. **Entry Point:** User accesses root URL (`/` or `index.html`)
2. **Authentication Check:** System verifies user login status
3. **Dashboard Population:** JavaScript calls `refreshHomeData()`, which marks the page loading, calls `loadData()` for services, payment methods, roster, recent transactions, current shop status, and expenses, renders all widgets, then marks the source as live or fallback/error
4. **Dashboard Drilldown:** User taps a compact dashboard card to open an inline detail panel for today's revenue, active staff, or today's expenses; the panel renders from already loaded API-backed state.
5. **Recent Activity Drilldown:** Home also loads upcoming bookings, merges them with current transactions and expenses, and lets the user tap any activity row to inspect details inline; Show more expands the visible activity window beyond the initial five rows.
6. **Navigation Display:** Bilingual navigation buttons render with Thai first and English second; manager-only administration links occupy the same top navigation grid and remain hidden for non-manager users
7. **User Interaction:** User clicks navigation buttons to access different modules
8. **Data Updates:** Dashboard refreshes automatically with latest information and refreshes any currently open drilldown panel

**Data Flow:**
- **Input:** User authentication, navigation clicks, dashboard refresh requests
- **Processing:** JavaScript functions fetch data from APIs, update DOM elements
- **Output:** Rendered dashboard with current metrics, bilingual navigation interface

## 🏗️ Module API & Logic Breakdown

### Dashboard Cards
**Purpose:** Display key operational metrics in real-time  
**Rendering:** Automatically populated via JavaScript API calls  
**Current Cards:** 3 compact clickable cards (reduced from 4 after all-time revenue card removal)
- Today's Revenue: opens today's payment breakdown and recent transaction detail.
- Active Staff: opens current staff status detail from `appData.currentShopStatus.staff` when available, falling back to loaded roster state.
- Today's Expenses: opens today's expense rows from `appData.expenses`.

**JavaScript Functions:**
- `loadData()` - Loads API-backed shared state before homepage widgets render
- `refreshHomeData()` - Owns the Home loading -> render -> live/error sequence for initial load and 30-second refresh
- `setHomeDataStatus()` - Renders explicit loading, API error/fallback, and live-success states
- `updateDashboard()` - Fetches and displays current metrics
- `updateRecentActivity()` - Renders recent transactions/expenses from loaded shared state with escaped labels
- `updatePaymentBreakdown()` / `toggleHomePaymentBreakdown()` - Renders expandable payment-method rows and the matching transactions
- `setupHomeDashboardCards()` - Binds each dashboard card once so cards remain interactive after auto-refresh
- `toggleHomeDetail()` - Opens one card detail panel at a time and marks sibling cards as temporarily hidden
- `renderHomeRevenueDetail()` - Renders escaped payment and transaction detail rows
- `renderHomeStaffDetail()` - Renders receptionist-readable active staff status/count rows, including massage start/end, the 15-minute buffer, and the next time the staff member can accept a new customer
- `getHomeStaffStatusMessage()` - Converts backend status values into plain-language Thai messages without exposing internal states such as `booking_buffer`
- `renderHomeExpensesDetail()` - Renders escaped expense detail rows
- `parseHomeActivityTimestamp()` - Normalizes booking, transaction, and expense timestamps before Home mixes rows in Recent Activity
- `toggleHomeActivityDetail()` / `renderHomeActivityDetail()` - Toggle one escaped detail row directly below the clicked transaction, booking, or expense row; clicking again collapses it
- `formatBookingActivityTime()` - Formats booking schedule timestamps for the activity detail panel
- `refreshData()` - Updates dashboard with latest information

### Primary Navigation
**Purpose:** Main navigation to core system modules. The homepage omits its own Home button because the user is already on that page; other pages still include Home for return navigation.
**Structure:** Bilingual stacked labels (Thai + English)
**Navigation Items:**
- 👥 Daily Staff (staff management)
- 👤 ลูกค้าใหม่ / New Customer (customer intake entry point for transaction entry)
- 📊 Daily Summary (daily reports)

Each page omits its own route from top navigation. For example, the homepage omits Home, the staff roster page omits Daily Staff, the New Customer page omits New Customer, and the Daily Summary page omits Daily Summary.

**Implementation:** Uses centralized `NAV_LABELS` registry from `shared.js`

### Manager Navigation
**Purpose:** Quick access to administrative functions without forcing managers to scroll below the dashboard
**Structure:** Manager-only links inside the same top `.nav-buttons` grid, exposed with `display: contents` so each link remains an individual grid item
**Admin Items:**
- 💰 ติดตามการจ่ายเงิน / Payday Tracking (staff administration)
- 💰 บริการและราคา / Services & Pricing (service management)
- 📊 รายงานการเงิน / Financial Reports (financial analytics)
- 💳 ประเภทการชำระเงิน / Payment Types (payment method management)

**Implementation:** Updated terminology from "Staff Administration" to "Payday Tracking"

### User Info & Logout
**Purpose:** Display current user information and logout functionality  
**Structure:** Right-aligned user info with bilingual logout button  
**Features:** Shows current user role and username

## 🔗 Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services:**
- `shared.js` - Provides `NAV_LABELS` registry and helper functions
- `api.js` - Handles API calls for dashboard data
- Browser authentication system - Provides user session data

**Input Data Contracts:**
- User authentication token (localStorage)
- Dashboard metrics API responses
- Navigation label registry (window.NAV_LABELS)

### Downstream Dependencies (Outputs)
**Called Modules/Services:**
- Staff management system (`staff.html`)
- Transaction system (`transaction.html`)
- Summary/reports (`summary.html`)
- Admin modules (`admin-*.html`)

**Output Data Contracts:**
- Navigation links to other pages
- Dashboard metric displays
- Inline dashboard detail panels with escaped transaction, payment, staff, and expense labels
- Clickable Recent Activity rows backed by current transactions, upcoming bookings, and expenses, with escaped detail inserted directly below the selected row and collapsed on a second click; the compact header control alternates between Show more and Show less
- User authentication status

## 🐛 Bug & Resolution History

### Revenue Card Removal (2024-12-19)
**Bug Summary:** Sensitive "All-Time Revenue" card was visible on homepage, exposing historical financial data to all users.

**Validated Hypothesis:** The revenue card was hardcoded in the HTML and referenced by JavaScript, creating a security vulnerability.

**Invalidated Hypotheses:**
- CSS hiding would be sufficient (❌ - data still accessible via DOM)
- JavaScript removal alone would work (❌ - HTML element still present)
- Dashboard would break with 4→3 cards (❌ - CSS Grid auto-adjusts)

**Resolution:** Complete removal of revenue card DOM element and associated JavaScript references, reducing dashboard from 4 to 3 cards.

### Bilingual Navigation Implementation (2024-12-19)
**Bug Summary:** All navigation buttons were English-only, excluding Thai-speaking users from understanding the interface.

**Validated Hypothesis:** Navigation labels were hardcoded as inline text, requiring manual updates across multiple files.

**Invalidated Hypotheses:**
- CSS-only solution would work (❌ - requires HTML structure changes)
- Individual file updates would be sufficient (❌ - needed centralized management)
- Font changes alone would solve the problem (❌ - required structural changes)

**Resolution:** Implemented centralized `NAV_LABELS` registry in `shared.js` and converted all navigation buttons to bilingual stacked spans with Thai-first labels.

### Self-Reference Navigation Removal and New Customer Terminology (2026-07-09)
**Bug Summary:** Primary navigation rendered a button for the current page and the transaction route was labeled as "New Transaction", which did not match the staff workflow of taking a new customer.

**Validated Hypothesis:** The problem was hardcoded page navigation, not routing. Users were confused by self-reference links and by transaction terminology.

**Invalidated Hypotheses:**
- Active self-links were useful orientation.
- "New Transaction" was clear enough.

**Resolution:** Homepage omits the Home self-link, other pages omit their own route, and the transaction route is labeled Thai-first as `ลูกค้าใหม่ / New Customer`.

### Homepage Data Load and Safe Rendering (2026-07-14)
**Bug Summary:** Homepage widgets used `appData` for staff counts, recent activity, expenses, and payment breakdown without first loading the API-backed shared state on page entry.

**Validated Hypothesis:** The page called `updateDashboard()`, `updateRecentActivity()`, and `updatePaymentBreakdown()` immediately after auth, but shared auto-initialization is intentionally disabled and each page must call `loadData()` itself.

**Invalidated Hypotheses:**
- The dashboard summary endpoint was missing.
- The static and EJS pages intentionally differed.

**Resolution:** Both `index.html` and `index.ejs` call `loadData()` before initial render and before each 30-second refresh, escape dynamic recent-activity and payment labels, and are guarded by `__tests__/homepage.contract.present.test.js`.

### Interactive Home Dashboard Drilldowns (2026-07-14)
**Bug Summary:** Browser review found the Home dashboard cards were static, too tall at a 667px-wide viewport, and left detail-seeking users with no direct way to inspect today's revenue, staff, or expense details from the Home page.

**Validated Hypothesis:** The page had enough API-backed state after `loadData()`, but the cards were plain static `.dashboard-card` blocks and the global mobile dashboard rule stacked them vertically.

**Invalidated Hypotheses:**
- A backend endpoint was required for this pass.
- The details needed a modal or separate page.
- The existing tall one-column card layout was appropriate for repeated receptionist use.

**Resolution:** Converted the three Home cards into compact accessible buttons with inline drilldown panels, reused the existing Daily Summary compact-card pattern, added Home-scoped responsive CSS so the three cards share one row at the 667px viewport, and expanded the homepage contract test.

### Home Navigation and Live Recent Activity Follow-Up (2026-07-14)
**Bug Summary:** Manager navigation remained in a separate block below the dashboard, and Home could omit newly entered massages or show an empty Revenue drilldown even when the API had returned transactions.

**Validated Hypothesis:** Mixed `Z` / `+07:00` timestamp strings were previously ordered lexically in `/api/transactions/recent`, while the Revenue drilldown additionally compared mapped JavaScript `Date` objects directly with a `YYYY-MM-DD` string. The backend ordering was corrected by BKG-005; the remaining Home comparison always rejected dated rows.

**Invalidated Hypotheses:**
- Transaction creation was failing.
- Home needed a new backend endpoint or schema change.
- The admin links needed to remain a separate section for authorization.

**Resolution:** Preserve BKG-005's normalized backend ordering, trust the already date-scoped `appData.transactions` array on Home, consolidate manager links into the top navigation, and display explicit loading/live/fallback state. Browser verification at 630x998 confirmed seven top navigation links, live API state, populated Recent Activity, and eight Revenue-detail transaction rows.

### Requested-Staff Credit Annotation In Recent Activity (2026-07-14)
**Bug Summary:** Home Recent Activity showed the service and amount but did not reveal that a transaction carried the separate requested-staff `฿50` pay credit.

**Validated Hypothesis:** `shared.js` now provides `bookingCredit`, so Home can reuse the same compact transaction annotation without changing its data source.

**Resolution:** Transaction activity entries carry `bookingCredit` and render `จองพนักงาน +฿50` only when positive; expense activity is unchanged.

### Booking Rows Missing From Home Recent Activity (2026-07-14)
**Bug Summary:** A saved Booking-mode reservation showed a success message on New Customer but did not appear in Home Recent Activity, and existing activity rows could not be clicked for detail.

**Validated Hypothesis:** Booking mode writes a non-financial `BOOKED` row through `/api/bookings`, while Home Recent Activity only merged transactions and expenses. The renderer also created inert `div.transaction-item` rows with no click handler or detail surface.

**Invalidated Hypotheses:**
- The Booking submit failed.
- `/api/transactions/recent` ordering was still the blocker.
- A schema change was required.

**Resolution:** Home now fetches upcoming bookings during `refreshHomeData()`, merges booking rows with transaction and expense activity by normalized activity time, renders each activity row as a clickable button, and inserts one escaped detail row directly below the selected transaction, booking, or expense row; clicking the same row collapses it and opening another closes the prior detail.

### Future Booking Mistakenly Shown As Revenue (2026-07-15)
**Bug Summary:** Home Recent Activity showed a future reservation such as `Coconut lovers - coconut oil massage Booking` as green `+฿50.00`, although the customer had not arrived or paid.

**Validated Hypothesis:** `updateRecentActivity()` explicitly assigned `amount: 50` to every booking row before the renderer formatted it as a positive financial amount. The local database contained the corresponding `BOOKED` reservation but no transaction or `booking_credits` row; the booking route is intentionally non-financial.

**Invalidated Hypotheses:** Booking insertion did not write the wrong payment amount. The `฿50` value is a deferred requested-staff credit created only by arrival conversion, not reservation revenue.

**Resolution:** Future booking activity now carries a null amount and renders `ยังไม่ชำระ` in a neutral color. The inline booking detail retains the explanation that any eligible `฿50` credit is created when the customer arrives and pays. `index.html` and `index.ejs` remain mirrored and are guarded by the homepage contract test.

### Internal Staff Status Labels Were Not Receptionist-Friendly (2026-07-15)
**Bug Summary:** Home Active Staff detail exposed the internal `booking_buffer` state and showed only a bare time such as `13:27`, forcing the receptionist to infer whether that was a massage end time or a free-again time.

**Validated Hypothesis:** `renderHomeStaffDetail()` rendered `current_state`, `busy_until`, or the next booking start as one compact status string, while the status API already supplied the start, end, free-after-buffer, booking interval, and buffer duration.

**Invalidated Hypotheses:** The backend status calculation and 15-minute rule were not the problem; this was a presentation and terminology defect.

**Resolution:** Home now says when a massage starts and ends, explicitly names the 15-minute waiting period, and states when the staff member can accept a new customer. Future booking-buffer rows show the booking interval and calculate the free-again time as booking end plus the configured buffer. Internal state names are no longer shown to receptionists.

## 🔒 Security Considerations

### Data Exposure Prevention
- **Revenue Data:** All historical financial metrics removed from homepage
- **User Access:** Dashboard shows only operational metrics, not sensitive historical data
- **Authentication:** User information displayed only after successful login

### Navigation Security
- **Link Validation:** All navigation links point to valid system pages
- **Access Control:** Admin functions require appropriate user permissions
- **Session Management:** Logout functionality properly clears user session

## 🌐 Internationalization Features

### Bilingual Support
- **Language Coverage:** Thai (primary) + English (secondary)
- **Label Structure:** Stacked display with clear visual hierarchy
- **Font Support:** Thai-optimized fonts (Noto Sans Thai, Sarabun)
- **Cultural Sensitivity:** Appropriate sizing and spacing for both languages

### Extensibility
- **Language Registry:** Easy to add new languages to `NAV_LABELS`
- **Consistent Pattern:** All navigation elements follow same bilingual structure
- **Maintenance:** Single source of truth for all navigation labels

## 📱 Responsive Design

### Grid System
- **CSS Grid:** Automatic column adjustment based on content
- **Breakpoint Compatibility:** No changes to existing responsive breakpoints
- **Content Adaptation:** Dashboard automatically adjusts to 3 cards

### Mobile Optimization
- **Touch Targets:** Navigation buttons sized for mobile interaction
- **Stacked Labels:** Bilingual display works well on small screens
- **Performance:** No additional JavaScript calculations required

## 🚀 Future Enhancements

### Planned Improvements
1. **Language Selection:** User preference-based language display
2. **Dashboard Customization:** User-configurable dashboard cards
3. **Real-time Updates:** WebSocket integration for live data
4. **Advanced Analytics:** Enhanced metric visualizations

### Technical Debt
1. **Component Migration:** Prepare for React/Vue component system
2. **State Management:** Centralize dashboard state management
3. **API Optimization:** Implement data caching and request batching
4. **Performance Monitoring:** Add performance metrics and optimization

---

**Last Updated:** 2024-12-19  
**Status:** PRODUCTION READY ✅  
**Maintainer:** Development Team  
**Next Review:** 2025-01-19 (Monthly)
