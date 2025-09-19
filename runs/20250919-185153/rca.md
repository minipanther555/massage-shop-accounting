# Root Cause Analysis: Asset Path Regression Fix

## Problem
The latest deployment (`589b2ed`) broke production because it changed asset paths from absolute to relative, causing scripts to fail to load properly.

## Root Cause
1. **Dependent commit chain**: The "clean reset" approach in commit `589b2ed` changed all asset paths to relative
2. **Environment difference**: Staging worked with relative paths, but production requires absolute paths
3. **Missing contract tests**: No automated tests to catch asset path regressions

## Solution
**Surgical restore**: Reverted only the asset path references in `web-app/staff.html` from commit `4dfa15c` (testing3201) while preserving the working button functionality from the current state.

## Changes Made
- Restored `web-app/staff.html` script paths to absolute (`/controllers/staff-page-controller.js`)
- Kept all controller fixes and button functionality intact
- Added contract tests for asset paths and button functionality
- Added path guard script to prevent future regressions

## Prevention
- ESLint rules for forbidden API method names
- Path guard script (`scripts/check_paths.sh`)
- Contract tests (`tests/e2e/path-check.spec.js`, `tests/e2e/roster-buttons.spec.js`)
- File-scoped surgery approach to avoid over-restoration
