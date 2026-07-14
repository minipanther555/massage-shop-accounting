# Staff Roster UI Clarity Issue

## Bug Summary
The staff roster page was technically functional but visually misleading. Navigation buttons were too prominent, the daily staff selector was too small, Add New Staff appeared as a main action even though it is occasional, English text crowded Thai staff-facing controls, and roster rows made names, massage counts, and reorder/remove actions too hard to scan.

## Validated Hypothesis
The root cause was UI hierarchy and copy, not backend behavior. The page needed a task-first daily workflow layout: select staff, add to today's list, reorder staff, remove mistakes, and only add a new staff member when the name is missing.

## Invalidated Hypotheses
- Backend changes were required to improve the workflow.
- Keeping bilingual text inside every staff workflow button would improve clarity.
- The old primary-color nav cards were acceptable because users could still complete the task.

## Resolution
The staff roster page was reworked with compact nav, a large Thai dropdown, a dominant Thai add-to-list button, secondary Add New Staff action, low-prominence clear action, larger roster names/counts, visible drag hint, and Thai order/remove buttons. The controller dropdown placeholder was also updated so initialization does not restore English text.

## Verification
- `node --check web-app/controllers/staff-page-controller.js`
- `git diff --check`
- Focused Jest nav/staff tests
- In-app browser verification at `http://localhost:3000/api/main/staff-roster` with 599px viewport
