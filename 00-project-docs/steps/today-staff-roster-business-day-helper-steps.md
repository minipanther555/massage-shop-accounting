# Today Staff Business-Day Helper and Planning Workflow — Execution Steps

## Goal
Implement the reworked Today Staff page so a receptionist can build today's working queue from a Thai-only previous-business-day earnings helper list, mark and undo `หยุดวันนี้`, add staff from either the helper list or dropdown, and rely on a 2:00 a.m. Bangkok-time visible-list reset. Spec: `00-project-docs/feature-specifications/today-staff-roster-business-day-helper.md`.
The current app/database are implementation context only; the spec's user-confirmed workflow is the product source of truth.

> **Status:** COMPLETE — all original Today Staff business-day helper phases are complete, local demo data preparation is complete, helper-list collapse is complete, and the Today Staff current-business-day massage count follow-up is complete. Remaining items are open questions only, not active implementation steps.

## Dependencies
- **Today Staff UI (existing but incomplete):** `web-app/staff.html`, `web-app/staff.ejs`, and `web-app/controllers/staff-page-controller.js` already support basic visible roster add/remove/reorder and the clear-everyone modal, but do not yet implement previous-business-day helper rows or day-off-today planning.
- **Frontend API wrapper (existing):** `web-app/api.js` wraps backend calls and must receive new Today Staff helper/planning methods.
- **Backend staff routes (existing but legacy terminology):** `backend/routes/staff.js` currently exposes roster-style endpoints and can be replaced/wrapped with All Staff / Today Staff / planning contracts.
- **Transaction ledger (existing but calendar-date based):** `backend/routes/transactions.js` creates massage records and updates commission totals, but existing calendar-date assignment is not sufficient for Bangkok business-day accounting.
- **Schema initialization (existing but redesign allowed):** `backend/models/database.js` creates current tables; current DB data does not need preservation if a clean redesign is simpler.
- Invariant: Receptionist Today Staff actions must not mutate transaction ledger rows, commission amounts, or staff payday totals.
- Invariant: Manual clear of visible Today Staff is a UI reset only and must not close the business day.
- Invariant: Previous-day earnings are staff commission earned, not customer payment amount.

---

## Verified source status (read the code, 2026-07-09 CFEP)
- `backend/models/database.js` currently separates permanent staff-like data from current roster-like data, but the table names are legacy (`staff`, `staff_roster`) and not user-facing source of truth.
- `backend/routes/transactions.js` currently creates transaction rows and increments `staff.total_fees_earned` from service `masseuse_fee`.
- `backend/routes/transactions.js` currently uses `new Date().toISOString().split('T')[0]` for `date`, which is UTC calendar-date behavior and conflicts with the required Bangkok business-day model.
- `backend/routes/staff.js` currently computes today's massage count from `transactions.date`, which must not remain the source of truth for this feature.
- `web-app/staff.html` and `web-app/staff.ejs` currently expose the basic select/add Today Staff flow and clear-everyone confirmation modal, but not the helper list, day-off-today section, or backend-persisted planning state.
- 🔴 Required precondition before UI helper work: a business-day contract must exist so helper rows, transaction earnings, and scheduled reset all agree on the same day boundary.

---

## Phase 1 — Business-Day and Core Data Contracts — COMPLETE
**Phase goal:** The backend has durable contracts for All Staff, Business Day, Today Staff, Today Staff Planning, and transaction business-day assignment, with tests proving the Bangkok day boundary.

### STEP_ID: TS-DATA-001 — Define business-day calculation contract — COMPLETE
- [x] Add a backend business-day utility contract for Bangkok time with default open at 10:00 a.m. and scheduled reset at 2:00 a.m. next calendar day.
- [x] Ensure the utility can return current business day and previous business day without relying on UTC calendar date.
- [x] Document the utility contract in the co-located module documentation.
- **Validation:** Unit tests prove 1:00 a.m. July 10 maps to July 9 business day and 10:00 a.m. July 10 maps to July 10 business day (AC-017, AC-021; FR-001, FR-007).

### STEP_ID: TS-DATA-002 — Introduce All Staff, Business Day, Today Staff, and Planning schema — COMPLETE
- [x] Add schema initialization for All Staff, Business Day, Today Staff, and Today Staff Planning according to spec §6.
- [x] Include uniqueness constraints preventing duplicate active Today Staff rows for the same business day and staff member.
- [x] Include indexes for helper-list and planning queries: business day, staff id, position, planning status, and transaction lookup.
- [x] Update `backend/models/database.md` to describe the new product concepts and explicitly note that legacy local DB data does not constrain the redesign.
- **Validation:** Integration/schema test can initialize a clean DB and verify required tables, constraints, and indexes exist (AC-002, AC-009, AC-013, AC-021; spec §6).

### STEP_ID: TS-DATA-003 — Assign business_day to transaction ledger writes — COMPLETE
- [x] Update the transaction creation contract so each new massage record stores the correct Bangkok `business_day`.
- [x] Preserve audit-oriented correction/mistake behavior while ensuring corrected records also reference a business day.
- [x] Ensure transaction writes continue to use commission amount for staff earnings and do not depend on visible Today Staff planning state.
- [x] Update transaction route documentation for the business-day field and audit invariant.
- **Validation:** Integration test creates transactions at simulated 1:00 a.m. and 10:00 a.m. Bangkok-time boundaries and verifies `business_day` assignment plus commission amount storage (AC-017, AC-018, AC-019, AC-021; FR-008).

**Phase 1 complete when:** Business-day utility tests pass, clean schema initialization contains the required contracts, and transaction creation persists correct `business_day` without weakening correction/audit behavior. **This gate authorizes Phase 2.**

---

## Phase 2 — Today Staff Backend Write Contracts — COMPLETE
**Phase goal:** Backend write endpoints can add/remove/reorder Today Staff and mark/undo day-off-today planning without touching transaction or payroll history.

### STEP_ID: TS-WRITE-001 — Implement add-to-Today-Staff write contract — COMPLETE
- [x] Add or replace backend endpoint for adding an All Staff member to Today Staff at the next available position for the current business day.
- [x] Set planning status to `added_to_today_staff` when added.
- [x] Clear `day_off_today` automatically if the staff member was previously marked day off today.
- [x] Prevent duplicate active Today Staff entries for the same business day and staff member.
- **Validation:** Integration test adds from the contract twice and verifies one active Today Staff row, `added_to_today_staff` planning status, and no transaction/payroll rows changed (AC-006, AC-008, AC-009, AC-019, AC-020; FR-002, FR-003, FR-008).

### STEP_ID: TS-WRITE-002 — Implement Today Staff remove/reorder write contracts — COMPLETE
- [x] Add or replace backend endpoint for removing staff from the visible Today Staff list without deleting roster participation history.
- [x] Add or preserve reorder endpoint behavior for active Today Staff positions.
- [x] Ensure removing or reordering Today Staff does not update transaction ledger rows, commission totals, or payday totals.
- [x] Preserve enough participation/history data to know who worked during the business day.
- **Validation:** Integration test removes and reorders Today Staff after a seeded transaction and verifies transaction rows and commission totals remain unchanged while visible order updates correctly (AC-019, AC-020, AC-021; FR-008).

### STEP_ID: TS-WRITE-003 — Implement day-off-today and undo write contracts — COMPLETE
- [x] Add endpoint to mark an All Staff member as `day_off_today` for the current business day.
- [x] Add endpoint to restore that staff member to `available_to_add`.
- [x] Ensure day-off-today state is backend-persisted and survives page refresh.
- [x] Ensure day-off-today does not deactivate All Staff and does not alter transactions, commission totals, payroll, or previous-day earnings.
- **Validation:** Integration test marks day off today, reloads planning state, restores the staff member, and verifies no All Staff, ledger, commission, or payday data changed (AC-011, AC-012, AC-013, AC-019, AC-020; FR-004, FR-005, FR-008).

### STEP_ID: TS-WRITE-004 — Preserve clear-everyone as visible-list reset only — COMPLETE
- [x] Align the clear-everyone backend contract with the spec: clear visible Today Staff only.
- [x] Ensure manual clear does not close the business day and does not delete All Staff, transaction, commission, payday, or previous-day helper data.
- [x] Preserve planning/history data needed for audit and helper behavior where applicable.
- **Validation:** Integration test clears Today Staff and verifies current business day remains open while transaction and payroll tables are unchanged (AC-014, AC-015, AC-019, AC-020; FR-006, FR-008).

**Phase 2 complete when:** Add/remove/reorder/day-off/undo/clear write endpoints are implemented, persisted, idempotent where required, and integration tests prove they do not mutate protected accounting history. **This gate authorizes Phase 3.**

---

## Phase 3 — Read APIs and Helper Data — COMPLETE
**Phase goal:** The frontend can fetch all data needed to render the Today Staff helper list, dropdown, visible Today Staff, and day-off-today section from backend source of truth.

### STEP_ID: TS-READ-001 — Implement previous-business-day helper list endpoint — COMPLETE
- [x] Add endpoint returning every active All Staff member with previous business-day commission, day-off-yesterday flag, current planning status, and add eligibility.
- [x] Sort rows by previous business-day commission ascending.
- [x] Use stable fallback ordering by display name or All Staff order for ties.
- [x] Do not include date/time range display text in the response contract for the UI.
- **Validation:** Integration test seeds three staff with commission values including zero and verifies helper rows are all present, sorted lowest first, zero row has day-off-yesterday flag, and ties are stable (AC-001, AC-002, AC-003, AC-004, AC-005, AC-018, AC-021; FR-001).

### STEP_ID: TS-READ-002 — Implement current Today Staff and planning read endpoint — COMPLETE
- [x] Add endpoint returning active Today Staff rows for current business day in position order.
- [x] Include current planning state sufficient for UI to render added/inactive rows and day-off-today section.
- [x] Ensure dropdown source remains able to include staff marked `day_off_today`.
- **Validation:** Integration test seeds Today Staff and day-off-today planning, then verifies active Today Staff order, day-off-today state, and dropdown-eligible staff data are all returned correctly (AC-007, AC-010, AC-011, AC-013; FR-002, FR-003, FR-004).

### STEP_ID: TS-READ-003 — Add failure-safe read behavior for helper data — COMPLETE
- [x] Define backend error responses for helper-list and planning read failures.
- [x] Ensure frontend API wrapper can distinguish helper-list failure from basic dropdown failure.
- [x] Preserve existing add dropdown as a usable fallback if helper data fails but All Staff data remains available.
- **Validation:** Integration or controller test simulates helper-list API failure and verifies a clear error state can render without disabling the dropdown add path (AC-007, AC-021; FR-001 failure mode).

**Phase 3 complete when:** Read APIs return complete helper/planning/Today Staff state, sorted and flagged by business-day commission, with tested fallback behavior for helper-list failure. **This gate authorizes Phase 4.**

---

## Phase 4 — Today Staff Page UI and Controller — COMPLETE
**Phase goal:** The staff-facing page presents a simple Thai-first workflow where an older receptionist can use yesterday earnings, add Today Staff, mark/undo day-off-today, and still use the dropdown path.

### STEP_ID: TS-UI-001 — Standardize All Staff / Today Staff user-facing terminology — COMPLETE
- [x] Update `web-app/staff.html`, `web-app/staff.ejs`, controller copy, and co-located docs to use All Staff / Today Staff concepts instead of ambiguous staff roster language where user-facing.
- [x] Keep Thai-first or Thai-only copy according to the spec.
- [x] Ensure existing navigation/tests are updated to the new terminology.
- **Validation:** Focused text/DOM tests verify Today Staff language appears and legacy ambiguous roster copy is not used in staff-facing primary controls (spec success criteria; AC-001).

### STEP_ID: TS-UI-002 — Render Thai-only previous-business-day earnings helper list — COMPLETE
- [x] Add helper-list markup above or near the add controls without pushing the primary add path below the first usable viewport on target mobile/tablet widths.
- [x] Render staff name, previous-business-day commission, and `หยุดเมื่อวาน` for zero commission rows.
- [x] Do not render date/time ranges or English helper copy in the yesterday earnings section.
- [x] Render rows in backend-provided lowest-first order.
- **Validation:** Browser/component test verifies Thai-only heading, no date/time range text, sorted rows, zero row with `฿0` and `หยุดเมื่อวาน`, and add controls remain visible without excessive scrolling on mobile/tablet viewport (AC-001, AC-003, AC-004, AC-005; FR-001).

### STEP_ID: TS-UI-003 — Add staff from helper list with strong visual feedback — COMPLETE
- [x] Add a per-row add control for eligible helper rows.
- [x] Wire helper add to the same backend add contract as dropdown add.
- [x] After add, prevent duplicate add and apply a strong inactive/added visual state if the row remains visible.
- [x] Refresh Today Staff and helper state after add.
- **Validation:** E2E test clicks helper add, verifies staff appears in Today Staff, helper row is disabled/muted or removed/collapsed, duplicate add is unavailable, and protected transaction/payday values are not changed by the UI action (AC-006, AC-009, AC-010, AC-019, AC-020; FR-002, FR-008).

### STEP_ID: TS-UI-004 — Preserve dropdown add path and day-off recovery — COMPLETE
- [x] Keep the existing dropdown add flow available.
- [x] Ensure dropdown includes staff marked `หยุดวันนี้`.
- [x] When dropdown adds a day-off-today staff member, automatically clear the day-off-today planning state.
- [x] Keep dropdown filtering for already-added staff so they cannot be duplicated.
- **Validation:** E2E test marks a staff member `หยุดวันนี้`, adds them via dropdown, verifies they appear in Today Staff, disappear from day-off-today section, and cannot be added twice (AC-007, AC-008, AC-009, AC-011; FR-003, FR-005).

### STEP_ID: TS-UI-005 — Implement visible day-off-today section and undo — COMPLETE
- [x] Add `หยุดวันนี้` control to helper rows.
- [x] Move day-off-today staff out of the main helper add list into a visible day-off-today section.
- [x] Provide a large restore action that returns staff to the helper list.
- [x] Do not use a modal or temporary-only toast for undo.
- **Validation:** E2E test marks staff `หยุดวันนี้`, verifies the main list declutters, visible day-off-today section contains the staff member, restore returns them to the helper list, and state survives page refresh (AC-011, AC-012, AC-013; FR-004, FR-005).

### STEP_ID: TS-UI-006 — Keep clear-everyone modal aligned with Today Staff semantics — COMPLETE
- [x] Update clear-everyone copy to describe clearing visible Today Staff only.
- [x] Ensure the modal remains a confirmation for the destructive visible-list reset.
- [x] Ensure post-clear UI refreshes helper/dropdown/Today Staff state correctly.
- **Validation:** E2E test confirms clear-everyone modal clears visible Today Staff, does not close business day, and leaves helper/dropdown flows usable (AC-014, AC-015; FR-006).

**Phase 4 complete when:** Browser/E2E tests prove the Today Staff page can perform the morning flow, day-off flow, dropdown recovery flow, and clear-everyone flow with the required Thai-first/Thai-only UI constraints. **This gate authorizes Phase 5.**

---

## Phase 5 — Scheduled Reset, Audit Guardrails, and Operational Visibility — COMPLETE
**Phase goal:** The 2:00 a.m. Bangkok reset and audit protections are implemented in a recoverable, observable way.

### STEP_ID: TS-OPS-001 — Implement 2:00 a.m. Bangkok-time visible Today Staff reset — COMPLETE
- [x] Add scheduled server job or first-safe-server-check behavior for the 2:00 a.m. Bangkok reset.
- [x] Close/reset the visible Today Staff list for the old business day.
- [x] Preserve roster participation and planning history needed to compute who worked and who had the day off.
- [x] Prepare the next business day with empty visible Today Staff.
- **Validation:** Time-controlled integration test verifies scheduled/reset check clears visible Today Staff at 2:00 a.m. Bangkok time, preserves helper-history inputs, and leaves next morning Today Staff empty (AC-016, AC-017, AC-021; FR-007).

### STEP_ID: TS-OPS-002 — Add stale-business-day recovery path — COMPLETE
- [x] Detect when a business day remains open past the expected reset boundary.
- [x] Recover safely on the next relevant server request or show an admin-visible warning according to spec operational considerations.
- [x] Log recovery attempts and failures.
- **Validation:** Integration test simulates missed scheduled reset and verifies first later server-side check either performs safe reset or surfaces a clear warning without deleting accounting data (FR-007 failure mode; spec §8).

### STEP_ID: TS-OPS-003 — Add audit-safe logging for Today Staff planning actions — COMPLETE
- [x] Log add/remove/reorder/day-off/undo actions with business day, staff id, timestamp, and user identity when available.
- [x] Keep transaction correction/mistake logs separate from roster planning logs.
- [x] Ensure logs do not imply planning actions changed commission totals.
- **Validation:** Test or log assertion verifies each Today Staff planning action emits an audit-safe log entry and no transaction/payday mutation occurs (AC-019, AC-020; FR-008; spec §8).

### STEP_ID: TS-OPS-004 — Enforce receptionist permission boundaries for planning endpoints — COMPLETE
- [x] Allow receptionist role to use Today Staff helper/planning endpoints.
- [x] Reject direct receptionist mutation of commission totals, payday balances, or historical transaction records through Today Staff routes.
- [x] Preserve manager/admin ownership of All Staff management and payday actions.
- **Validation:** Authorization tests verify receptionist can add/remove/reorder/mark day off Today Staff but cannot mutate protected accounting/payday endpoints (AC-019, AC-020; FR-008; spec §8 permission changes).

**Phase 5 complete when:** Scheduled reset, missed-reset recovery, planning action logging, and permission boundaries are implemented and tested without weakening transaction/payday audit safety. **This gate authorizes Phase 6.**

---

## Phase 6 — End-to-End Verification and Rollout Readiness — COMPLETE
**Phase goal:** The feature is proven against the spec acceptance criteria and is ready for implementation handoff/deployment planning.

### STEP_ID: TS-VERIFY-001 — Run unit and integration suite for business-day, helper, and planning contracts — COMPLETE
- [x] Run all unit tests for business-day calculation, helper sorting, zero/day-off flagging, tie fallback, and planning transitions.
- [x] Run integration tests for helper endpoint, add from helper, add from dropdown, day-off persistence, scheduled reset, and audit safety.
- [x] Record raw command output in the implementation handoff.
- **Validation:** Required test suite passes and covers AC-001 through AC-021 where machine-checkable at backend/contract level.

### STEP_ID: TS-VERIFY-002 — Run browser E2E morning and 2:00 p.m. flows — COMPLETE
- [x] Verify morning flow: open Today Staff page, view helper list, add from helper, mark day off today, undo, reorder.
- [x] Verify 2:00 p.m. flow: later-day staff can be found in dropdown or day-off-today section, added to Today Staff, and not duplicated.
- [x] Verify old-lady usability constraints: primary controls visible, no date/time clutter, Thai-only yesterday earnings helper section.
- **Validation:** E2E tests pass for morning and later-day flows and produce screenshots or trace evidence for the target mobile/tablet viewport (AC-001, AC-005, AC-006, AC-007, AC-008, AC-011, AC-012, AC-021).

### STEP_ID: TS-VERIFY-003 — Verify protected accounting invariants — COMPLETE
- [x] Seed transactions and staff payday totals.
- [x] Perform Today Staff add/remove/reorder/day-off/undo/clear actions.
- [x] Verify transaction ledger rows, commission amounts, and payday totals are unchanged by roster/planning actions.
- **Validation:** Regression test proves AC-019 and AC-020 across all Today Staff planning actions.

### STEP_ID: TS-VERIFY-004 — Final documentation alignment — COMPLETE
- [x] Update co-located module docs for every changed source file.
- [x] Update project status/phase docs to reference the Today Staff spec and completed implementation status.
- [x] Preserve open questions from this steps file if unresolved.
- **Validation:** `git diff --check` passes and doc references to All Staff / Today Staff, business-day helper behavior, day-off-today state, and audit invariants match the implemented contracts.

**Phase 6 complete when:** All AC-001 through AC-021 are validated by tests or documented verification, implementation docs are aligned, and remaining open questions are explicitly carried forward. **This gate authorizes release/deployment planning.**

---

## Open Decisions
- **D-01 (ratified):** The current app/database are implementation context only; the feature spec and user-confirmed workflow are the product source of truth.
- **D-02 (ratified):** Use All Staff and Today Staff terminology for user-facing concepts.
- **D-03 (ratified):** Previous-day earnings are based on staff commission earned, not customer payment amount.
- **D-04 (ratified):** Business day starts around 10:00 a.m. Bangkok time, and 2:00 a.m. Bangkok time is the scheduled visible-list reset boundary.
- **D-05 (ratified):** Late transactions before 2:00 a.m. belong to the previous business day.
- **D-06 (ratified):** Helper list shows all active All Staff before current-day planning filters, sorted by previous business-day commission ascending.
- **D-07 (ratified):** Staff with zero previous-business-day commission show `฿0` and `หยุดเมื่อวาน`.
- **D-08 (ratified):** Yesterday earnings helper section is Thai-only and does not show date/time ranges.
- **D-09 (ratified):** No "2 days ago" tie-breaker display in first version.
- **D-10 (ratified):** `หยุดวันนี้` requires no modal, but must have obvious persistent undo.
- **D-11 (ratified):** Day-off-today state is backend-persisted so it survives refresh/devices.
- **D-12 (ratified):** Clear everyone is a visible Today Staff reset only; it does not close the business day.
- **D-13 (ratified):** Receptionist Today Staff actions must not mutate transaction ledger rows, commission amounts, or staff payday totals.
- **D-14 (ratified):** Current DB data does not need preservation if a clean redesign is better and simpler.

## Open Questions
- Exact Thai wording for the helper heading should be verified with the manager if possible.
- Exact final visual placement of helper list and day-off-today section must be validated in browser against mobile/tablet viewport.
- Exact backend scheduling mechanism for the 2:00 a.m. reset must be selected during implementation.
- Future manager pages may need in-shop/outside-shop staff classification, but it is unresolved and out of first-version scope.

---

## Completed Operations Follow-Up — Local Demo Data Preparation

### STEP_ID: TS-OPS-DEMO-001 — Reset payday tracking and seed helper demo data — COMPLETE
- [x] Preserve all staff rows in `data/massage_shop.db`.
- [x] Clear `staff_payments`.
- [x] Reset staff payday tracking columns without changing active/inactive staff membership.
- [x] Seed deterministic demo transactions across three business days using marker `TODAY_STAFF_DEMO_SEED_V1`.
- [x] Ensure simulated helper request for the current preview business day shows the previous business day with fake commission values.
- [x] Ensure the visible helper list includes both zero and non-zero previous-day commission rows so ranking can be manually inspected.
- **Validation:** `tests/otdd/today-staff-demo-seed.test.js` passes; live HTTP smoke against `/api/staff/today/helper?PWTEST=1&at=2026-07-10T10:00:00+07:00` returns HTTP `200`; operation notes are documented in `00-project-docs/operations/today-staff-demo-seed.md`.
- **Completion Notes:** Initial seed used `2026-07-10` as the base business day for deterministic test evidence. During browser review on `2026-07-13`, the local DB was reseeded with `--base-business-day 2026-07-13` so the live helper used previous business day `2026-07-12` and showed non-zero fake commissions in the preview.

### STEP_ID: TS-UI-HELPER-COLLAPSE — Collapse helper lists after daily roster setup — ✅ DONE (2026-07-13)
- [x] Add one obvious control near the previous-day earnings helper header to collapse both helper sections together.
- [x] Collapse both the previous-day earnings helper and the `หยุดวันนี้` helper section with that single control.
- [x] Keep the collapsed state reversible with a visible control near the daily roster workflow.
- [x] Preserve the morning-first workflow: helper lists remain visible by default when the user has not collapsed them.
- [x] Keep static `staff.html`, rendered `staff.ejs`, controller behavior, and co-located docs in sync.
- **Validation:** Browser/UI test proves clicking the collapse control hides both helper sections and reveals a show-helper control; clicking the show-helper control restores the helper sections without losing Today Staff roster state.
- **Completion Notes:** `jest __tests__/staff.roster.add-staff.present.test.js --runInBand` passed with helper collapse contract coverage. Playwright smoke against `/api/main/staff-roster?PWTEST=1` verified collapse hides previous-day and `หยุดวันนี้` helpers, shows the restore control, preserves `14` roster rows, and restore shows helpers again.

### STEP_ID: TS-UI-TODAY-MASSAGE-COUNT — Show today's completed massage count in Today Staff rows — ✅ DONE (2026-07-13)
- [x] Ensure the Today Staff read contract returns each active row's completed massage count for the current Bangkok business day using `transactions.business_day`, not UTC calendar date.
- [x] Ensure the main Today Staff row visibly renders the count as Thai `N ครั้ง` copy in the working list used for reordering.
- [x] Keep count display read-only: calculating or rendering counts must not mutate transactions, commissions, payday totals, planning status, or Today Staff order.
- [x] Keep static `staff.html`, rendered `staff.ejs`, controller behavior, tests, and co-located docs in sync.
- **Validation:** Focused tests prove `GET /api/staff/roster` returns current-business-day `today_massages` from completed `ACTIVE` transaction rows and the Today Staff page/controller renders a visible Thai `นวดวันนี้` / `N ครั้ง` count in the main reorderable list without changing protected accounting or planning data (FR-009, FR-008, AC-019, AC-020, AC-021, AC-022).
- **Completion Notes:** `jest __tests__/staff.roster.add-staff.present.test.js --runInBand` passed with Today Staff count header/row-copy coverage. `mocha tests/otdd/today-staff-massage-count.test.js` passed against an ephemeral SQLite DB and real `GET /api/staff/roster`, proving two current-day `ACTIVE` transactions count as `today_massages: 2` while same-day `EDITED` and previous-business-day `ACTIVE` rows are excluded. Browser smoke against `/api/main/staff-roster?PWTEST=1` verified the rendered staff page shows `นวดวันนี้` and `0 ครั้ง` in the roster row. `EXPLAIN QUERY PLAN` verified the count lookup uses `idx_transactions_business_day_staff`.
