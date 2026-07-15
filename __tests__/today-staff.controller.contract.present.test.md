# `__tests__/today-staff.controller.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This test guards the Today Staff controller contract. It verifies that the page uses the canonical Today Staff endpoints for state, helper, add, day-off, restore, and reorder; that set-next/up/down persist through `/api/staff/today/reorder`; that a separate Info button renders escaped inline row details without replacing drag/drop as the row interaction; that rendered staff labels are escaped; and that `staff.html` / `staff.ejs` keep behavior-critical anchors mirrored.

**End-to-End Data Flow:** The test reads `web-app/controllers/staff-page-controller.js`, `web-app/api.js`, `web-app/staff.html`, and `web-app/staff.ejs` as source text. It asserts the controller follows Action -> API -> re-fetch/render, does not use legacy `api.updateStaff()` swaps for Today Staff ordering, and keeps staff details as a button-owned inline panel rather than a row click target.

## 2. Module API & Logic Breakdown

### Jest suite `Today Staff controller UI/database contract`

- **Purpose:** Preserve Today Staff UI/database wiring.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail result.
- **Raises / Throws:** Fails when canonical endpoint usage, reorder persistence, row Info details, safe rendering, or static/EJS anchors drift.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** Jest test runner.
- **Input Data Contracts / Schemas:** Source text from Today Staff controller, API client, and page files.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** Node filesystem APIs and Jest assertions.
- **Output Data Contracts / Schemas:** Test status.

## 4. Bug & Resolution History

### Today Staff Row Info Toggle Guard (2026-07-15)
- **Bug Summary:** Browser review requested row-level staff details, but the roster row itself already had drag/drop behavior, so making the whole row clickable would conflict with ordering.
- **Validated Hypothesis:** A separate `Info` button per row can toggle an inline detail panel directly below the row while leaving drag/drop, set-next, up/down, and remove behavior unchanged.
- **Invalidated Hypotheses:** The whole row should become the click target.
- **Resolution:** Added assertions for `data-action="toggleInfo"`, `.staff-info-btn`, `toggleStaffInfo()`, `renderStaffInfoDetail()`, `.staff-info-detail`, escaped detail rows, and existing drag/drop persistence.

- **Bug Summary:** Today Staff set-next/up/down controls used legacy `api.updateStaff(position)` swaps even though current visible roster state is canonical `today_staff`; rendered staff/helper labels also entered `innerHTML` unescaped.
- **Validated Hypothesis:** Source inspection showed `setNextInLine()`, `moveUp()`, and `moveDown()` calling `api.updateStaff()`, while `api.js` already exposed `reorderTodayStaff()`.
- **Invalidated Hypotheses:** A new backend reorder endpoint was required.
- **Resolution:** Added `reorderVisibleRoster()`, routed set-next/up/down through `api.reorderTodayStaff()`, escaped staff/helper/day-off labels, and added this guard.
