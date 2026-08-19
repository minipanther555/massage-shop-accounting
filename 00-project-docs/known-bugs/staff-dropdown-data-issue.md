# Known Bug: Staff Dropdown Data Issue

## 1. Bug Description
During comprehensive testing, it was observed that the staff dropdown in the transaction page appeared to have no options available. This was initially flagged as a potential bug but was later determined to be a data issue rather than a functionality problem.

## 2. Status
- **Date Identified**: 2025-08-16 (during comprehensive functional testing)
- **Status**: ✅ **RESOLVED - Confirmed Working as Designed**
- **Priority**: LOW (Was initially flagged but confirmed to be working correctly)
- **Impact**: No actual impact - the system was functioning correctly

## 3. Root Cause Analysis
After investigation, this was determined to be a data issue, not a functionality issue. The staff dropdown was working correctly, but the test environment may have had limited or no staff data available.

- **Problem**: Staff dropdown appeared empty during testing
- **Context**: This was observed during automated testing with headless browser
- **Root Cause**: Likely a data availability issue in the test environment, not a code bug
- **Expected Behavior**: Staff dropdown should populate with available staff members from the database

## 4. Investigation Results
The issue was investigated and found to be:
1. **Not a Code Bug**: The dropdown functionality was working correctly
2. **Data-Related**: The test environment may have had limited staff data
3. **Working as Designed**: The system correctly handles cases where no staff data is available

## 5. Resolution Status
- **Status**: ✅ **RESOLVED - Confirmed Working as Designed**
- **Resolution Date**: 2025-08-16
- **Testing Results**: Staff dropdown functionality confirmed to be working correctly. The system properly handles both populated and empty staff lists.

**Note**: This was a false positive during testing. The staff dropdown system is functioning correctly and will display staff members when data is available in the database.

---

## 6. Amendment — 2026-08-19 (`RIT-UI-002`)

**§4.3 and §5 above were wrong when written, and are now true for a different reason.**

This file claimed the system *"correctly handles cases where no staff data is available"*. It did not.
Until `RIT-UI-002`, `renderMasseuseDropdown()` in `web-app/transaction.html` / `.ejs` read:

```js
const masseuseNames = orderedMasseuses.length ? orderedMasseuses : CONFIG.settings.masseuses;
```

`CONFIG.settings.masseuses` is captured once by `loadData()` at page load (`web-app/shared.js:251`) and
never refreshed. With Today Staff empty the dropdown therefore substituted the page-load name list —
after the 2:00 a.m. business-day reset, **yesterday's names, presented as if they were today's roster**.
The 2025-08-16 investigation saw an empty dropdown only because the test environment's page-load list
was empty too, so the fallback had nothing stale to show.

**Fixed by `RIT-UI-002`** (epic `00-project-docs/steps/reception-intake-truth-and-non-massage-income-steps.md`,
spec `FR-004` / `AC-005` / `SC-3`): the fallback is removed, and an empty Today Staff list now produces
a placeholder-only dropdown plus `#staff-empty-state`, which points reception at the Today Staff page.
An empty list caused by a *failed fetch* shows `RIT-UI-001`'s stale marker instead.

Regression cover: `tests/e2e/transaction.dropdown-empty-state.spec.js` and
`__tests__/transaction.dropdown-empty-state.present.test.js`.
