# Reception Intake Truth and Non-Massage Income — Execution Steps

## Goal
The receptionist New Customer page always shows who is genuinely free, whose turn is next, and what the
day has actually taken — without a manual reload and without ever showing stale names as if they were
current. The book gains two entries it cannot record today: a tip that passes through the shop to a
masseuse, and miscellaneous income such as an extra charge, neither of which may move a masseuse's queue
position or her payday balance.
Spec: `00-project-docs/feature-specifications/reception-intake-truth-and-non-massage-income.md`.
Planning map: none — the one-session test was run against all five reported items and returned no fog.
Operator's reported items, verbatim: `00-project-docs/reported-issues/2026-08-18-operator-reported-batch.md`.

> **Status:** IN PROGRESS — Phase 0 ✅ COMPLETE (2026-08-19) and Phase 1 ✅ COMPLETE (2026-08-19). `RIT-CONTRACT-001`, `RIT-CONTRACT-002`, `RIT-LIVE-001`, `RIT-LIVE-002` and `RIT-UI-001` are all ✅ DONE. Phase 2 is in progress — `RIT-UI-001` shipped 2026-08-19 and `RIT-UI-002` is the only step left in it. Phase 3 is OPEN. The next OPEN steps with satisfied dependencies are `RIT-UI-002` (Phase 2), `RIT-DB-001` and `RIT-MONEY-001` (Phase 3).

> **Epic complete when:** Phase 4's gate is met — every journey check green, at least one check observed
> failing before its fix, and the operator's live-verify recorded in `RIT-DEPLOY-001`'s Completion Notes.

## Dependencies
- **Today Staff and the business day (governing spec):** `00-project-docs/feature-specifications/today-staff-roster-business-day-helper.md`. Its FR-009 wording at line 426 is **amended by this epic** — see `D-01`.
- **Transaction correction (governing spec):** `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md`. Its line 32 prohibition on changing Today Staff order stands and is not touched by any step here.
- Invariant: no step deletes or rewrites a historical transaction row.
- Invariant: no step changes Today Staff ordering.
- Invariant: no step writes to `staff.total_fees_earned`, `staff.total_fees_paid` or `staff_payments`.

---

## Verified source status (read the code, 2026-08-18 CFEP)
- The busy lookup filters `status = 'ACTIVE'` at `backend/routes/staff.js:201-202`; the massage count does the same at `:38-44`. Independently confirmed against real rows on the branch database.
- Today's money filters the **UTC calendar date** at `backend/routes/reports.js:10`, not the business day.
- `countsAsMassage()` at `backend/services/add-on-sql.js:23` reads `(parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')` and is consumed at eight call sites: `staff.js:42`, `reports.js:55`, `reports.js:101`, `admin.js:144`, `:152`, `:479`, `:505`, `:508`. **Superseded 2026-08-19 by `RIT-CONTRACT-002`:** the predicate now reads `(add_on_kind IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')`. The eight call sites are unchanged and still correct.
- 🔴 `backend/routes/transactions.js:268` rejects any `add_on_kind` outside two values. A tip cannot be created without this changing.
- 🔴 `expenses` (`backend/models/database.js:102-109`) has no masseuse column and no business day.
- The dropdown redraw sits inside the fetches' `try` block at `web-app/transaction.html:1502-1519`; the stale name list is assigned at `web-app/shared.js:251` and used at `web-app/transaction.html:1804`.
- `web-app/transaction.ejs` is a byte-identical mirror; parity is enforced by a contract test. Every client step lands in both files.
- This project has **no Alembic** — `find` returns no Alembic files and no reference to it outside `node_modules`. Schema changes are made by the declarative `columnTasks` list at `backend/models/database.js:296-321`, applied idempotently at `:322-333`. See `RIT-DB-001` — the expenses columns — for how the database protocol's laws resolve against that.
- **All 42 files in `00-project-docs/known-bugs/` were classified.** Four carry an explicit open or in-progress status; thirteen carry no status line; the rest are marked resolved. Every one of the seventeen unresolved-looking files was opened. **None describes an open defect in this epic's code**, and the two closest calls are recorded below rather than assumed away. *(Recorded here, not in `## Discoveries`, which the canonical format reserves for findings written during execution.)*
  - 🔴 **`staff-dropdown-data-issue.md` contradicts this epic's reproduction.** It is marked *"✅ RESOLVED - Confirmed Working as Designed"* and claims at line 24 that *"The system correctly handles cases where no staff data is available."* That is false as of `bedcb7e`: with Today Staff empty the dropdown substitutes the page-load name list (`web-app/transaction.html:1804`), reproduced headlessly. `RIT-UI-002` — the dropdown never shows a stale name list — is what makes that file's claim true. The file should be reopened or amended when that step lands.
  - `staff-roster-ui-clarity-issue.md` carries no status line but has a completed `## Resolution` and `## Verification` section. It concerns the Today Staff page's layout, not the intake dropdown. Closed; out of this epic's scope.
  - `critical-database-schema-mismatch.md` claimed `transactions` lacked `duration` and `location`. Both exist at `backend/models/database.js:42-43`. Settled — history, not an open defect.
  - `staff-busy-time-reset-issue.md` describes staff reading perpetually busy via `staff_roster.busy_until`. That table holds zero rows and nothing the intake page reads consults it. Out of this epic's scope.

---

## Phase 0 — The shared contract — ✅ COMPLETE (2026-08-19)
**Phase goal:** the two definitions every later step depends on are settled and gated, so no dependent step redefines them.

### STEP_ID: RIT-CONTRACT-001 — one shared definition of live work — ✅ DONE (2026-08-19)
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/services/transaction-status-sql.js` · its co-located `.md`
- [x] A single SQL predicate answers "is this transaction live work", accepting `ACTIVE` and `CORRECTED` and rejecting the superseded original of an edit.
- [x] It takes a table alias, matching the convention of the existing add-on predicates.
- **Validation:** a unit test asserts the predicate is true for `ACTIVE` and for `CORRECTED`, **and false for `EDITED (Corrected by TX-1)`** — all three in one test, so a predicate returning a constant fails. *(AC-001, FR-001)*
- **Risk notes:** this is the definition every Phase 1 step consumes. Shipping it wrong reads green everywhere downstream.
- **Completion Notes:**
  - `isLiveWork(alias = '')` ships in `backend/services/transaction-status-sql.js`, returning `status IN ('ACTIVE', 'CORRECTED')` with the alias prefix. Co-located doc written.
  - **Allow-list, not deny-list — the one design call this step held.** `status` is free `TEXT` (`backend/models/database.js:50`) and the correction workflow composes literals into it: `EDITED (Corrected by TX-…)` at `transactions.js:695`, and *two different* cancelled strings — `'CANCELLED'` at `:502` and `'CANCELLED (Customer left before service)'` at `:893`. A deny-list would have to enumerate a vocabulary that is not fixed; the allow-list excludes both cancelled forms without naming either, satisfying the spec's "and any cancelled status" (line 252) as written. It also matches the live set already spelled at `backend/models/database.js:359`.
  - **Validation evidence:** `__tests__/transaction-status-sql.live-work.test.js` — 3 passed. It evaluates the fragment through SQLite against seeded rows rather than asserting on the SQL text, so a plausible-but-wrong predicate cannot pass. Verdicts asserted in one test: `ACTIVE` ✓, `CORRECTED` ✓, `EDITED (Corrected by TX-1)` ✗, `CANCELLED` ✗, `CANCELLED (Customer left before service)` ✗. Two further tests cover the aliased form and the two-consecutive-edits chain (exactly one live row).
  - **RED was observed twice.** First `Cannot find module '../backend/services/transaction-status-sql'`; then, against a deliberate constant `1 = 1` stub, a real `AssertionError` — received `[TX-ACTIVE, TX-CANCELLED, TX-CANCELLED-LEFT, TX-CORRECTED, TX-EDITED]`, expected `[TX-ACTIVE, TX-CORRECTED]`. The constant-predicate trap in the `Validation:` line is therefore demonstrated, not asserted.
  - **Suite:** `npx jest __tests__` → 1 failed / 172 passed / 173 total (24 suites). The pre-epic baseline was 1 failed / 169 passed / 170 (23 suites); the delta is exactly this step's suite. The single failure is the known pre-existing `nav.bilingual.present`, untouched by this step.
  - **Zero consumers on the day it ships**, by design — the adopting steps are `RIT-LIVE-001` and `RIT-LIVE-002`. The date-range reports at `reports.js:108`, `:147`, `:168`, `:239` were deliberately left alone (steps file line 92, spec line 152).
  - Anchor tag: `known-good/RIT-CONTRACT-001`.

### STEP_ID: RIT-CONTRACT-002 — the counting rule stops counting non-massage money — ✅ DONE (2026-08-19)
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/services/add-on-sql.js` · its co-located `.md`
- [x] `countsAsMassage()` becomes kind-driven rather than parent-driven, so a row is a massage unless its `add_on_kind` says otherwise.
- [x] A `TIP` row and a `MISC_INCOME` row do not count as massages, with or without a parent.
- **Validation:** one test asserts all five verdicts together — an ordinary massage counts, an `ADDITIONAL_SERVICE` counts, a `DURATION_UPGRADE` does not, a `TIP` does not, and a parentless `MISC_INCOME` does not. *(AC-009, FR-007)*
- **Risk notes:** eight consumers inherit this — `staff.js:42`, `reports.js:55`, `reports.js:101`, `admin.js:144`, `:152`, `:479`, `:505`, `:508`. **Both capabilities depend on it**, which is why it is isolated here rather than buried in a feature step. The three preserved verdicts are in the same test as the two new ones precisely so a change that only satisfies the new cases fails.
- **Completion Notes:**
  - `countsAsMassage(alias = '')` in `backend/services/add-on-sql.js:34` now returns `(add_on_kind IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')` — the exact predicate the spec's "Contract: countable massage (AMENDED)" block fixes at line 267. Co-located `.md` updated with the amended verdict table, the reason the parent test was dropped, and the equivalence argument below.
  - **Validation evidence:** `__tests__/add-on-sql.counts-as-massage.test.js` — 3 passed. It evaluates the fragment through SQLite against seeded rows rather than asserting on the SQL text. All five contract verdicts are asserted in **one** test: ordinary massage ✓, `ADDITIONAL_SERVICE` ✓, `DURATION_UPGRADE` ✗, `TIP` ✗, parentless `MISC_INCOME` ✗ — plus a parentless `TIP` and a parented `MISC_INCOME`, covering the action item's "with or without a parent" in both directions.
  - **RED was a real `AssertionError` against the existing module**, not an import error: received `[TX-ADDITIONAL, TX-MASSAGE, TX-MISC, TX-TIP-NO-PARENT]`, expected `[TX-ADDITIONAL, TX-MASSAGE]`. The old parent-driven predicate counted the parentless tip and the miscellaneous-income row as massages — the exact defect FR-007 names, observed rather than argued.
  - **Blast radius is provably zero on the day it ships.** `backend/routes/transactions.js:267-270` rejects any `add_on_kind` outside `DURATION_UPGRADE` and `ADDITIONAL_SERVICE` and requires a parent, and the ordinary-massage insert at `:702` never writes `add_on_kind` at all. So every row a database can hold today is one of three shapes — parent `NULL` + kind `NULL`, parent + `ADDITIONAL_SERVICE`, parent + `DURATION_UPGRADE` — and the old and new predicates return the same verdict on all three. The eight consumers are therefore mathematically unchanged until `RIT-MONEY-001` widens that validator. **No consumer was edited**; `backend/routes/admin.js` read paths are Out of Scope at spec line 112.
  - **Consumer smoke:** `tests/integration/paid-time-extension.integration.test.js` — 35 passed before the change and 35 passed after, unchanged. This is where the duration-upgrade and additional-service verdicts are actually proven through consumers.
  - **Suites:** `npx jest __tests__` → 1 failed / 175 passed / 176 total (25 suites), against the pre-step 1 failed / 172 passed / 173 (24 suites); the delta is exactly this step's three tests. `npx jest --testMatch '**/tests/integration/**/*.test.js'` → 4 failed / 100 passed / 104 total, byte-identical to the baseline. The single `__tests__` failure is the known pre-existing `nav.bilingual.present`; the four integration failures are the known `csrf-auth-flow`, `nav.bilingual.keys-coverage`, `nav.bilingual.present`, `revenue.card.regression`.
  - **No query plan moves.** Neither `parent_transaction_id` nor `add_on_kind` is indexed (`backend/models/database.js:349-358`); both the old and the new fragment are residual filters applied after the same `idx_transactions_business_day_staff` selection.
  - Anchor tag: `known-good/RIT-CONTRACT-002`.

**Phase 0 complete when:**
- [x] `RIT-CONTRACT-001` is `✅ DONE` and its unit test is green — `__tests__/transaction-status-sql.live-work.test.js`, 3 passed
- [x] `RIT-CONTRACT-002` is `✅ DONE` and its unit test is green — `__tests__/add-on-sql.counts-as-massage.test.js`, 3 passed
- [x] `npx jest __tests__` shows no new failures against the pre-epic baseline of 1 failed / 169 passed — now 1 failed / 175 passed / 176 (25 suites); the only failure is the same pre-existing `nav.bilingual.present`, and the six extra passes are the two contract steps' own tests

**This gate authorizes Phase 1 and Phase 3.**

---

## Phase 1 — The server tells the truth — ✅ COMPLETE (2026-08-19)
**Phase goal:** every server-side reader of availability, workload and today's money agrees with the ledger.

### STEP_ID: RIT-LIVE-001 — availability and workload recognise a corrected row — ✅ DONE (2026-08-19)
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-CONTRACT-001
- **Touches:** `backend/routes/staff.js` · its co-located `.md`
- [x] The busy lookup and the massage count both use the shared live-work predicate instead of testing status inline.
- [x] A masseuse whose live massage arrived by correction reads busy, carries a workload of one, and is not marked next for a walk-in.
- **Validation:** an integration test seeds three masseuses, edits one masseuse's transaction twice, then asserts in one pass that she reads `busy` with `today_massages` of exactly **1**, that a masseuse with no transaction reads `available`, and that walk-in priority sits on a different masseuse. *(AC-002, FR-001)*
- **Risk notes:** asserting only "she is busy" would pass an implementation that marks everyone busy; the available-masseuse assertion in the same test is what closes that.
- **Completion Notes:**
  - Two sites in `backend/routes/staff.js` now call `isLiveWork()` instead of testing status inline: the massage-count subquery at `:42` (aliased, `isLiveWork('t')`, sitting directly above `countsAsMassage('t')`) and the busy lookup inside `getActiveTransactionByStaff()` at `:202` (unaliased, `isLiveWork()` — the first consumer to exercise the predicate's `alias = ''` default path). Both feed `GET /api/staff/current-status`, which is the single endpoint returning `current_state`, `today_massages` and `walk_in_priority`.
  - **Validation evidence:** `tests/integration/staff-availability.corrected-row.integration.test.js` — 1 passed. It **drives the real correction route twice** (`POST /api/transactions` with `corrected_transaction_id`) rather than seeding the chain, so the status literals under test are the ones production writes. The test asserts the chain it produced before reading availability: `EDITED (Corrected by …)`, `EDITED (Corrected by …)`, `CORRECTED`. All five verdicts are in **one** test — `ขวัญ` is `busy`, her `today_massages` is exactly `1`, `นา` (no transaction) is `available` with `0`, `ขวัญ` has `walk_in_priority: false`, and the priority row is `มิน`.
  - **RED was a real `AssertionError` against the existing module**, not an import error: `Expected: "busy" / Received: "available"`. The chain assertion passed in the same RED run, which is what proves the two edits really happened and that the defect was the reader, not the writer.
  - **The payday path was checked and deliberately left alone.** `staff.js:712` (`/performance/today`, `SUM(masseuse_fee) … WHERE date = ? AND status = 'ACTIVE'`) and `staff.js:756` (`previous_day_commission` in `/today/helper`) are commission aggregations, not availability. This file's invariant at line 23 forbids this epic writing to the payday tables and the spec's "Components Explicitly Unaffected" excludes them; widening the shared predicate onto them would change what masseuses are paid. Both verified unchanged in the final diff — `grep` on the shipped file returns `status = 'ACTIVE'` at exactly those two lines and nowhere else.
  - **Suites:** `npx jest --testMatch '**/tests/integration/**/*.test.js'` → 4 failed / 101 passed / 105 total (17 suites), against the baseline 4 failed / 100 passed / 104 (16 suites); the delta is exactly this step's one test. The four failing suites are the same known `csrf-auth-flow`, `nav.bilingual.keys-coverage`, `nav.bilingual.present`, `revenue.card.regression`. `npx jest __tests__` → 1 failed / 175 passed / 176 total (25 suites), byte-identical to the baseline.
  - **No query plan moves.** `EXPLAIN QUERY PLAN` run against the real `idx_transactions_business_day_staff` definition returns identical plans for the old and new form of both queries: the count still resolves `SEARCH t USING INDEX idx_transactions_business_day_staff (business_day=? AND masseuse_name=? AND status=?)`, and the busy lookup still resolves `SEARCH … (business_day=?)` plus `USE TEMP B-TREE FOR ORDER BY`.
  - **Lint is unchanged:** `npx eslint backend/routes/staff.js` reports 39 problems both before and after the change — the new test file is clean.
  - Anchor tag: `known-good/RIT-LIVE-001`.

### STEP_ID: RIT-LIVE-002 — today's money counts a corrected row, on the right day — ✅ DONE (2026-08-19)
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-CONTRACT-001
- **Touches:** `backend/routes/reports.js` · `backend/routes/transactions.js` · their co-located `.md` files
- [x] Today's revenue, customer count, payment breakdown and masseuse performance use the shared live-work predicate.
- [x] Today's figures are computed over the current Bangkok business day rather than the UTC calendar date.
- [x] Date-range reports are left exactly as they are.
- **Validation:** an integration test asserts that after one edit the day's revenue equals **exactly one** massage's amount and the customer count is **exactly 1**; and that at a simulated 02:33 Bangkok the day summary's business day equals the staff endpoint's business day. *(AC-002, AC-003, FR-001, FR-002)*
- **Risk notes:** a date-range regression test must be green before and after — this step is the one that could silently move historical figures.
- **Completion Notes:**
  - **Six today-scoped queries moved onto `transactions.business_day` and `isLiveWork()`.** In `backend/routes/reports.js`: the `/daily/:date?` transaction summary, payment breakdown and masseuse performance, and the `/summary/today` transaction summary and payment breakdown. In `backend/routes/transactions.js`: both queries in its own `/summary/today`. Both `/summary/today` responses and `/daily`'s response now return `business_day` explicitly, so the money panel and `GET /api/staff/current-status` can be **compared** rather than assumed equal.
  - **`POST /end-day` took the status half only.** Its archive total at `reports.js:466` adopted `isLiveWork()`; its **day basis was deliberately left on the UTC calendar date**, because the two `DELETE` statements in the same handler share that value and moving it would change which rows are deleted — forbidden by this file's line-21 invariant. That wider question was already tracked as item 22 in `00-project-docs/steps/current-steps.md`, and remains there. Neither `DELETE` was touched.
  - **The date-range regression test was written FIRST and run GREEN against the unmodified code**, then again after the change — 3 passed both times, identical figures. This ordering is what makes `AC-010` provable: a regression test written after a change can only show the figures are self-consistent, never that they did not move. `tests/integration/reports.date-range.regression.integration.test.js` pins the clock to Wednesday 2026-08-19 12:00 UTC and seeds two rows whose `business_day` deliberately differs from their `date` (`TX-DR-1` date 08-17 / business day 08-16; `TX-DR-4` date 08-20 / business day 08-19), so a column swap in `/weekly`, `/monthly` or `/financial` drops `TX-DR-1` out of both windows and fails loudly. `reports.js:121`, `:160`, `:181` and the dynamic range clause at `:262` are byte-identical to `c223ac2`.
  - **RED was a real `AssertionError` against the existing modules**, not an import error, on all three tests: today's revenue `Expected: 1000 / Received: 5000` (the old query picked up the NULL-business-day decoy on the UTC date and missed the `CORRECTED` replacement entirely), and the business-day agreement `Expected: "2026-08-20" / Received: undefined`. The correction route returned `201 CORRECTED` in the same RED run, which is what proves the defect was the reader and not the writer.
  - **Validation evidence:** `tests/integration/reports.today-business-day.corrected-row.integration.test.js` — 3 passed. It drives the real correction route at a clock pinned to **02:33 Bangkok on 2026-08-20** (`2026-08-19T19:33Z`), the one instant where the business day (`2026-08-20`) and the UTC calendar date (`2026-08-19`) disagree, so both halves of the step are exercised at once. Asserted in one pass: day revenue exactly `1000`, `transaction_count` exactly `1`, `base_fee_total` `300`, one Cash payment-breakdown row, `/daily`'s masseuse performance one row with `massage_count: 1`, and the day summary's `business_day` equal to the staff endpoint's and **not** equal to the UTC date.
  - **A NULL `business_day` row is excluded, never coalesced**, per `FR-002`'s Failure Modes. The `฿5000` `TX-RIT-LIVE-002-NULLDAY` decoy stays out of today's figures and a data-integrity query still finds it — that assertion is in the same suite. **No backfill was needed and no orphan was found in the existing tree**; the decoy is seeded by the test.
  - **Suites:** `npx jest --testMatch '**/tests/integration/**/*.test.js'` → 4 failed / 107 passed / 111 total (19 suites), against the pre-step 4 failed / 101 passed / 105 (17 suites); the delta is exactly this step's two suites and six tests. The four failing suites are the same known `csrf-auth-flow`, `nav.bilingual.keys-coverage`, `nav.bilingual.present`, `revenue.card.regression`. `npx jest __tests__` → 1 failed / 175 passed / 176 total (25 suites), byte-identical to the baseline.
  - **Query plans improved rather than held.** `EXPLAIN QUERY PLAN` on the old and new form of each today-scoped query: `SCAN transactions` → `SEARCH transactions USING INDEX idx_transactions_business_day_staff (business_day=?)`. `transactions.date` carries no index; `business_day` leads one.
  - **Lint is unchanged:** `npx eslint backend/routes/reports.js backend/routes/transactions.js` reports 69 problems before and after; both new test files are clean apart from three `max-len` warnings.
  - **Marker deviation, recorded rather than hidden:** the `🔄 IN PROGRESS` marker was set at S9, not at S0 as the protocol requires, and cleared here. Nothing depended on it — this worktree had one agent and no concurrent run — but the claim "set at S0" would have been false.
  - Anchor tag: `known-good/RIT-LIVE-002`.

**Phase 1 complete when:**
- [x] `RIT-LIVE-001` and `RIT-LIVE-002` are both `✅ DONE`
- [x] `npx jest --testMatch '**/tests/integration/**/*.test.js'` shows no new failures against the pre-epic baseline of 4 failed / 100 passed / 104 total (16 suites: 4 failed, 12 passed). Measured at `1d2f304` on 2026-08-19; the four failing suites are `csrf-auth-flow`, `nav.bilingual.keys-coverage`, `nav.bilingual.present`, `revenue.card.regression`. **Now 4 failed / 107 passed / 111 (19 suites) — same four failures; the seven extra passes are Phase 1's own two suites.**
- [x] The date-range regression test is green — `tests/integration/reports.date-range.regression.integration.test.js`, 3 passed, before **and** after `RIT-LIVE-002`

**This gate authorizes Phase 2.**

---

## Phase 2 — The page tells the truth — OPEN
**Phase goal:** the intake page never shows stale staff information as if it were current, and says so when it cannot refresh.

### STEP_ID: RIT-UI-001 — a failed refresh is visible to the receptionist — ✅ DONE (2026-08-19)
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-LIVE-001
- **Touches:** `web-app/transaction.html` · `web-app/transaction.ejs` · their co-located `.md` files
- [x] Data that arrives is rendered even when a sibling fetch fails — the redraw no longer sits in the fetches' error path.
- [x] A failed roster or live-status fetch shows a visible marker on the staff area saying the staff information may be out of date.
- [x] The next successful refresh clears the marker.
- **Validation:** a browser-driven test fails one fetch, asserts the stale marker is visible **and** that a successful refresh afterwards removes it — both in one test, so an always-on marker fails. *(AC-004, FR-003, SC-2)*
- **Risk notes:** **checked against `RIT-UI-002` for contradiction.** This step retains the last successfully fetched roster on failure; that step bans the *page-load* name list. They are different sources and one implementation satisfies both: retain what was really fetched, never substitute what was cached at startup.
- **Completion Notes:**
  - **`Promise.all` became `Promise.allSettled`, and the redraw moved below it** in `refreshRosterForDropdown()` (`web-app/transaction.html:1521`, mirrored in `.ejs`). `renderMasseuseDropdown()` and the new `setStaffStaleMarker()` now sit outside either fetch's error path — spec `FR-003` processing logic 1. The two calls stay parallel; a sequential rewrite would have serialised the 30-second poll.
  - A new `#staff-stale-marker` div sits in the staff field group directly under `#masseuse-availability-message` (`:126`), styled by `.transaction-stale-marker` in `web-app/styles.css`. It reads `⚠️ ข้อมูลพนักงานอาจไม่เป็นปัจจุบัน — โหลดไม่สำเร็จ: <what failed>`, naming the failed source per processing logic 2.
  - **Mechanism divergence from the action item, recorded per `S2_DriftCheck`'s non-binding-action-items rule.** The action item says "a failed roster **or live-status** fetch". `loadCurrentShopStatus()` (`web-app/shared.js:169-183`) **never rejects** — it catches its own error and resolves a degraded snapshot carrying an `error` field. A live-status failure is therefore detected by reading `statusResult.value.error`, not by catching a rejection. Same `Validation:` line, a route the author could not have written before reading `shared.js`. **Any later step that makes that helper throw must keep both branches** — the code tests `statusResult.status !== 'fulfilled' || statusResult.value.error`.
  - **Validation evidence:** `tests/e2e/transaction.stale-marker.spec.js` — 1 passed, in a **real Chromium browser** driving the real page at `http://localhost:3000/transaction.html?PWTEST=1`. One test contains both halves the `Validation:` line demands: with `/api/staff/roster` aborted the marker is visible and names `รายชื่อพนักงานวันนี้`; after `unroute`, the next refresh hides it. An always-on marker fails the second half.
  - **The redraw assertion counts calls, it does not count options.** Asserting "the dropdown still has options" would have proven nothing — options from the previous successful render survive a redraw that never ran. The spec patches `window.renderMasseuseDropdown` with a counting wrapper and asserts exactly **1** call during the failed refresh. That is what makes processing logic 1 provable rather than plausible.
  - **RED was observed on both tests before any source line changed.** Browser: `expect(locator('#staff-stale-marker')).toBeVisible() failed — Expected: visible / Received: <element(s) not found>`, on the initial run and on retry #1. Contract: 6 failed / 6 total, with the received string printed as the *old* function body still containing `Promise.all` and `renderMasseuseDropdown();` inside the `try`.
  - **The `.spec.js` extension is load-bearing.** `playwright.config.ts`'s `e2e` project matches `**/e2e/**/*.spec.js` only — a `.ts` spec is silently not run. `npx playwright test --project=e2e --list` shows this spec by name, and the run reports `1 passed`, so it executed rather than being skipped. The spec also carries `test.use({ headless: true })` because the repo config sets `headless: false`.
  - **Both templates were edited by one script from one pair of anchors.** `diff web-app/transaction.html web-app/transaction.ejs` still shows **only** the two CSRF placeholder lines (`:6`, `:50`) — the mirror invariant. Parity contract: `__tests__/transaction.stale-marker.present.test.js` — 6 passed across `test.each([html, ejs])`, and the pre-existing `__tests__/transaction.walkin-refresh.present.test.js` — 8 passed, whose ordering assertion (`loadCurrentShopStatus()` before `renderMasseuseDropdown();`) the rewrite deliberately preserves.
  - **Suites:** `npx jest __tests__` → 1 failed / 181 passed / 182 total (26 suites), against the baseline 1 failed / 175 passed / 176 (25 suites); the delta is exactly this step's one suite and six tests. `npx jest --testMatch '**/tests/integration/**/*.test.js'` → 4 failed / 107 passed / 111 total (19 suites), **byte-identical** to the baseline. The single `__tests__` failure is the known pre-existing `nav.bilingual.present`; the four integration failures are the same known `csrf-auth-flow`, `nav.bilingual.keys-coverage`, `nav.bilingual.present`, `revenue.card.regression`.
  - **Security:** the marker writes through `textContent` and interpolates only two hard-coded Thai literals, never a server string — no injection surface. `npm audit` reports the same 38 pre-existing vulnerabilities; no dependency was added or changed. ESLint's parse error on `.html` / `.ejs` is pre-existing and reproduced at `HEAD` under `git stash`.
  - **The page-load name-list fallback was deliberately not touched.** `renderMasseuseDropdown()`'s `CONFIG.settings.masseuses` fallback and `web-app/shared.js:250-253` are `RIT-UI-002`'s to remove. This step retains only what was **really fetched**; it never substitutes what was cached at startup, so the two steps do not contradict.
  - Anchor tag: `known-good/RIT-UI-001`.

### STEP_ID: RIT-UI-002 — the dropdown never shows a stale name list — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-UI-001
- **Touches:** `web-app/transaction.html` · `web-app/transaction.ejs` · `web-app/shared.js` · their co-located `.md` files
- [ ] The page-load masseuse name list is no longer used as a fallback for staff availability.
- [ ] With an empty Today Staff list the dropdown offers no selectable staff and shows an empty-state message pointing reception at the Today Staff page.
- [ ] Next-in-queue and the busy guard read the same live status, so a busy masseuse is never labelled next in queue.
- **Validation:** one test renders the dropdown twice — with a populated Today Staff list, asserting those names appear and a busy one is not labelled next; and with an empty list, asserting **zero** selectable names and a visible empty-state message. *(AC-005, FR-004, SC-3)*
- **Risk notes:** asserting only the empty case would pass an implementation that never offers anyone; the populated case in the same test closes that. Shares two files with `RIT-UI-001`, hence the dependency edge.

**Phase 2 complete when:**
- [ ] `RIT-UI-001` and `RIT-UI-002` are both `✅ DONE`
- [ ] The `.html` / `.ejs` parity contract test is green
- [ ] `npx jest __tests__` shows no new failures against the pre-epic baseline

**This gate authorizes Phase 4.**

---

## Phase 3 — The book holds money that is not massage revenue — OPEN
**Phase goal:** a tip and a miscellaneous charge can be recorded, attributed, and kept out of the queue and the payday balance.

### STEP_ID: RIT-DB-001 — the expenses table can carry a masseuse and a business day — OPEN
- **Protocol:** `/db-ops-regular`
- **Dependencies:** none
- **Touches:** `backend/models/database.js` · its co-located `.md`
- **Mode declarations (fill `S0_Plan` from these — the resolver is mechanical and must not stall):**
  - `DB_VALUE: EPHEMERAL` — the operator, verbatim: *"all the data in the database is fake right now. We're still testing this shit."*
  - `HAS_DOCKER_TEST_DB: NO` · `HAS_BYTEBASE: NO`
  - ⇒ **MODE A (MVP Core).** Core laws only. Do not run the heavy apply / verify / hash / canary machinery; the protocol states at line 93 that its absence in Mode A is deliberate, not a gap.
- **🔴 This project has no Alembic, and none is to be invented.** `find` returns no Alembic files and no `.js` / `.json` / `.py` reference to it outside `node_modules`. The protocol's own rule at line 200 — *"You MUST NOT invent infra"* — governs. Therefore:
  - The **Deterministic Deploy Artifact Law** (§4.3) is satisfied by this repo's own mechanism, not by generated SQL: the declarative `columnTasks` list at `backend/models/database.js:296-321`, applied idempotently at `:322-333`, which catches `duplicate column name` and rethrows anything else. It is committed source, repeatable from source, and additive — which is what the Prime Directive asks for.
  - The **Revision Graph** and **Single Stamp Row** laws (§4.1, §4.2) are **vacuous here**: there is no `alembic_version` table to hold multiple heads or duplicate rows. State that as the finding rather than treating an absent table as a failed gate.
  - `STATE_CERTAINTY` is therefore established by the schema itself — the two columns are absent before and present after — not by a revision probe.
- [ ] `expenses` gains `masseuse_name TEXT NULL` and `business_day DATE NULL` as entries in the existing `columnTasks` list, additively, with no backfill.
- [ ] An index exists on `expenses(business_day)`.
- [ ] The rollback is stated before anything is applied, and recorded in this step's evidence.
- **Validation:** a schema query confirms both columns and the index exist, **and** a query confirms the pre-existing expense rows are unchanged in number and total amount, **and** a second startup adds nothing further (proving idempotence). *(FR-005, §6 Data Model)*
- **Risk notes:** this is the only schema change in the epic. It routes to the database protocol and is never inlined in a feature step. The mode declarations above exist so the protocol's `S0_Plan` and `S2_DriftCheck` resolve mechanically instead of stopping on Alembic gates this repo cannot satisfy.

### STEP_ID: RIT-MONEY-001 — the ledger accepts tips and miscellaneous income — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-CONTRACT-002
- **Touches:** `backend/routes/transactions.js` · its co-located `.md`
- [ ] `add_on_kind` accepts `TIP` and `MISC_INCOME` in addition to the two existing kinds.
- [ ] A `MISC_INCOME` row is permitted with or without a parent transaction.
- **Validation:** a route test asserts all four kinds are accepted with 201 **and** that a fifth invented kind is still rejected with 400 — both in one test, so removing the validator fails. *(FR-005, FR-006)*

### STEP_ID: RIT-MONEY-002 — a tip is income, expense, and attributed — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-DB-001, RIT-MONEY-001
- **Touches:** `backend/routes/transactions.js` · its co-located `.md`
- [ ] Recording a tip writes a `TIP` transaction row linked to its parent, carrying the parent's masseuse and business day and a masseuse fee of zero.
- [ ] It writes a matching `expenses` row of the same amount, carrying the masseuse name and business day.
- [ ] Both writes happen in one database transaction.
- **Validation:** an integration test records a ฿100 tip on a ฿700 massage and asserts, in one pass, day income ฿800, one expense row of ฿100 carrying that masseuse and today's business day, and `staff.total_fees_earned` **unchanged**; a second test forces the expense write to fail and asserts **no** tip transaction row exists. *(AC-006, AC-007, FR-005, SC-4)*
- **Risk notes:** the unchanged payday balance is the operator's explicit requirement — *"the tips get handed to the masseuses immediately they dont get added to their payday balance"* — and is the assertion most likely to be dropped.

### STEP_ID: RIT-MONEY-003 — miscellaneous income is income only — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-MONEY-001
- **Touches:** `backend/routes/transactions.js` · its co-located `.md`
- [ ] Recording miscellaneous income writes one `MISC_INCOME` transaction row with a masseuse fee of zero and no expense row.
- [ ] An entry with no amount or no description is rejected before any write.
- **Validation:** an integration test records ฿50 of miscellaneous income and asserts day income rises by exactly ฿50, that the expenses table gained **no** row, that no masseuse fee was recorded, and that every masseuse's `today_massages` is unchanged from before the entry. *(AC-008, AC-009, FR-006, FR-007, SC-5)*

### STEP_ID: RIT-UI-003 — reception can enter a tip and a miscellaneous charge — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-MONEY-002, RIT-MONEY-003, RIT-UI-002
- **Touches:** `web-app/transaction.html` · `web-app/transaction.ejs` · `web-app/api.js` · their co-located `.md` files
- [ ] Reception can record a tip against a saved transaction from the intake page, Thai-first, in the style of the existing controls.
- [ ] Reception can record a miscellaneous charge with an amount and a description.
- [ ] Both surfaces show the day's figures updating without a manual reload.
- **Validation:** a browser-driven test records a tip and a miscellaneous charge and asserts the day's income figure changes on screen with no reload, **and** that the staff dropdown's next-in-queue label is unchanged by either entry. *(AC-006, AC-008, AC-009)*
- **Risk notes:** shares the two intake templates with `RIT-UI-002`, hence the dependency edge.

**Phase 3 complete when:**
- [ ] `RIT-DB-001`, `RIT-MONEY-001`, `RIT-MONEY-002`, `RIT-MONEY-003` and `RIT-UI-003` are all `✅ DONE`
- [ ] The `.html` / `.ejs` parity contract test is green
- [ ] `npx jest --testMatch '**/tests/integration/**/*.test.js'` shows no new failures against the pre-epic baseline

**This gate authorizes Phase 4.**

---

## Phase 4 — Verification and hardening — OPEN
**Phase goal:** the steps integrate, the checks are proven capable of failing, and the operator has used the result on real hardware.

### STEP_ID: RIT-VERIFY-001 — the five journeys hold end to end — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-LIVE-002, RIT-UI-002, RIT-UI-003
- **Touches:** `tests/integration/` · `__tests__/`
- [ ] Journey 1 — a walk-in is submitted and the dropdown, queue and day figures update with no reload.
- [ ] Journey 2 — a transaction is edited and the masseuse stays busy, counted once, and off the front of the queue.
- [ ] Journey 3 — the clock crosses 02:00 and the money panel and the staff panel report the same business day.
- [ ] Journey 4 — a tip is recorded and the book shows both sides while the queue is untouched.
- [ ] Journey 5 — a refresh fails and reception sees the stale marker rather than a frozen page that looks current.
- [ ] At least one of the five is observed **failing before its fix** and the failing output is recorded in the Completion Notes.
- **Validation:** all five journey tests green, and the Completion Notes carry the terminal output of the one observed failing beforehand. *(AC-011 partially, §10 Regression Tests)*
- **Risk notes:** a verification phase that goes green on its first run has demonstrated nothing. The observed failure is what makes the other four believable.

### STEP_ID: RIT-DEPLOY-001 — live on the branch server and operator-verified — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-VERIFY-001
- **Touches:** the branch server checkout at `massage:/opt/massage-shop` (deploy only; no repo files)
- [ ] **Gates first:** every FSM gate green before anything is deployed — only gate-passed code reaches a server.
- [ ] **Verify-push:** push the session's `claude/…` working branch with the commit message flagged `live-verify test`. **No `testingNN` is minted here** — numbers come only from post-checkpoint `/push`.
- [ ] **Migrations first, via the protocol:** `RIT-DB-001` must already be applied through `/db-ops-regular` before this code is deployed. This step never inlines SQL.
- [ ] **State the rollback before touching anything:** the previous `testingNN` plus a service restart, named in this step's evidence.
- [ ] **Restart rules:** `massage-shop.service` is a reader and restarts freely. Any writer or ingestor service is a HARD STOP requiring the operator's explicit OK.
- [ ] **Health-check after:** service up, one read endpoint returns 200; record `LIVE = <branch>` in the Completion Notes.
- [ ] **Live-verify — look, don't touch:** the operator works one real shift covering a new customer, an edit, and the 2am rollover.
- **Validation:** the health check returns 200, `LIVE = <branch>` is recorded, and the operator's verdict on the shift is recorded verbatim in the Completion Notes. *(AC-011, SC-6)*
- **Risk notes:** broken at the live-verify → fix, re-push the same working branch, re-verify. This step stays loudly OPEN if the operator defers it.

**Phase 4 complete when:**
- [ ] All five journey tests are green and one was observed failing first
- [ ] `LIVE = <branch>` is recorded and the health check returned 200
- [ ] The operator's live-verify verdict is recorded verbatim

**This gate ends the epic.**

---

## Open Decisions
- **D-01 (ratified):** The Today Staff spec's FR-009 processing logic at line 426 says the massage count is of "completed `ACTIVE` transaction ledger rows". That wording excludes a correction replacement, which is a real completed massage. The operator settled it — *"She's taken. She should now be mid-massage."* — so the spec's wording is amended to `ACTIVE` or `CORRECTED`, and `FR-001` supersedes it.
- **D-02 (ratified):** A tip is income **and** expense, net neutral, attributed to the masseuse, and never added to her payday balance. Operator's own model.
- **D-03 (ratified):** Ordering is this file's dependency graph, not an operator question. Operator — *"What does it matter what the order is? We're getting them all done."*
- **D-04 (ratified):** Auto-refresh is not built. It already exists and works, verified by driving the real page; the defects are the swallowed failure and the split definitions.
- **D-05 (decided on paper):** Tips and miscellaneous income reuse the existing add-on row mechanism with two new `add_on_kind` values, rather than a new table. It inherits attribution, the business day and the correction chain for free.
- **D-06 (decided on paper):** `countsAsMassage()` becomes kind-driven rather than parent-driven. The parent test is what makes a parentless miscellaneous-income row count as a massage.

## Open Questions
- **Q-01 — blocks: none** — the criteria set gains a seventh member covering `FR-002`, the business-day keying of today's figures, which no ratified criterion currently tests. Named in the spec's goal-coverage check rather than silently added. This does not block any step; `AC-003` already covers the requirement.

## Discoveries
*(append-only; written during execution, empty at authoring)*

- **2026-08-19 — `POST /reports/end-day` deletes the per-transaction audit trail, and nothing archives it first.** Found by the driver while auditing `RIT-LIVE-002` — the step that moved today's money onto the business day. `backend/routes/reports.js` writes only aggregate totals to `daily_summaries`, then runs `DELETE FROM transactions WHERE date = ?` (preserving only rows with an outstanding PENDING add-on) and `DELETE FROM expenses WHERE date = ?`. An `archived_transactions` table exists in the schema, but `grep -rn "INSERT INTO archived_transactions" backend/routes/` returns **nothing** — no code path ever writes to it. The endpoint is reachable from the UI at `web-app/api.js:499`, `web-app/shared.js:586` and `web-app/summary.html:515`.
  - **Harm:** after an edit and then an end-day, both the `EDITED (Corrected by …)` original and its `CORRECTED` replacement are deleted. The operator's stated reason the edit trail exists — *"when there's a mistake made it's supposed to have both transactions in the ledger so you can see what the receptionist did"* — is defeated by a button reception can press.
  - **It contradicts a governing spec.** `transaction-correction-operational-reversal.md` line 34 puts *"Deleting financial/audit records"* out of scope, and its line 119 states *"No destructive schema or data cleanup is permitted; corrected/original records remain the audit trail."*
  - **NOT this epic's to fix.** No step here touches `/end-day`'s deletes, and `RIT-LIVE-002` deliberately left that handler's day basis alone so the deletes keep removing exactly the rows they removed before. Recorded for the operator's ruling; it needs its own spec question, not a fold-in.
- **2026-08-19, `RIT-CONTRACT-001`: cancellation writes two different status literals, not one.** `backend/routes/transactions.js:502` writes `'CANCELLED'`; `:893` writes `'CANCELLED (Customer left before service)'`. The spec's contract block says only "and any cancelled status" (line 252) and the correction spec says only "marked cancelled/audit-preserved" (line 96), so neither fixes the string. This settled the allow-list-versus-deny-list call for the live-work predicate: a deny-list would have to enumerate a vocabulary that is not fixed, and would silently admit any cancelled form invented later. **Any later step tempted to test a cancelled status inline should call `isLiveWork()` instead of matching either literal.**
- **2026-08-19, `RIT-LIVE-001`: a third inline `status = 'ACTIVE'` test sits in the correction route itself, and it is NOT this epic's to change.** `getCorrectionEligibleStaff()` at `backend/routes/transactions.js:20` and `:28` tests `status = 'ACTIVE'` inline when deciding which masseuse may take a replacement. `FR-001` enumerates the readers that must adopt the shared predicate — the busy lookup, the massage count, the priority pick, today's revenue, today's customer count — and this is none of them; it is the correction workflow's own eligibility rule, governed by `transaction-correction-operational-reversal.md`. **Recorded, not changed.** Left as is, a masseuse mid-massage on a *corrected* row still reads eligible to take a replacement, which is arguably wrong — but deciding that is the correction spec's call, not this epic's. Raise it as a separate spec question rather than folding it into a Phase 1 step.
- **2026-08-19, `RIT-LIVE-001`: the busy lookup was the first unaliased consumer of the shared predicate.** `getActiveTransactionByStaff()` queries `FROM transactions` with no alias, so it calls `isLiveWork()` with no argument. `RIT-CONTRACT-001`'s `alias = ''` default is therefore load-bearing in production, not just a convenience — the unit test covered it, and this step is what actually exercises it through a route.
- **2026-08-19, `RIT-LIVE-002`: the epic had no date-range regression test at all, and `AC-010` cannot be satisfied by one written afterwards.** Nothing in the tree asserted date-range report figures before this step. The test was therefore written and run GREEN against the **unmodified** `reports.js`, and only then was a line changed. **Any later step that touches a shared reporting query should do the same** — a regression test authored after the edit proves the figures are self-consistent, never that they did not move, and "identical before and after" is exactly what `AC-010` asks for.
- **2026-08-19, `RIT-LIVE-002`: `transactions.date` and `transactions.business_day` are different facts on the same row, and the gap is routine, not exceptional.** Every insert writes `date` from the UTC calendar day (`transactions.js:647`, and `:363` for add-ons) and `business_day` from `getBusinessDay()`. Between 00:00 and 07:00 Bangkok those disagree, so **any** query choosing between them is making a semantic choice, not picking a synonym. Today-scoped readers take `business_day`; date-range readers keep `date`.
- **2026-08-19, `RIT-LIVE-002`: `expenses` cannot follow today's money onto the business day yet, and this is visible in `GET /daily`.** `expenses` has no `business_day` column until `RIT-DB-001`, and `backend/routes/expenses.js:33` writes `expenses.date` from the UTC calendar day. `/daily` therefore passes the business-day string to a column populated from a different calendar, which is right for an explicit date parameter and approximate for the early-morning window. **`RIT-DB-001` is the fix point** — when `expenses.business_day` exists, `/daily`'s expense query should adopt it. Recorded so the next step does not have to rediscover it.
- **2026-08-19, `RIT-LIVE-002`: `POST /end-day` was split deliberately — status yes, day basis no.** Its archive total adopted `isLiveWork()`, but its day basis stayed on the UTC calendar date because the two `DELETE` statements in the same handler read the same variable. Moving it would silently change which financial rows are deleted, which this file's line-21 invariant forbids. **A later step tempted to "finish the job" in `end-day` must treat the day basis and the deletes as one change, not two.**

- **2026-08-19, `RIT-UI-001`: `loadCurrentShopStatus()` never rejects, so "catch the failed fetch" is not a usable pattern for it.** `web-app/shared.js:169-183` catches its own error and **resolves** a degraded snapshot — `{ business_day: null, staff: [], error: <message> }` — then returns it. Every caller that wants to know the live-status fetch failed must read `.error` off the resolved value. `RIT-UI-001` does exactly that. **Two consequences for later steps:** `RIT-UI-002` reads the same snapshot for the busy guard and next-in-queue, so a degraded snapshot silently presents as "no staff are busy" rather than as an error — the empty-state and busy-guard logic must distinguish *the list is empty* from *the fetch failed*. And any step that "fixes" `loadCurrentShopStatus()` to rethrow will not break `RIT-UI-001` (its `allSettled` branch tests `status !== 'fulfilled'` as well as `.error`) but **will** change what every other caller sees.
- **2026-08-19, `RIT-UI-001`: a UI test that asserts state can pass over a redraw that never ran.** The first draft of the browser spec asserted the staff dropdown "still has options" after a failed fetch, as proof the redraw had left the error path. It proves nothing — the options rendered by the *previous* successful refresh are still in the DOM whether or not the redraw ran, so the assertion is green against the unfixed code. The spec now patches `window.renderMasseuseDropdown` with a counting wrapper and asserts the call count. **Any later UI step asserting "the page updated" should count the update, not inspect the residue of the last one.**
- **2026-08-19, `RIT-UI-001`: two Playwright traps in this repo, both silent.** `playwright.config.ts` sets `headless: false`, so an unattended spec must set `test.use({ headless: true })` itself. And the `e2e` project's `testMatch` is `**/e2e/**/*.spec.js` — **`.js` only**. Two `.ts` specs already in `tests/e2e/` (`dropdown-contract.spec.ts`, `add-loop-budget.spec.ts`) are matched by no project and never run. A new browser spec must be `.spec.js`, and its execution should be proven with `--list` or a named `1 passed` line rather than assumed. Separately, `npm test` is broken — `package.json:6` `scp`s a database from a path that no longer exists; use `npx playwright test` and `npx jest` directly.

## Coverage
- **FR-001 → RIT-CONTRACT-001, RIT-LIVE-001, RIT-LIVE-002** · **FR-002 → RIT-LIVE-002** · **FR-003 → RIT-UI-001** · **FR-004 → RIT-UI-002** · **FR-005 → RIT-DB-001, RIT-MONEY-001, RIT-MONEY-002, RIT-UI-003** · **FR-006 → RIT-MONEY-001, RIT-MONEY-003, RIT-UI-003** · **FR-007 → RIT-CONTRACT-002, RIT-MONEY-003**
- **AC-001 → RIT-CONTRACT-001** · **AC-002 → RIT-LIVE-001, RIT-LIVE-002** · **AC-003 → RIT-LIVE-002** · **AC-004 → RIT-UI-001** · **AC-005 → RIT-UI-002** · **AC-006 → RIT-MONEY-002, RIT-UI-003** · **AC-007 → RIT-MONEY-002** · **AC-008 → RIT-MONEY-003, RIT-UI-003** · **AC-009 → RIT-CONTRACT-002, RIT-MONEY-003, RIT-UI-003** · **AC-010 → RIT-LIVE-002** · **AC-011 → RIT-VERIFY-001, RIT-DEPLOY-001**
- **SC-1 → RIT-LIVE-001, RIT-LIVE-002** · **SC-2 → RIT-UI-001** · **SC-3 → RIT-UI-002** · **SC-4 → RIT-MONEY-002** · **SC-5 → RIT-MONEY-003** · **SC-6 → RIT-DEPLOY-001**
- **UNCOVERED:** none.
