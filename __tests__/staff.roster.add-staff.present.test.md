# Staff Roster Add Staff Presence Test Specification

## Overall Purpose
This Jest test documents and guards the staff roster page's daily workflow UI contract. It ensures the page exposes the secondary Add New Staff modal controls, keeps Thai-first/Thai-only roster workflow labels visible, verifies that the controller still creates missing master staff members from the roster page, guards the clear-everyone confirmation modal, locks the helper-list collapse/restore controls, and keeps today's massage count explicit in the main reorderable list.

## End-to-End Data Flow
Test runner reads `web-app/staff.html` and `web-app/controllers/staff-page-controller.js` from disk → regex assertions validate required DOM IDs, Thai labels, helper text, clear confirmation modal IDs, helper-collapse controls, today-count row copy, and controller API/UI calls → failures indicate the daily staff workflow, missing-name escape hatch, clear-everyone affordance, today-count display, or helper-collapse workflow has regressed before browser execution.

## Module API & Logic Breakdown

### `staff roster page exposes Add New Staff modal controls`
- **Purpose:** Guards the secondary new-hire path on the daily roster page.
- **Parameters:** None.
- **Returns:** Jest pass/fail.
- **Raises/Throws:** Jest assertion failure when modal IDs or Thai Add New Staff text disappear.
- **Usage & Logic Notes:** The button is intentionally secondary in the UI, but the DOM contract must remain available.

### `staff roster labels use Thai-first daily-list language`
- **Purpose:** Guards the Thai staff-facing workflow labels.
- **Parameters:** None.
- **Returns:** Jest pass/fail.
- **Raises/Throws:** Jest assertion failure when core Thai labels or helper text disappear.
- **Usage & Logic Notes:** English is allowed as helper text outside primary buttons; primary staff workflow controls should remain Thai-focused.

### `staff controller creates master staff and refreshes dropdown`
- **Purpose:** Guards the controller path that creates a master staff member and refreshes the available roster dropdown.
- **Parameters:** None.
- **Returns:** Jest pass/fail.
- **Raises/Throws:** Jest assertion failure when `api.addStaff`, `refreshMasterStaffDropdown`, Thai row labels, explicit `นวดวันนี้` row copy, or count formatting regress.

### `staff roster clear action uses an in-page confirmation modal`
- **Purpose:** Guards the clear-everyone affordance and ensures the staff roster page does not regress to a hard-to-notice native confirm path.
- **Parameters:** None.
- **Returns:** Jest pass/fail.
- **Raises/Throws:** Jest assertion failure when the clear button, modal IDs, Thai confirmation copy, controller modal functions, or `api.clearRoster()` call disappear.

### `staff helper lists can collapse and restore from the roster workflow`
- **Purpose:** Guards the post-morning setup workflow where helper lists can be hidden so the working Today Staff roster sits near the top.
- **Parameters:** None.
- **Returns:** Jest pass/fail.
- **Raises/Throws:** Jest assertion failure when collapse/restore button IDs, Thai labels, or controller collapse functions disappear.
- **Usage & Logic Notes:** This is a structural contract test. Real browser smoke verifies the actual click behavior.

## Dependency Mapping

### Upstream Dependencies (Inputs)
- `web-app/staff.html`
- `web-app/controllers/staff-page-controller.js`

### Downstream Dependencies (Outputs)
- Jest assertion result.
- Regression signal for staff roster UI/documentation work.

## Bug & Resolution History

### Bug Summary: Add New Staff Was Hidden on Another Page
**Validated Hypothesis:** Users needed the Add New Staff escape hatch while building today's roster, not only on the admin/payroll page.
**Resolution:** Added modal controls to the staff roster page and this test to keep them present.

### Bug Summary: Staff Roster UI Reintroduced English or Crowded Labels
**Validated Hypothesis:** Text assertions can catch the most obvious regression before browser testing.
**Resolution:** Added Thai workflow label assertions and controller assertions for Thai row text.

### Bug Summary: Clear Everyone Action Was Missed During Manager Review
**Validated Hypothesis:** A regression test can guard the visible label and in-page confirmation modal contract before browser execution.
**Resolution:** Added assertions for the clear button, `#clear-roster-modal`, `#confirm-clear-roster-btn`, Thai confirmation copy, modal controller functions, and `api.clearRoster()`.

### Bug Summary: Helper Lists Stayed Above the Working Roster After Setup
**Validated Hypothesis:** The page needed a reversible collapse control so the helper lists could be hidden after the Today Staff list was built.
**Resolution:** Added assertions for `#collapse-helper-sections-btn`, `#show-helper-sections-btn`, Thai collapse/restore labels, and controller collapse-state functions.

### Bug Summary: Today's Massage Count Was Not Explicit Enough
**Validated Hypothesis:** A structural UI test can guard the header and row-level `นวดวันนี้` copy that tells staff users what the count means.
**Resolution:** Added assertions for the `นวดวันนี้` header, controller row label, accessible label, and `N ครั้ง` formatting.
