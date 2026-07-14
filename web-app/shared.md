# Shared JavaScript Utilities

**File:** `web-app/shared.js`  
**Purpose:** Centralized utility functions and application state management  

## 🎯 Overall Purpose

The shared.js file provides common JavaScript utilities, application state management, and centralized language support for the massage shop POS system. This module was recently enhanced with a comprehensive bilingual navigation system and serves as the single source of truth for all navigation labels across the application. Navigation labels render Thai first and English second.

## 🔄 End-to-End Data Flow

**Data Journey:**
1. **Initialization:** Page loads, shared.js executes, NAV_LABELS registry becomes available
2. **Language Registry:** Global NAV_LABELS object provides bilingual text for all navigation elements
3. **Helper Functions:** renderBilingualLabel() function processes language keys into HTML
4. **Page Integration:** HTML files reference shared.js and use NAV_LABELS for consistent navigation
5. **User Interaction:** Navigation elements display in appropriate languages based on registry
6. **Dynamic Updates:** Language registry can be updated without modifying individual HTML files

**Data Flow:**
- **Input:** Language keys, user preferences, navigation requests
- **Processing:** Helper functions transform keys into bilingual HTML structures
- **Output:** Rendered navigation elements with consistent Thai/English labels

## 🏗️ Module API & Logic Breakdown

### NAV_LABELS Registry
**Purpose:** Centralized storage for all navigation labels in multiple languages  
**Scope:** Global window object accessible across all pages  
**Structure:** Object with navigation keys mapping to language objects  

```javascript
window.NAV_LABELS = {
  home: { en: "🏠 Home", th: "🏠 หน้าแรก" },
  daily_staff: { en: "👥 Daily Staff", th: "👥 พนักงานประจำวัน" },
  new_transaction: { en: "👤 New Customer", th: "👤 ลูกค้าใหม่" },
  daily_summary: { en: "📊 Daily Summary", th: "📊 สรุปรายวัน" },
  payday_tracking: { en: "💰 Payday Tracking", th: "💰 ติดตามการจ่ายเงิน" },
  services_pricing: { en: "💰 Services & Pricing", th: "💰 บริการและราคา" },
  financial_reports: { en: "📊 Financial Reports", th: "📊 รายงานการเงิน" },
  payment_types: { en: "💳 Payment Types", th: "💳 ประเภทการชำระเงิน" },
  logout: { en: "👋 Logout", th: "👋 ออกจากระบบ" }
};
```

**Parameters:** None (global registry)  
**Returns:** Object containing all navigation labels  
**Raises:** None (static object)  
**Usage Notes:** Access via `window.NAV_LABELS[key]` or `NAV_LABELS[key]`

### renderBilingualLabel Function
**Purpose:** Convert navigation keys into HTML with stacked Thai/English labels
**Scope:** Global window function accessible across all pages  
**Signature:** `renderBilingualLabel(key: string): string`  

```javascript
window.renderBilingualLabel = function(key) {
  const entry = (window.NAV_LABELS || {})[key];
  if (!entry) return '';
  return `
    <span class="label-th">${entry.th}</span>
    <span class="label-en">${entry.en}</span>
  `;
};
```

**Parameters:**
- `key` (string, required): Navigation key from NAV_LABELS registry

**Returns:** HTML string with stacked label spans, or empty string if key not found  
**Raises:** None (graceful error handling)  
**Usage Notes:** Returns HTML ready for DOM insertion, handles missing keys gracefully

### Language Key Structure
**Purpose:** Define consistent navigation terminology across the application  
**Current Keys:**
- `home`: Primary navigation to homepage
- `daily_staff`: Staff management and daily operations
- `new_transaction`: New customer intake entry point that routes to transaction entry and processing
- `daily_summary`: Daily reports and summaries
- `payday_tracking`: Staff payment and administration
- `services_pricing`: Service management and pricing
- `financial_reports`: Financial analytics and reporting
- `payment_types`: Payment method management
- `logout`: User session termination

## 🔗 Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services:**
- All HTML pages in the web-app directory
- JavaScript modules requiring navigation labels
- CSS for styling bilingual label spans

**Input Data Contracts:**
- Navigation key strings (from HTML elements)
- Language preference settings (future enhancement)
- User interface requirements

### Downstream Dependencies (Outputs)
**Called Modules/Services:**
- HTML DOM manipulation functions
- CSS styling for .label-en and .label-th classes
- Browser rendering engine for HTML output

**Output Data Contracts:**
- HTML string with bilingual label structure
- Consistent navigation text across all pages
- Language-specific font and styling support

## 🐛 Bug & Resolution History

### Bilingual Navigation Implementation (2024-12-19)
**Bug Summary:** Navigation labels were hardcoded across multiple HTML files, making language management difficult and excluding Thai-speaking users.

**Validated Hypothesis:** Centralized language management was needed to provide consistent bilingual support across all navigation elements.

**Invalidated Hypotheses:**
- Individual file updates would be sufficient (❌ - led to inconsistency and maintenance overhead)
- CSS-only solution would work (❌ - required HTML structure changes)
- Simple text replacement would be adequate (❌ - needed systematic approach)

**Resolution:** Implemented centralized NAV_LABELS registry with renderBilingualLabel helper function, enabling consistent bilingual navigation across all pages.

### Navigation Terminology Update (2024-12-19)
**Bug Summary:** Staff-related navigation labels used confusing terminology that didn't reflect actual functionality.

**Validated Hypothesis:** "Staff Roster" and "Staff Administration" were misleading terms that didn't describe the actual page functions.

**Invalidated Hypotheses:**
- Existing terminology was clear enough (❌ - users were confused about page purposes)
- No changes were needed (❌ - terminology was actively misleading)

**Resolution:** Updated navigation keys to use clear, descriptive terminology:
- `staff_roster` → `daily_staff` ("Daily Staff")
- `staff_admin` → `payday_tracking` ("Payday Tracking")

### Staff-Facing Thai-First Navigation Update (2026-07-09)
**Bug Summary:** Navigation labels and helper rendering were still oriented around English-first labels and internal terminology such as "New Transaction".

**Validated Hypothesis:** The shared registry was the correct source for cross-page terminology, but static templates also needed mirrored updates because some pages contain hardcoded nav HTML.

**Invalidated Hypotheses:**
- CSS-only visual reordering would be sufficient.
- The exact English phrase "New Transaction" should remain because the backend route creates a transaction.
- Staff roster workflow controls should keep bilingual text inside the button.

**Resolution:** `new_transaction` now means the staff-facing customer intake route and renders as `👤 ลูกค้าใหม่` followed by `👤 New Customer`. `renderBilingualLabel()` emits Thai first. Staff roster primary workflow buttons intentionally use Thai-only text with English helper copy outside the button.

## 🔧 Technical Implementation

### Global Object Pattern
**Implementation:** Uses window object for global accessibility  
**Benefits:** Available across all pages without import/export complexity  
**Considerations:** Global scope pollution (mitigated by specific naming)

### Error Handling Strategy
**Graceful Degradation:** Returns empty string for missing keys  
**Null Safety:** Handles undefined NAV_LABELS gracefully  
**User Experience:** Missing labels don't break page functionality

### HTML Generation
**Template Literals:** Uses ES6 template literals for clean HTML generation  
**Structure:** Consistent span structure with label-th first and label-en second
**Styling:** Ready for CSS styling without additional processing

## 🌐 Internationalization Features

### Language Support
**Primary Language:** Thai (th) - First line for staff-facing navigation
**Secondary Language:** English (en) - Second line for support and clarity
**Extensibility:** Easy to add new languages by extending language objects

### Cultural Considerations
**Font Support:** Thai-optimized fonts specified in CSS  
**Text Hierarchy:** The first rendered label is prominent, allowing customer-facing navigation to put Thai first while retaining English as secondary text.
**Spacing:** Appropriate margins and sizing for both languages

### Maintenance Benefits
**Centralized Updates:** Change labels in one location  
**Consistency:** All navigation elements use same language registry  
**Quality Control:** Easy to review and update language content

## 🚀 Future Enhancements

### Language Expansion
```javascript
// Future: Additional language support
window.NAV_LABELS = {
  home: { 
    en: "🏠 Home", 
    th: "🏠 หน้าแรก",
    ja: "🏠 ホーム",  // Japanese
    zh: "🏠 首页"    // Chinese
  }
}
```

### Dynamic Language Selection
```javascript
// Future: User preference-based language
window.getCurrentLanguage = function() {
  return localStorage.getItem('userLanguage') || 'en';
};

window.renderLocalizedLabel = function(key) {
  const lang = window.getCurrentLanguage();
  const entry = window.NAV_LABELS[key];
  return entry ? entry[lang] : key;
};
```

### Component System Integration
```javascript
// Future: React/Vue component support
window.getNavigationProps = function(key) {
  const entry = window.NAV_LABELS[key];
  return {
    english: entry?.en || key,
    thai: entry?.th || key,
    icon: entry?.icon || '📋'
  };
};
```

## 📱 Browser Compatibility

### JavaScript Features
**ES6+ Support:** Template literals, arrow functions, const/let  
**Global Scope:** Compatible with all modern browsers  
**Fallback Support:** Graceful degradation for older browsers

### Performance Considerations
**Memory Usage:** Minimal (static object, no closures)  
**Execution Speed:** Fast (direct object access)  
**Network Impact:** None (loaded once with page)

## 🔒 Security Considerations

### XSS Prevention
**HTML Generation:** Uses template literals with controlled content  
**Input Validation:** Keys are predefined, no user input accepted  
**Output Sanitization:** No dynamic content injection

### Access Control
**Global Availability:** All users can access navigation labels  
**No Sensitive Data:** Only contains UI text, no business logic  
**Public Interface:** Designed for public consumption

---

**Last Updated:** 2024-12-19  
**Status:** PRODUCTION READY ✅  
**Maintainer:** Development Team  
**Next Review:** 2025-01-19 (Monthly)
