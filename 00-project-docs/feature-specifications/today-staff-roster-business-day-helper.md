# Feature Specification

## 1. Executive Summary

### Feature Name
Today Staff Business-Day Helper and Planning Workflow

### Goal
Redesign the staff roster workflow into an obvious, Thai-first "Today Staff" page that helps a receptionist build the working queue at the start of the day and throughout the day. The page must show yesterday's staff commission earnings, lowest first, so the receptionist can add staff in the correct order without relying on pen-and-paper notes. It must also support clearing the visible queue, marking staff as day off today, undoing that mark, and automatically clearing the visible Today Staff list at the 2:00 a.m. Bangkok-time business-day boundary.

This is a new specification for the reworked staff-facing workflow. The current app and current database are implementation context only. They are not the source of truth for product behavior. The user's interview answers in this spec are the source of truth for this feature.

### Success Criteria
- The page uses the conceptual language **All Staff** and **Today Staff** instead of ambiguous "staff" and "staff roster" terminology in user-facing copy and project documentation.
- Receptionist can see a simple Thai-only helper list of all active staff sorted by previous business-day commission earned, lowest first.
- Staff with zero commission in the previous business day show `฿0` and `หยุดเมื่อวาน`.
- Receptionist can add staff either from the helper list or from the existing dropdown.
- Staff already added to Today Staff cannot be added twice and receive a strong visual state change.
- Receptionist can mark someone `หยุดวันนี้`, removing them from the main helper list and placing them in a visible day-off-today section with an easy undo path.
- Staff marked `หยุดวันนี้` remain available in the dropdown; adding them later automatically removes the day-off-today planning mark.
- The visible Today Staff list shows each staff member's completed massage count for the current Bangkok business day so the receptionist can rebalance the queue after requested bookings or walk-in assignments change fairness.
- The visible Today Staff list auto-clears at 2:00 a.m. Bangkok time.
- Receptionist UI actions cannot alter historical massage records, commission amounts, or staff payday totals.
- The data model supports business-day reporting from 10:00 a.m. Bangkok time until the configured close/reset boundary, with 2:00 a.m. as the default scheduled boundary.

### Requirement Sources
- User clarification interview in this Codex thread, especially:
  - Business day starts around 10:00 a.m. Bangkok time.
  - Late massages before 2:00 a.m. belong to the previous business day.
  - 2:00 a.m. is the scheduled reset/clear boundary.
  - Yesterday earnings are based on staff commission, not customer payment amount.
  - All active staff should appear in the helper list; zero means day off yesterday.
  - Current database can be redesigned from first principles if needed.
  - Current app/database are not product truth; the reworked workflow and user rules are.
- Existing local context:
  - `web-app/staff.html`
  - `web-app/staff.ejs`
  - `web-app/controllers/staff-page-controller.js`
  - `web-app/api.js`
  - `backend/routes/staff.js`
  - `backend/routes/transactions.js`
  - `backend/routes/reports.js`
  - `backend/models/database.js`
  - `web-app/staff.html.md`
  - `web-app/controllers/staff-page-controller.md`
  - `backend/routes/staff.js.md`
  - `backend/models/database.md`

---

## 2. Scope Definition

### In Scope
- Reworked Today Staff page behavior.
- Yesterday earnings helper list.
- Add-to-Today-Staff from helper list.
- Existing dropdown add flow retained as a parallel path.
- Clear everyone from visible Today Staff list.
- Scheduled 2:00 a.m. Bangkok-time clear of the visible Today Staff list.
- Day-off-today planning state and undo.
- Business-day concept for staff earnings and roster planning.
- Data model needed for:
  - All Staff
  - Today Staff
  - daily planning state
  - roster participation/history
  - previous business-day commission totals
- Guardrails preventing receptionist actions from changing historical massage or commission data.

### Out of Scope
- Full New Customer / transaction page redesign, except for dependencies needed to compute staff commission and business-day assignment.
- Payday tracking page redesign.
- Manager staff administration page redesign.
- Final global database rebuild/migration plan for all manager pages.
- Exact tie-breaker beyond yesterday commission; the manager has not confirmed it.
- A two-list UI split for in-shop staff and outside-shop staff.
- Modeling staff residence type in the first version.

### Non-Goals
- Do not make the page a complex scheduling system.
- Do not require the receptionist to understand database concepts.
- Do not expose extra historical columns such as "2 days ago" in the first version.
- Do not make the current local database schema constrain the final product model.

---

## 3. Existing System Impact Analysis

### Existing Components Affected

#### `web-app/staff.html` and `web-app/staff.ejs`
- **Purpose:** Staff-facing page currently used for adding/removing/reordering daily staff.
- **Impact:** Must become the Today Staff page and add the previous-business-day helper list plus day-off-today section.
- **Required Modification:** Add helper-list markup, day-off-today section, stronger added/disabled states, and terminology updates.

#### `web-app/controllers/staff-page-controller.js`
- **Purpose:** Current browser controller for the daily roster.
- **Impact:** Must fetch helper-list data, render earnings rows, handle add/hide/undo states, and keep dropdown in sync.
- **Required Modification:** Add controller state and API calls for previous-day earnings, today planning, and planned day-off marks.

#### `web-app/api.js`
- **Purpose:** Frontend API wrapper.
- **Impact:** Needs helper methods for Today Staff planning APIs.
- **Required Modification:** Add methods for helper list, day-off-today mark/unmark, and scheduled/explicit Today Staff state endpoints.

#### `backend/routes/staff.js`
- **Purpose:** Existing staff roster/status API.
- **Impact:** Current route naming and semantics are too tied to `staff_roster`; should expose Today Staff behavior while preserving or replacing internals as needed.
- **Required Modification:** Add or replace endpoints with All Staff / Today Staff / planning contracts.

#### `backend/routes/transactions.js`
- **Purpose:** Creates massage transaction records and updates staff commission totals.
- **Impact:** Must assign each transaction to the correct Bangkok business day for accurate previous-day earnings.
- **Required Modification:** Add business-day assignment to transaction creation and ensure late-night transactions before 2:00 a.m. belong to the previous business day.

#### `backend/routes/reports.js`
- **Purpose:** Current end-day and summary routes.
- **Impact:** Existing calendar-date summaries conflict with the required business-day model.
- **Required Modification:** Align any staff/day calculations used by this feature with business-day boundaries.

#### `backend/models/database.js`
- **Purpose:** Current schema initialization.
- **Impact:** Current schema is implementation context only; redesign is allowed.
- **Required Modification:** Introduce first-class concepts for All Staff, Today Staff, business day, planning state, and roster participation history.

### Components Explicitly Unaffected
- Authentication/session mechanism, except that receptionist permissions should continue to prevent unauthorized manager/payday actions.
- Service pricing tables, except that transaction creation still uses service commission data.
- Payment method management.
- Manager payday UI design, except future work may consume the same commission/business-day model.

### Regression Risks

#### Risk: Helper list uses calendar date instead of business day
- **Cause:** Existing code uses `new Date().toISOString().split('T')[0]`.
- **Impact:** Late massages between midnight and 2:00 a.m. appear on the wrong day.
- **Mitigation:** Store/derive `business_day` explicitly in the transaction and planning contracts.

#### Risk: Receptionist actions mutate accounting history
- **Cause:** Reusing roster mutation endpoints for accounting history.
- **Impact:** Theft/audit risk and broken commission totals.
- **Mitigation:** Make Today Staff planning changes separate from transaction ledger changes.

#### Risk: Day-off-today state clutters the UI
- **Cause:** Showing all active staff plus added staff plus day-off-today staff without clear grouping.
- **Impact:** Older receptionist may not know what to do.
- **Mitigation:** Main helper list only shows staff still relevant to add; day-off-today section is visible and reversible but secondary.

#### Risk: Current internal names confuse implementation and docs
- **Cause:** Legacy `staff` / `staff_roster` wording.
- **Impact:** Misunderstanding between All Staff and Today Staff.
- **Mitigation:** Standardize product/docs language on All Staff and Today Staff. Internal table names may follow this model in a DB redesign.

---

## 4. Integration Architecture

### Upstream Dependencies
- Receptionist opens the Today Staff page at the beginning of the business day.
- Receptionist may return later, including around 2:00 p.m. when outside staff arrive.
- New Customer transaction flow creates massage records with staff commission.
- Scheduled 2:00 a.m. Bangkok-time system boundary resets visible Today Staff.

### Downstream Dependencies
- Today Staff page consumes All Staff and previous-business-day commission data.
- New Customer page depends on Today Staff for staff selection/queue status.
- Payday tracking and manager reports later consume commission records and business-day history.

### Contracts

#### Contract: All Staff
Represents everyone who can work at the shop.

Expected fields:
- `id`
- `display_name`
- `active`
- optional future fields such as hire date, notes, and payroll totals

#### Contract: Today Staff
Represents staff currently working today and their visible queue order.

Expected fields:
- `business_day`
- `staff_id`
- `display_name`
- `position`
- `queue_status`
- `added_at`
- `removed_at` if removed from visible queue

#### Contract: Today Staff Planning
Represents operational planning state for the current business day.

Expected fields:
- `business_day`
- `staff_id`
- `planning_status`: `available_to_add`, `added_to_today_staff`, `day_off_today`
- `updated_at`
- `updated_by_user_id` if available

#### Contract: Yesterday Earnings Helper Row
Represents one row in the helper list.

Expected fields:
- `staff_id`
- `display_name`
- `previous_business_day`
- `previous_day_commission`
- `was_day_off_yesterday`
- `today_planning_status`
- `can_add_to_today_staff`

Display rules:
- Sort by `previous_day_commission` ascending.
- Ties use stable fallback ordering by All Staff display order or name.
- If `previous_day_commission` is `0`, show `หยุดเมื่อวาน`.
- Do not show date ranges/times in the helper UI.
- Heading/copy for yesterday earnings is Thai-only.

#### Contract: Transaction Ledger
Transactions must remain auditable. Reception-created massage records must not be silently overwritten or deleted. Mistakes/corrections are handled by the existing correction/mistake workflow or future explicit correction records, not by Today Staff planning changes.

---

## 5. Functional Requirements

### FR-001: Show Previous Business-Day Earnings

#### Description
The Today Staff page must show a Thai-only helper list of all active All Staff sorted by previous business-day commission earned, lowest first.

#### Trigger
Receptionist opens or refreshes Today Staff page.

#### Processing Logic
1. Determine current Bangkok business day.
2. Determine previous business day.
3. Fetch all active All Staff.
4. Sum commission earned by each staff member during the previous business day.
5. Staff with no previous-business-day transactions receive `0`.
6. Sort ascending by commission.
7. For equal commission, use stable fallback order by display name or All Staff order.

#### Outputs
- Helper list rows with staff name, commission amount, and optional `หยุดเมื่อวาน`.

#### Failure Modes
- If earnings API fails, show a clear error state and keep existing dropdown usable if possible.

#### Edge Cases
- Staff with zero earnings appear at top.
- Late transactions before 2:00 a.m. count toward the previous business day.
- No extra tiebreaker display in first version.

### FR-002: Add Staff from Helper List

#### Description
Each eligible helper row must allow adding that staff member to Today Staff.

#### Trigger
Receptionist clicks the row's add button.

#### Processing Logic
1. If staff is not already in Today Staff, add them at the next available position.
2. Mark planning status as `added_to_today_staff`.
3. If staff was previously `day_off_today`, clear that status.
4. Refresh Today Staff list and helper list state.

#### Outputs
- Staff appears in Today Staff.
- Helper row becomes strongly visually inactive or is removed/collapsed according to final UI implementation.

#### Failure Modes
- Duplicate add attempts are ignored or return a clear non-fatal message.

#### Edge Cases
- Staff added from dropdown must follow the same status update path.

### FR-003: Preserve Dropdown Add Path

#### Description
Receptionist must still be able to add staff from the dropdown.

#### Trigger
Receptionist selects a staff member from dropdown and clicks add.

#### Processing Logic
Same as FR-002.

#### Outputs
- Staff appears in Today Staff.
- If staff had been marked `หยุดวันนี้`, the mark is automatically removed.

#### Failure Modes
- If staff is already in Today Staff, prevent duplicate add.

#### Edge Cases
- Dropdown may include staff marked `หยุดวันนี้` so they remain easy to recover if they arrive later.

### FR-004: Mark Day Off Today

#### Description
Receptionist can mark a staff member as `หยุดวันนี้` to reduce clutter in the helper list when they know that person is not coming today.

#### Trigger
Receptionist clicks `หยุดวันนี้`.

#### Processing Logic
1. Set planning status to `day_off_today`.
2. Remove/collapse the staff member from the main helper add list.
3. Show the staff member in a visible `หยุดวันนี้` section.
4. Do not affect All Staff, payroll, transactions, or prior-day earnings.

#### Outputs
- Staff appears in the day-off-today section.
- Staff remains available in dropdown.

#### Failure Modes
- If save fails, leave them in the helper list and show error.

#### Edge Cases
- No confirmation modal is required.
- Undo must be obvious and persistent, not a temporary toast.

### FR-005: Undo Day Off Today

#### Description
Receptionist can easily undo `หยุดวันนี้`.

#### Trigger
Receptionist clicks a large restore button in the day-off-today section.

#### Processing Logic
1. Set planning status back to `available_to_add`.
2. Move staff back into the main helper list using the same earnings sort.

#### Outputs
- Staff becomes available in helper list again.

#### Failure Modes
- If save fails, keep the staff member in day-off-today section and show error.

#### Edge Cases
- If staff is added from dropdown while marked day off, undo happens automatically as part of add.

### FR-006: Clear Everyone from Visible Today Staff

#### Description
Receptionist can clear the visible Today Staff list when the list was built incorrectly.

#### Trigger
Receptionist clicks `Clear everyone from list` and confirms in the modal.

#### Processing Logic
1. Clear visible Today Staff queue.
2. Do not define an official business-day close boundary.
3. Do not delete All Staff.
4. Do not mutate transaction records or commission totals.

#### Outputs
- Today Staff list becomes empty.
- Helper/dropdown can be used again.

#### Failure Modes
- If clear fails, keep current Today Staff visible and show error.

#### Edge Cases
- This is a UI reset, not an accounting close.

### FR-007: Scheduled 2:00 a.m. Clear

#### Description
System clears visible Today Staff at 2:00 a.m. Bangkok time.

#### Trigger
Scheduled server job or first safe server-side check after 2:00 a.m.

#### Processing Logic
1. Close/reset the current visible Today Staff list.
2. Preserve roster participation/planning history needed to know who worked and who had the day off.
3. Prepare the next business day's empty Today Staff list.

#### Outputs
- Morning receptionist sees empty Today Staff.
- Previous business-day helper list remains computable.

#### Failure Modes
- If scheduled clear fails, page load should detect stale Today Staff and recover or clearly warn.

#### Edge Cases
- Late transactions before 2:00 a.m. belong to the previous business day.

### FR-008: Protect Transaction and Commission Audit Trail

#### Description
Today Staff planning and queue actions must not allow receptionist to erase or rewrite massage history, commission earned, or payment records.

#### Trigger
Any Today Staff add/remove/reorder/day-off action.

#### Processing Logic
1. Limit mutation to Today Staff and planning state.
2. Do not update transaction ledger except through New Customer / correction workflows.
3. Do not update staff commission totals except through transaction/payment workflows.

#### Outputs
- Operational roster changes are audit-safe.

#### Failure Modes
- Unauthorized attempts to mutate protected accounting data are rejected.

#### Edge Cases
- Removing someone from Today Staff after they completed massages must not remove those massages.

### FR-009: Show Current Business-Day Massage Count on Today Staff Rows

#### Description
The Today Staff list must show how many completed massages each visible staff member has had during the current Bangkok business day. This count is used while reordering the visible queue, especially after a customer requests a specific masseuse or after later-arriving staff are added.

#### Trigger
Receptionist opens or refreshes the Today Staff page, adds a staff member, reorders the list, or returns to the page after completed massage transactions have been entered.

#### Processing Logic
1. Determine the current Bangkok business day using the same business-day contract as Today Staff and helper earnings.
2. For each active Today Staff row, count completed `ACTIVE` transaction ledger rows whose `transactions.business_day` equals the row's business day and whose `transactions.masseuse_name` equals the staff display name.
3. Return the count as `today_massages` with the Today Staff row state.
4. Render the count in the main Today Staff list as a scannable Thai count (`N ครั้ง`) next to the row order controls.
5. Do not write or adjust transaction rows, commission totals, payday totals, or Today Staff positions while calculating or displaying this count.

#### Outputs
- Each visible Today Staff row includes `today_massages`.
- The row renders a Thai massage-count label/value that is visible in the main list.

#### Failure Modes
- If the roster/state read fails, preserve the existing Today Staff error/fallback behavior and do not show stale fabricated counts.

#### Edge Cases
- Staff with no completed massages in the current business day show `0 ครั้ง`.
- Requested bookings affect fairness only through completed transaction records in this version; future reservation-credit behavior belongs to the booking/requested-staff workflow.
- Late transactions before 2:00 a.m. count toward the previous business day under the shared business-day contract.

---

## 6. Data Model Changes

### Entity: All Staff

#### Ownership
Manager/admin staff management owns permanent All Staff records.

#### Fields
- `id`
- `display_name`
- `active`
- payroll/accounting fields as needed by manager/payday pages

#### Constraints
- Active staff appear in helper list.
- Names should be unique or otherwise disambiguated in UI.

#### Relationships
- One All Staff member can appear in many business-day planning records.
- One All Staff member can have many transactions.

#### Lifecycle
Created/edited/deactivated by manager/admin flows.

#### Migration Requirements
Current `staff` data can be discarded/rebuilt if needed; user confirmed current DB data does not need preservation.

#### Indexing Considerations
- Index active/display name for helper list and dropdown.

### Entity: Business Day

#### Ownership
System-owned operational calendar.

#### Fields
- `business_day` date key, e.g. `2026-07-09`
- `starts_at` Bangkok timestamp, normally 10:00 a.m.
- `scheduled_reset_at` Bangkok timestamp, normally next calendar day 2:00 a.m.
- `closed_at` timestamp if closed/reset
- `status`: `open`, `closed`

#### Constraints
- One active/current business day at a time per location in first version.

#### Relationships
- Transactions, Today Staff records, planning records, and summaries reference a business day.

#### Lifecycle
Created/opened by system at start of day or first access; closed by scheduled 2:00 a.m. reset.

#### Migration Requirements
Existing calendar-date `date` usage should not remain the source of business-day reporting.

#### Indexing Considerations
- Index `business_day`.

### Entity: Today Staff

#### Ownership
Receptionist owns operational order/status for current business day.

#### Fields
- `business_day`
- `staff_id`
- `position`
- `queue_status`
- `added_at`
- `removed_at`
- `removed_reason` optional

#### Constraints
- A staff member cannot be active twice in the same Today Staff list.
- Position must be unique among active Today Staff rows for a business day.

#### Relationships
- References All Staff.
- References Business Day.

#### Lifecycle
Added/reordered/removed during the day; visible list clears at scheduled reset.

#### Migration Requirements
Can replace or wrap current `staff_roster`.

#### Indexing Considerations
- Composite index on `(business_day, position)`.
- Composite index on `(business_day, staff_id)`.

### Entity: Today Staff Planning

#### Ownership
Receptionist owns current business-day planning state.

#### Fields
- `business_day`
- `staff_id`
- `planning_status`
- `updated_at`
- `updated_by_user_id` optional

#### Constraints
- `planning_status` allowed values:
  - `available_to_add`
  - `added_to_today_staff`
  - `day_off_today`

#### Relationships
- References Business Day and All Staff.

#### Lifecycle
Generated/updated during business day; retained as daily history if useful.

#### Migration Requirements
New table/model recommended.

#### Indexing Considerations
- Composite index on `(business_day, planning_status)`.
- Unique `(business_day, staff_id)`.

### Entity: Transaction Ledger

#### Ownership
New Customer transaction workflow owns creation; correction workflow owns mistakes/adjustments.

#### Fields Relevant to This Feature
- `transaction_id`
- `business_day`
- `staff_id` or stable staff reference
- `commission_amount`
- `payment_amount`
- `status`
- correction/mistake linkage
- timestamp

#### Constraints
- Transactions are append/audit-oriented.
- Receptionist roster actions cannot delete or rewrite transactions.

#### Relationships
- References Business Day.
- References All Staff.

#### Lifecycle
Created by customer transaction flow; corrected by explicit correction/mistake workflow.

#### Migration Requirements
Current records do not need preservation, but new model should avoid UTC calendar date as business truth.

#### Indexing Considerations
- Composite index on `(business_day, staff_id, status)`.

---

## 7. State Transitions

### Today Staff Planning State

#### States
- `available_to_add`
- `added_to_today_staff`
- `day_off_today`

#### Valid Transitions
- `available_to_add` -> `added_to_today_staff`
- `available_to_add` -> `day_off_today`
- `day_off_today` -> `available_to_add`
- `day_off_today` -> `added_to_today_staff`
- `added_to_today_staff` -> `available_to_add` if removed from Today Staff before any other status dependency

#### Invalid Transitions
- Any transition that deletes transactions or commission records.
- Any transition that deactivates All Staff.

#### Recovery Behavior
- If API save fails, UI must remain in the last confirmed state.
- If page reloads, backend planning state is authoritative.

### Business Day State

#### States
- `open`
- `closed`

#### Valid Transitions
- `open` -> `closed` at 2:00 a.m. scheduled reset.
- `closed` -> next day's `open` business day on first access/startup.

#### Invalid Transitions
- Manual visible-list clear does not close business day.

#### Recovery Behavior
- If scheduled job fails, first later server request should be able to detect stale open business day and close/reset safely.

---

## 8. Operational Considerations

### Logging
- Log scheduled 2:00 a.m. clear success/failure.
- Log Today Staff add/remove/reorder/day-off actions with user and timestamp if auth identity is available.
- Log transaction corrections/mistakes separately from roster planning.

### Metrics
- Count Today Staff additions per business day.
- Count day-off-today marks and undo actions.
- Count scheduled reset failures.

### Monitoring
- Alert or surface admin-visible warning if a business day remains open past expected reset time.

### Alerting
- No external alerting required in first version, but server logs must be sufficient for diagnosis.

### Performance Considerations
- Staff list is small; simple indexed queries are sufficient.
- Helper list should be one bounded query over All Staff and previous business-day transactions.

### Security Considerations
- Receptionist can mutate Today Staff planning and create transactions.
- Receptionist cannot directly edit commission totals, staff payday balances, or historical transaction records.
- Manager/admin pages own staff management and payday actions.

### Permission Changes
- Receptionist role needs access to Today Staff helper/planning endpoints.
- Manager role retains all receptionist permissions plus staff/payday management.

---

## 9. Rollout Plan

### Deployment Strategy
Implement after turning this spec into an implementation plan. The UI can be built against a new API contract while preserving existing route compatibility only if needed.

### Migration Strategy
User confirmed current database data does not need preservation. A clean schema rebuild is acceptable if it makes the app better and simpler.

### Feature Flag Strategy
Not required for local/small-shop deployment unless production rollout demands side-by-side comparison.

### Rollback Conditions
- Today Staff page cannot add staff.
- New Customer page cannot create transactions.
- Commission totals are wrong.
- Scheduled clear deletes accounting data.

### Backward Compatibility Requirements
No hard backward-compatibility requirement for existing DB data. Preserve operational ability to run the POS after deployment.

---

## 10. Testing Requirements

### Unit Tests
- Business-day calculation:
  - 1:00 a.m. July 10 maps to July 9 business day.
  - 10:00 a.m. July 10 maps to July 10 business day.
- Helper list sorting by commission ascending.
- Zero commission produces day-off-yesterday flag.
- Tie fallback is stable.
- Day-off-today planning transitions.

### Integration Tests
- Helper list returns all active All Staff with previous business-day commission.
- Add from helper list creates Today Staff entry and marks planning as added.
- Add from dropdown clears day-off-today planning state.
- Day-off-today survives page refresh/backend round trip.
- Scheduled reset clears visible Today Staff while preserving history needed for next-day helper.

### End-to-End Tests
- Receptionist morning flow:
  1. Open Today Staff page.
  2. See yesterday earnings helper list.
  3. Add staff from helper list.
  4. Mark another staff as `หยุดวันนี้`.
  5. Undo `หยุดวันนี้`.
  6. Reorder Today Staff.
- 2:00 p.m. outside-staff flow:
  1. Later in day, find staff in dropdown or day-off-today section.
  2. Add them to Today Staff.
  3. Confirm they are not duplicated.

### Failure Tests
- API helper-list failure shows usable error.
- Duplicate add prevented.
- Day-off-today save failure does not falsely hide staff.
- Scheduled reset failure is recoverable.

### Regression Tests
- Clear everyone modal still clears visible Today Staff only.
- Transaction correction/mistake workflow remains audit-oriented.
- Receptionist roster actions do not change transaction commission totals.

---

## 11. Risks and Assumptions

### Assumptions

#### Documented
- Current local docs/code separate permanent staff data from daily roster state, but current naming is confusing.
- Current transaction logic already has correction/mistake-style behavior.

#### User Confirmed
- Current app/database are not source of truth for desired product behavior.
- Current DB data can be discarded if a clean redesign is better.
- Business day starts at 10:00 a.m. Bangkok time.
- 2:00 a.m. Bangkok time is the scheduled reset boundary.
- Late massages before 2:00 a.m. belong to the previous business day.
- Yesterday earnings use staff commission earned.
- All active staff should appear in the helper list before planning filters.
- Zero commission means day off yesterday and should show `หยุดเมื่อวาน`.
- Helper section should use Thai only for yesterday earnings.
- No date/time range display in helper heading.
- No "2 days ago" tie-break display in first version.
- `หยุดวันนี้` requires no modal, but must have obvious undo.
- Day-off-today state should be stored backend-side so it survives refresh/devices.
- Receptionist must not be able to manipulate massage/commission history through roster mechanics.

#### Inferred
- A clean first-class business-day field will reduce bugs versus deriving business day from timestamps everywhere.
- A separate planning model is clearer than overloading Today Staff queue rows.
- User-facing labels should be standardized before or alongside internal renames.

### Risks

#### Risk: Scope expansion into full database redesign
- **Cause:** The user permits DB redesign from first principles.
- **Impact:** Staff page spec could balloon into whole-app architecture.
- **Mitigation:** This spec limits itself to Today Staff and direct dependencies only.

#### Risk: Existing manager/payday pages depend on old names/schema
- **Cause:** Current pages may consume current `staff`/`staff_roster` structures.
- **Impact:** Future implementation could break manager pages.
- **Mitigation:** Treat manager pages as later redesign work; document contracts before implementation.

#### Risk: Day-off-today section still clutters page
- **Cause:** Multiple absent staff may create a secondary list.
- **Impact:** Receptionist confusion.
- **Mitigation:** Keep day-off-today visible but compact, with clear restore action.

#### Risk: Actual tie-breaker remains unknown
- **Cause:** Manager mentioned another rule but it was not remembered.
- **Impact:** Helper order for tied commission may not match shop practice.
- **Mitigation:** Use stable fallback only and avoid presenting it as business logic.

### Open Questions
- Exact Thai wording for the helper heading should be verified with manager if possible.
- Exact final visual placement of helper list and day-off-today section should be validated in browser against mobile/tablet viewport.
- Exact backend scheduling mechanism for 2:00 a.m. reset should be selected during implementation planning.
- Whether future manager pages should expose in-shop/outside-shop staff classification remains unresolved and out of first-version scope.

---

## 12. Acceptance Criteria

- AC-001: Today Staff page displays a Thai-only previous-business-day earnings helper list.
- AC-002: Helper list includes every active All Staff member unless filtered by current-day planning state.
- AC-003: Helper rows are sorted by previous business-day commission ascending.
- AC-004: Staff with zero previous-business-day commission show `฿0` and `หยุดเมื่อวาน`.
- AC-005: Helper heading does not show date/time ranges.
- AC-006: A staff member can be added to Today Staff from the helper list.
- AC-007: A staff member can be added to Today Staff from the dropdown.
- AC-008: Adding a staff member from dropdown while marked `หยุดวันนี้` removes the day-off-today mark.
- AC-009: Added staff cannot be added twice.
- AC-010: Added staff receive a strong visual state change if still visible in the helper area.
- AC-011: `หยุดวันนี้` moves a staff member out of the main helper list into a visible day-off-today section.
- AC-012: Day-off-today section has an obvious restore action.
- AC-013: Day-off-today state survives page refresh.
- AC-014: Clear everyone confirmation clears visible Today Staff only.
- AC-015: Manual clear does not close the business day.
- AC-016: Scheduled 2:00 a.m. Bangkok-time reset clears visible Today Staff.
- AC-017: Late transaction before 2:00 a.m. is assigned to the previous business day.
- AC-018: Yesterday earnings are computed from commission earned, not customer payment amount.
- AC-019: Receptionist roster/planning actions do not mutate transaction ledger rows.
- AC-020: Receptionist roster/planning actions do not mutate staff payday totals.
- AC-021: Tests prove the business-day boundary, helper sorting, zero/day-off display, add flow, day-off-today flow, and scheduled clear behavior.
- AC-022: Today Staff rows show each visible staff member's completed current-business-day massage count as Thai `นวดวันนี้` / `N ครั้ง` copy.
