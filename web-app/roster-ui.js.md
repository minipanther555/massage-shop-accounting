# Roster UI Helper Module Specification

## Overall Purpose
`roster-ui.js` provides a minimal drag-and-drop DOM enhancement for roster containers. It is not the canonical Today Staff ordering persistence layer. The current persisted Today Staff order is owned by `web-app/controllers/staff-page-controller.js`, which calls `api.reorderTodayStaff()` / `/api/staff/today/reorder`.

## End-to-End Data Flow
If a caller invokes `window.rosterUI.enhance(container)`, this helper listens for `dragover` and `drop` events, moves the dragged DOM element before the drop target, and dispatches a local `roster:changed` event. No API call, database write, or queue recalculation happens inside this helper.

## Module API & Logic Breakdown

### `window.rosterUI.enhance(ul = document.getElementById('roster-list'))`
- **Purpose:** Attach local drag/drop behavior to a roster container.
- **Parameters:** `ul` DOM element, optional; defaults to `#roster-list`.
- **Returns:** `undefined`.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** This is visual-only. Persistent queue controls must use `staff-page-controller.js#reorderVisibleRoster()` so order changes reach `today_staff.position`.

## Dependency Mapping

### Upstream Dependencies
- `web-app/staff.html` and `web-app/staff.ejs` load this script for compatibility.
- No current audited workflow should depend on it for database persistence.

### Downstream Dependencies
- Browser DOM APIs only.
- Emits `roster:changed` on the enhanced container.

## Bug & Resolution History

### Bug Summary: Drag Helper Was Ambiguous During Whole-App Audit (2026-07-14)
The helper could be mistaken for the Today Staff reorder implementation even though it only moves DOM nodes.

### Validated Hypothesis
Source inspection showed no API calls in `roster-ui.js`; persisted Today Staff queue changes now flow through `staff-page-controller.js#reorderVisibleRoster()`.

### Resolution
Documented `roster-ui.js` as a visual compatibility helper and kept persisted order under the controller/API contract.
