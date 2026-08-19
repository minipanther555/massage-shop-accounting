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

> **Status:** IN PROGRESS — Phase 0 part-done: `RIT-CONTRACT-001` ✅ DONE (2026-08-19). `RIT-CONTRACT-002` still OPEN, so the Phase 0 gate is not yet met.

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
- `countsAsMassage()` at `backend/services/add-on-sql.js:23` reads `(parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')` and is consumed at eight call sites: `staff.js:42`, `reports.js:55`, `reports.js:101`, `admin.js:144`, `:152`, `:479`, `:505`, `:508`.
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

## Phase 0 — The shared contract — IN PROGRESS
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

### STEP_ID: RIT-CONTRACT-002 — the counting rule stops counting non-massage money — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/services/add-on-sql.js` · its co-located `.md`
- [ ] `countsAsMassage()` becomes kind-driven rather than parent-driven, so a row is a massage unless its `add_on_kind` says otherwise.
- [ ] A `TIP` row and a `MISC_INCOME` row do not count as massages, with or without a parent.
- **Validation:** one test asserts all five verdicts together — an ordinary massage counts, an `ADDITIONAL_SERVICE` counts, a `DURATION_UPGRADE` does not, a `TIP` does not, and a parentless `MISC_INCOME` does not. *(AC-009, FR-007)*
- **Risk notes:** eight consumers inherit this — `staff.js:42`, `reports.js:55`, `reports.js:101`, `admin.js:144`, `:152`, `:479`, `:505`, `:508`. **Both capabilities depend on it**, which is why it is isolated here rather than buried in a feature step. The three preserved verdicts are in the same test as the two new ones precisely so a change that only satisfies the new cases fails.

**Phase 0 complete when:**
- [x] `RIT-CONTRACT-001` is `✅ DONE` and its unit test is green — `__tests__/transaction-status-sql.live-work.test.js`, 3 passed
- [ ] `RIT-CONTRACT-002` is `✅ DONE` and its unit test is green
- [ ] `npx jest __tests__` shows no new failures against the pre-epic baseline of 1 failed / 169 passed

**This gate authorizes Phase 1 and Phase 3.**

---

## Phase 1 — The server tells the truth — OPEN
**Phase goal:** every server-side reader of availability, workload and today's money agrees with the ledger.

### STEP_ID: RIT-LIVE-001 — availability and workload recognise a corrected row — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-CONTRACT-001
- **Touches:** `backend/routes/staff.js` · its co-located `.md`
- [ ] The busy lookup and the massage count both use the shared live-work predicate instead of testing status inline.
- [ ] A masseuse whose live massage arrived by correction reads busy, carries a workload of one, and is not marked next for a walk-in.
- **Validation:** an integration test seeds three masseuses, edits one masseuse's transaction twice, then asserts in one pass that she reads `busy` with `today_massages` of exactly **1**, that a masseuse with no transaction reads `available`, and that walk-in priority sits on a different masseuse. *(AC-002, FR-001)*
- **Risk notes:** asserting only "she is busy" would pass an implementation that marks everyone busy; the available-masseuse assertion in the same test is what closes that.

### STEP_ID: RIT-LIVE-002 — today's money counts a corrected row, on the right day — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-CONTRACT-001
- **Touches:** `backend/routes/reports.js` · `backend/routes/transactions.js` · their co-located `.md` files
- [ ] Today's revenue, customer count, payment breakdown and masseuse performance use the shared live-work predicate.
- [ ] Today's figures are computed over the current Bangkok business day rather than the UTC calendar date.
- [ ] Date-range reports are left exactly as they are.
- **Validation:** an integration test asserts that after one edit the day's revenue equals **exactly one** massage's amount and the customer count is **exactly 1**; and that at a simulated 02:33 Bangkok the day summary's business day equals the staff endpoint's business day. *(AC-002, AC-003, FR-001, FR-002)*
- **Risk notes:** a date-range regression test must be green before and after — this step is the one that could silently move historical figures.

**Phase 1 complete when:**
- [ ] `RIT-LIVE-001` and `RIT-LIVE-002` are both `✅ DONE`
- [ ] `npx jest --testMatch '**/tests/integration/**/*.test.js'` shows no new failures against the pre-epic baseline of 4 failed / 100 passed / 104 total (16 suites: 4 failed, 12 passed). Measured at `1d2f304` on 2026-08-19; the four failing suites are `csrf-auth-flow`, `nav.bilingual.keys-coverage`, `nav.bilingual.present`, `revenue.card.regression`.
- [ ] The date-range regression test is green

**This gate authorizes Phase 2.**

---

## Phase 2 — The page tells the truth — OPEN
**Phase goal:** the intake page never shows stale staff information as if it were current, and says so when it cannot refresh.

### STEP_ID: RIT-UI-001 — a failed refresh is visible to the receptionist — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** RIT-LIVE-001
- **Touches:** `web-app/transaction.html` · `web-app/transaction.ejs` · their co-located `.md` files
- [ ] Data that arrives is rendered even when a sibling fetch fails — the redraw no longer sits in the fetches' error path.
- [ ] A failed roster or live-status fetch shows a visible marker on the staff area saying the staff information may be out of date.
- [ ] The next successful refresh clears the marker.
- **Validation:** a browser-driven test fails one fetch, asserts the stale marker is visible **and** that a successful refresh afterwards removes it — both in one test, so an always-on marker fails. *(AC-004, FR-003, SC-2)*
- **Risk notes:** **checked against `RIT-UI-002` for contradiction.** This step retains the last successfully fetched roster on failure; that step bans the *page-load* name list. They are different sources and one implementation satisfies both: retain what was really fetched, never substitute what was cached at startup.

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
- **2026-08-19, `RIT-CONTRACT-001`: cancellation writes two different status literals, not one.** `backend/routes/transactions.js:502` writes `'CANCELLED'`; `:893` writes `'CANCELLED (Customer left before service)'`. The spec's contract block says only "and any cancelled status" (line 252) and the correction spec says only "marked cancelled/audit-preserved" (line 96), so neither fixes the string. This settled the allow-list-versus-deny-list call for the live-work predicate: a deny-list would have to enumerate a vocabulary that is not fixed, and would silently admit any cancelled form invented later. **Any later step tempted to test a cancelled status inline should call `isLiveWork()` instead of matching either literal.**

## Coverage
- **FR-001 → RIT-CONTRACT-001, RIT-LIVE-001, RIT-LIVE-002** · **FR-002 → RIT-LIVE-002** · **FR-003 → RIT-UI-001** · **FR-004 → RIT-UI-002** · **FR-005 → RIT-DB-001, RIT-MONEY-001, RIT-MONEY-002, RIT-UI-003** · **FR-006 → RIT-MONEY-001, RIT-MONEY-003, RIT-UI-003** · **FR-007 → RIT-CONTRACT-002, RIT-MONEY-003**
- **AC-001 → RIT-CONTRACT-001** · **AC-002 → RIT-LIVE-001, RIT-LIVE-002** · **AC-003 → RIT-LIVE-002** · **AC-004 → RIT-UI-001** · **AC-005 → RIT-UI-002** · **AC-006 → RIT-MONEY-002, RIT-UI-003** · **AC-007 → RIT-MONEY-002** · **AC-008 → RIT-MONEY-003, RIT-UI-003** · **AC-009 → RIT-CONTRACT-002, RIT-MONEY-003, RIT-UI-003** · **AC-010 → RIT-LIVE-002** · **AC-011 → RIT-VERIFY-001, RIT-DEPLOY-001**
- **SC-1 → RIT-LIVE-001, RIT-LIVE-002** · **SC-2 → RIT-UI-001** · **SC-3 → RIT-UI-002** · **SC-4 → RIT-MONEY-002** · **SC-5 → RIT-MONEY-003** · **SC-6 → RIT-DEPLOY-001**
- **UNCOVERED:** none.
