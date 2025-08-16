# Known Bug: Static Asset Path Issue on Admin Pages

## 1. Bug Description
When navigating to admin pages (e.g., `/api/admin/staff-page`), static assets like `styles.css`, `api.js`, and `shared.js` fail to load. The browser attempts to fetch these assets from incorrect paths such as `/api/styles.css`, `/api/admin/api.js`, and `/api/admin/shared.js`, resulting in 404 Not Found errors or MIME type mismatches.

## 2. Status
- **Date Identified**: 2025-08-16 (during comprehensive functional testing after authentication refactor)
- **Status**: ✅ **RESOLVED**
- **Priority**: LOW (Cosmetic, does not prevent core functionality)
- **Impact**: Admin pages appear unstyled or with broken JavaScript functionality, affecting user experience but not core business operations.

## 3. Root Cause Analysis
The issue stems from the way relative paths are resolved in HTML documents when those documents are served from a sub-path.
- **Problem**: HTML files in `web-app/` (e.g., `admin-staff.html`) use relative paths for linking CSS (`<link rel="stylesheet" href="../styles.css">`) and JavaScript (`<script src="api.js"></script>`).
- **Context**: When these admin HTML files are served by the backend from routes like `/api/admin/staff-page`, the browser interprets relative paths based on the current URL.
    - `../styles.css` resolves to `/api/styles.css` (incorrect, should be `/styles.css`)
    - `api.js` resolves to `/api/admin/api.js` (incorrect, should be `/api.js`)
- **Expected Behavior**: Static assets should be loaded from the web root (`/styles.css`, `/api.js`, `/shared.js`) regardless of the current page's URL.

## 4. Resolution Plan
The solution is to change all relative paths for static assets in the affected HTML files to absolute paths, ensuring they always resolve from the root of the domain.

1. **Identify Affected Files**: Review all HTML files served via backend routes (especially admin pages) for relative paths to `styles.css`, `api.js`, and `shared.js`.
2. **Update Paths**: Change `href` and `src` attributes from relative paths (e.g., `../styles.css`, `styles.css`, `api.js`) to absolute paths (e.g., `/styles.css`, `/api.js`, `/shared.js`).
3. **Update Navigation Links**: Ensure all internal navigation links within admin pages also use absolute paths to prevent similar issues.
4. **Test**: Re-run comprehensive functional tests to confirm static assets load correctly and the UI is fully functional.

## 5. Resolution Status
- **Status**: ✅ **COMPLETED** - All identified static asset paths have been updated to absolute paths.
- **Implementation Date**: 2025-08-16
- **Testing Results**: Comprehensive functional testing confirms static assets now load correctly, and admin pages are fully styled and functional. No more 404 or MIME type errors for these assets.

The site is now fully functional with correct styling and script loading on all pages.
