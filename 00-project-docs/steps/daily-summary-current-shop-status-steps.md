# Daily Summary Current Shop Status Steps

> **Status:** DAILY SUMMARY STATUS UI IMPLEMENTED AND VERIFIED (2026-07-13); DSS-008 IMPLEMENTED AND VERIFIED (2026-07-14)
> **Feature Specification:** `00-project-docs/feature-specifications/daily-summary-current-shop-status.md`

## DSS-001 - Governed Spec and Step Creation

**Status:** COMPLETED (2026-07-13)

**Goal:** Capture the operator's changed direction: add current shop status into the existing Daily Summary page instead of creating a separate status page.

**Dependencies:** Current Daily Summary page, existing booking BKG-002 deferred status concept, Today Staff queue/counts, booking buffer rule.

**Expected Output/Deliverable:** A feature specification and implementation steps file that make Daily Summary the governed target for current shop status.

**Technical Considerations:** The existing booking steps mention a separate shop-status page; this step supersedes that target for this pass and preserves the underlying status requirements.

**Potential Challenges and Mitigations:** Avoid inventing a new UI beyond the operator's stated need. Keep ambiguous layout choices as open questions until implementation confirmation.

**Validation:** The new spec lists existing Daily Summary behavior to preserve, missing status fields to add, server-authoritative status contract expectations, and acceptance criteria.

## DSS-002 - Backend Current Status Contract

**Status:** ✅ DONE (2026-07-13)

**Goal:** Add a server-authoritative current shop status API that combines Today Staff order, current busy state, busy-until time, daily massage counts, next requested booking, and usable time before the 15-minute booking buffer.

**Dependencies:** `backend/routes/staff.js`, `backend/services/booking-service.js`, booking tables, transaction rows, Today Staff current-business-day helper, `backend/routes/staff.js.md`.

**Expected Output/Deliverable:** A documented `GET /api/staff/current-status` endpoint returning the contract defined in the feature spec.

**Technical Considerations:** Prefer deriving busy state from active transaction time windows and current Bangkok business day. Do not duplicate ledger state. Reuse `BOOKING_BUFFER_MINUTES` and existing booking timestamp helpers.

**Potential Challenges and Mitigations:** Existing `GET /api/staff/roster` returns `busy_until: NULL` from Today Staff projection even though legacy `staff_roster` busy APIs still exist. Mitigate by defining one authoritative status endpoint instead of overloading the roster endpoint.

**Validation:** Add focused backend tests proving busy, available, next, booking-buffer, next-booking, usable-minutes, and today-massage-count cases.

**Completion Notes (2026-07-13):**
- [x] Added documented `GET /api/staff/current-status`.
- [x] Reused `BOOKING_BUFFER_MINUTES` from `backend/services/booking-service.js`.
- [x] Derived busy state from current-business-day `ACTIVE` transaction windows.
- [x] Returned next requested-staff booking, usable minutes before booking buffer, queue state, and daily active massage counts.
- Evidence: `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/mocha tests/otdd/daily-summary-current-status.test.js --reporter dot` passed with 3 tests, covering the API contract, invalid diagnostic timestamp validation, and indexed query-plan guardrail.

## DSS-003 - Frontend API and Shared State Wiring

**Status:** ✅ DONE (2026-07-13)

**Goal:** Expose the current status endpoint through `web-app/api.js` and load it from the Daily Summary refresh path without breaking existing summary, transaction, and expense refreshes.

**Dependencies:** `web-app/api.js`, `web-app/api.js.md`, `web-app/shared.js`, `web-app/shared.js.md`, `web-app/summary.html`, `web-app/summary.ejs`.

**Expected Output/Deliverable:** A small API client method and Daily Summary data-loading path that fetches current shop status on page load and every refresh interval.

**Technical Considerations:** Keep status data separate from `appData.transactions` and `appData.roster` unless a documented shared state addition is needed. Avoid recomputing the backend status model in browser code.

**Potential Challenges and Mitigations:** Daily Summary currently mixes direct local calculations and API summaries. Mitigate by treating current status as a separate payload rendered by one function.

**Validation:** Inline scripts in both summary templates parse, and API client tests or DOM-contract tests verify the new call surface exists.

**Completion Notes (2026-07-13):**
- [x] Added `api.getCurrentShopStatus()`.
- [x] Added `appData.currentShopStatus` and `loadCurrentShopStatus()`.
- [x] Loaded current shop status during the shared Daily Summary data refresh.
- Evidence: `PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest __tests__/daily-summary.current-status.present.test.js --testEnvironment=node --runInBand` passed with 3 tests; inline script parse check passed for `summary.html` and `summary.ejs`.

## DSS-004 - Daily Summary Status UI

**Status:** ✅ DONE (2026-07-13)

**Goal:** Add a Thai-first Current Shop Status section to Daily Summary while preserving the page's existing summary cards, payment breakdown, performance table, transaction list, expense list, and end-day controls.

**Dependencies:** `web-app/summary.html`, `web-app/summary.ejs`, `web-app/styles.css`, `web-app/styles.md`, Daily Summary current UI edits in the dirty worktree.

**Expected Output/Deliverable:** A responsive, scannable section showing each Today Staff row's name, queue position, current state, busy-until/remaining time, massages today, next booking, and usable time before booking buffer.

**Technical Considerations:** Keep `summary.html` and `summary.ejs` mirrored. Use page-scoped CSS to avoid unintended changes to New Customer or Today Staff pages. Preserve IDs and behavior for existing summary sections.

**Potential Challenges and Mitigations:** The operator already updated the Daily Summary visual design in the dirty worktree. Mitigate by reading the current file state immediately before implementation and layering the new section into that design instead of reverting or restyling unrelated elements.

**Validation:** DOM tests confirm the section, row fields, Thai-first labels, and existing summary sections are present.

**Completion Notes (2026-07-13):**
- [x] Added mirrored Thai-first Current Shop Status sections to `summary.html` and `summary.ejs`.
- [x] Rendered busy, next, booking-buffer, detail, and `นวดวันนี้` count fields.
- [x] Added page-scoped `.summary-status-*` styles.
- [x] Escaped server-provided status values before `innerHTML` rendering.
- Evidence: DOM contract tests passed; Playwright browser smoke against `summary.html` rendered 3 status rows with Thai labels.

## DSS-005 - Documentation Synchronization

**Status:** ✅ DONE (2026-07-13)

**Goal:** Update co-located module specs and project roadmap docs after implementation.

**Dependencies:** `web-app/summary.html.md` if created, `web-app/api.js.md`, `web-app/shared.js.md`, `backend/routes/staff.js.md`, `web-app/styles.md`, `00-project-docs/steps/current-phase.md`, `00-project-docs/steps/current-steps.md`, booking spec/steps cross-reference.

**Expected Output/Deliverable:** Docs describe the final Daily Summary status behavior, endpoint contract, dependency mapping, and verification results.

**Technical Considerations:** If `summary.html.md` is still absent at implementation time, create it as the co-located Complete Module Specification for both mirrored summary templates.

**Potential Challenges and Mitigations:** Existing docs have drift and older Daily Summary bugs. Keep updates narrowly tied to this feature and cite the new status contract.

**Validation:** `git diff --check` passes and docs contain no stale claim that BKG-002 requires a separate page for this pass.

**Completion Notes (2026-07-13):**
- [x] Updated `backend/routes/staff.js.md`.
- [x] Updated `web-app/api.js.md`.
- [x] Updated `web-app/shared.js.md`.
- [x] Added `web-app/summary.html.md` for mirrored Daily Summary templates.
- [x] Updated `web-app/styles.md`.
- Evidence: Docs now describe the Daily Summary embedded status surface; `git diff --check` recorded in DSS-006.

## DSS-006 - Verification and Browser Acceptance

**Status:** ✅ DONE (2026-07-13)

**Goal:** Prove the Daily Summary status addition works end to end.

**Dependencies:** Backend status tests, frontend DOM tests, inline script parsing, local server, browser verification.

**Expected Output/Deliverable:** A verification receipt covering backend contract tests, frontend structural tests, syntax checks, whitespace checks, and live Daily Summary browser review.

**Technical Considerations:** Use local or ephemeral test data. Do not touch production. Browser verification should include a narrow/mobile viewport because this is a staff-facing operational page.

**Potential Challenges and Mitigations:** If in-app browser attach fails, record the exact failure and complete static/API verification; do not claim visual acceptance without a screenshot or direct browser result.

**Validation:** Tests pass, browser confirms readable status section, and final notes identify any remaining open question.

**Completion Notes (2026-07-13):**
- [x] Backend OTDD/API and perf guardrail passed.
- [x] Frontend DOM/API contract tests passed.
- [x] Inline scripts parse in both templates.
- [x] Browser smoke rendered 3 status rows in Chromium on local `summary.html`.
- [x] Security checks completed: new renderer now escapes server-provided fields; focused secret/destructive scan found no new credential or destructive-prod pattern; dependency audit reports pre-existing high vulnerabilities with no package changes in this feature.
- [x] `git diff --check` passed.
- Evidence: `mocha tests/otdd/daily-summary-current-status.test.js --reporter dot` passed; `jest __tests__/daily-summary.current-status.present.test.js --testEnvironment=node --runInBand` passed; Playwright smoke printed `browser-smoke-pass rows=3`; inline script parser reported one valid inline script in each summary template; `git diff --check` passed.

## DSS-007 - Compact Drill-Down Daily Summary UI

**Status:** ✅ DONE (2026-07-13)

**Goal:** Make Daily Summary readable for a non-technical receptionist/grandma user by reducing vertical bulk, making the top financial cards compact and clickable, moving matching detail breakdowns under the clicked card, making all visible headings Thai-first, tightening Current Shop Status rows, and fixing the visible `฿NaN` masseuse fee bug.

**Dependencies:** `web-app/summary.html`, `web-app/summary.ejs`, `web-app/styles.css`, `web-app/summary.html.md`, `web-app/styles.md`, `__tests__/daily-summary.current-status.present.test.js`.

**Expected Output/Deliverable:** Compact Thai-first financial summary buttons that expand/collapse their own details; no redundant always-open payment/masseuse breakdown sections; compact status rows; numeric fee totals.

**Technical Considerations:** Keep `summary.html` and `summary.ejs` mirrored. Reuse the existing `payment-breakdown`, `masseuse-performance`, `all-transactions`, and `all-expenses` renderers by moving their containers into card details instead of creating parallel duplicate views. Preserve existing IDs used by scripts/tests.

**Potential Challenges and Mitigations:** The current template uses `innerHTML` renderers and older English-first section headers. Mitigate by keeping scope to the Daily Summary templates, escaping any new dynamic card labels, and adding DOM contract tests for Thai-first drill-down behavior and no `masseuseeFee` typo.

**Validation:** DOM tests prove the four top cards are compact clickable drill-down controls, Thai-first labels are present, lower duplicate payment/performance sections are absent, status rows use compact classes, and fee rendering uses `masseuseFee` so `฿NaN` is not produced.

**Completion Notes (2026-07-13):**
- [x] Converted four top financial cards into compact clickable drill-down controls.
- [x] Added a Thai-first collapsible finance section header (`การเงินวันนี้`) so Current Shop Status can move upward when finances are hidden.
- [x] Moved payment breakdown and transactions under revenue.
- [x] Moved per-masseuse fee breakdown under fees.
- [x] Moved expense rows under expenses.
- [x] Added net-profit formula under profit.
- [x] Removed duplicated always-open payment and masseuse breakdown sections.
- [x] Converted Daily Summary page title and card labels to Thai-first with smaller English helper text.
- [x] Tightened Current Shop Status row spacing while preserving readable staff/state/count text.
- [x] Removed queue-position numbers and `คิวถัดไป` from Daily Summary status rows so the section no longer behaves like Today Staff ordering.
- [x] Updated busy status rows to show booked/start time, massage end time, free-again time after the 15-minute buffer, and remaining minutes.
- [x] Updated the status endpoint to sort by operational state: busy first, booking-constrained rows next, free rows last.
- [x] Added the compact Current Shop Status summary strip for free-now count, next free staff/time, and next three free entries.
- [x] Shortened the finance section header and moved the collapse toggle inline to the right of the title.
- [x] Renamed the staff navigation link to `คิวพนักงานวันนี้ / Today's Staff Queue`.
- [x] Fixed `฿NaN` by reading `transaction.masseuseFee`.
- Evidence: RED `jest __tests__/daily-summary.current-status.present.test.js --testEnvironment=node --runInBand` failed before implementation on missing finance collapse/status timing contract and again on missing status summary/nav/header refinements; GREEN `jest __tests__/daily-summary.current-status.present.test.js --testEnvironment=node --runInBand` passed with 6 tests; GREEN `mocha tests/otdd/daily-summary-current-status.test.js --reporter dot` passed with 3 tests after local listen permission, including invalid diagnostic timestamp validation; inline script parser passed for `summary.html` and `summary.ejs`; code-only scan found no `masseuseeFee`, broken `current-user`, `คิวถัดไป`, rendered position template, or destructive SQL in touched source; `npm audit --audit-level=high` reports 38 pre-existing dependency vulnerabilities with no dependency changes in DSS-007; in-app browser smoke verified 4 compact cards, finance collapse/reopen, 7 status rows, no `undefined`, no `NaN`, no `คิวถัดไป`, no queue-position numbers, busy start/end/free-at text, varied seeded preview massage counts, 41px finance header, inline toggle to the right of title, Today's Staff Queue nav text, and Current Shop Status summary text; `git diff --check` passed.

## DSS-008 - Canonical Busy-End Source for Current Status

**Status:** IMPLEMENTED AND VERIFIED (2026-07-14)

**Goal:** Prevent Current Shop Status from showing a staff member free too early by making the backend derive busy windows from the same canonical start/end timestamps used by the transaction UI and booking buffer logic.

**Dependencies:** `backend/routes/staff.js`, `backend/routes/transactions.js`, `backend/models/database.js`, transaction creation/correction flow, `tests/otdd/daily-summary-current-status.test.js`, BKG-004 if the canonical datetime fields are completed there.

**Expected Output/Deliverable:** Current Shop Status uses persisted or server-derived canonical transaction start/end datetimes, including the shop's 15-minute readiness buffer, instead of assuming `transactions.timestamp + duration` always equals the real service window.

**Technical Considerations:** The existing API currently derives busy windows from the transaction row timestamp plus duration. Browser-side transaction logic can calculate different real-world start/end values after prep/time selection. The server must own the final canonical timing contract so summary status, booking availability, and transaction records cannot drift.

**Potential Challenges and Mitigations:** If additive datetime columns are needed, handle them through the governed DB/code path and keep existing transactions backward-compatible with a documented fallback.

**Validation:** Backend status tests prove a transaction with canonical start/end fields remains busy until the canonical end plus the required gap, and a fallback legacy row still renders deterministically. Browser/DOM tests verify the busy text matches the backend contract.

**Completion Notes (2026-07-14):**
- [x] Added additive `transactions.start_datetime` and `transactions.end_datetime` schema fields.
- [x] Persisted canonical transaction start/end datetimes in `POST /api/transactions`.
- [x] Updated `GET /api/staff/current-status` to prefer canonical datetimes and fall back to `timestamp + duration` for legacy rows.
- [x] Updated OTDD coverage so a row with `timestamp=14:00`, `start_datetime=14:10`, and `end_datetime=15:20` remains busy until `15:20` and free at `15:35`.
- Evidence: `mocha tests/otdd/daily-summary-current-status.test.js --reporter dot` and `jest __tests__/daily-summary.current-status.present.test.js --testEnvironment=node --runInBand` passed during the whole-app UI/database audit.
