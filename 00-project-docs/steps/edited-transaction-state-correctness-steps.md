# Edited Transaction State Correctness — Execution Steps

## Goal
After a transaction is edited, every part of the system agrees the edited version is the real one —
the masseuse's availability, her workload, the day's money, and the monthly report. Today an edit
writes a status that half the system does not recognise, so she reads as free mid-massage and her
money vanishes from the daily summary. Spec:
`00-project-docs/feature-specifications/edited-transaction-state-correctness.md`. Planning map: none.

> **Status:** OPEN — no steps started. Fix direction REVERSED on 2026-08-18 after reading the
> governing correction spec and the audit-repair tool; see D-01 in Open Decisions. Ship this epic
> FIRST of the three: an edited transaction currently reports **zero** revenue for that customer,
> which is an open theft window.

> **Epic complete when:** Phase 4's gate is met — the verification journeys pass and the operator has
> live-verified an edit on the branch server.

## Scope (this lane)
- **Owns:** the status an edit writes to the replacement transaction row, every reader of that
  status, and the removal of the dead set-busy path in reception intake.
- **Does NOT own:** the intake refresh and overnight staleness defects — those belong to
  `daily-state-freshness-steps.md`. Tips and miscellaneous income belong to
  `tips-and-miscellaneous-income-steps.md`.

## ⚠️ Cross-epic file collisions — READ BEFORE RUNNING IN PARALLEL
Three epics are in flight. This lane's write-set changed on 2026-08-18 when the fix direction was
corrected — it now writes the staff and reports routes rather than the transaction write path.

- `backend/routes/staff.js` — written here at `ETSC-CORE-001`. **No other epic writes it.**
- `backend/routes/reports.js` — written here at `ETSC-CORE-002`. **`daily-state-freshness-steps.md`
  also writes this file**, at its own day-basis step, and both change the same today-summary queries:
  this lane changes which statuses they count, that lane changes which day column they filter on. The
  two edits are compatible but land in the same lines — do not run them concurrently.
- `backend/routes/transactions.js` — written here at `ETSC-CORE-002` (today-summary query),
  `ETSC-CORE-002a` (the audit-repair tool) and `ETSC-CORE-003`. Both other epics write this file too.
- `web-app/transaction.html` and its `.ejs` mirror — written here **only** at `ETSC-CLEAN-001`, the
  optional cleanup step. If that step is cut, this lane does not touch the intake page at all.

## Dependencies
- **Transactions write path (live):** an edit relabels the original and inserts a replacement —
  `backend/routes/transactions.js:693-717`. Must keep the audit trail of superseded rows.
- **Busy and workload derivation (live):** read only rows whose status is `ACTIVE` —
  `backend/routes/staff.js:41`, `:201`, `:711`, `:755`. **These are corrected by ETSC-CORE-001** —
  they are the defect, not a dependency to leave alone.
- **Today's money (live):** reads only `ACTIVE` — `backend/routes/reports.js:24`, `:45`, `:63`,
  `:204`, `:215`, `:456`, and `backend/routes/transactions.js:935`, `:946`. **These are corrected by
  ETSC-CORE-002.**
- Invariant: superseded rows are never deleted; the transaction list keeps showing them.
- Invariant: existing rows already carrying the `CORRECTED` status keep reading correctly wherever
  they are already accepted. No historic data is rewritten.

---

## Verified source status (read the code, 2026-08-18 CFEP)
- An edit inserts the replacement with status `CORRECTED` — `backend/routes/transactions.js:713`
  (`originalTransactionId ? 'CORRECTED' : 'ACTIVE'`). Read in full, not grepped.
- The original is relabelled `EDITED (Corrected by <id>)` — `backend/routes/transactions.js:693-696`.
- Busy derivation filters `status = 'ACTIVE'` — `backend/routes/staff.js:201`; a null busy window
  falls through to `available` — `backend/routes/staff.js:246-248`, `:259`.
- Workload count filters `status = 'ACTIVE'` — `backend/routes/staff.js:41`; lowest workload sorts to
  the front of walk-in priority — `backend/routes/staff.js:294-300`.
- Today's summary filters `status = 'ACTIVE'` — `backend/routes/reports.js:24`, `:45`, `:204`, `:215`.
  Date-range reports filter `status IN ('ACTIVE','CORRECTED')` — `backend/routes/reports.js:108`,
  `:147`, `:168`, `:239`. **The two families disagree on every edited transaction.**
- The audit-repair tool matches on the `CORRECTED` status at `backend/routes/transactions.js:799`
  (`WHERE corrected_from_id = ? AND status = "CORRECTED"`). Keying it on the link instead is
  hardening, not a prerequisite — the status is not changing.
- The unique booking index covers `status IN ('ACTIVE','CORRECTED')` —
  `backend/models/database.js:359`. With the original relabelled `EDITED`, one row remains in the
  index either way.
- 🔴 **A governing spec mandates the replacement's status.**
  `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md` FR-003:
  *"preserves the original transaction with an `EDITED (Corrected by ...)` audit status and the
  replacement with `CORRECTED` plus `corrected_from_id`."* Its §6 states the same transition. **The
  replacement must stay marked `CORRECTED`**; the defect is in the readers, not the writer.
- 🔴 **That same spec's AC-003 is what the current code violates:** *"removes the original staff
  member's payable fee and active-workload effect, and applies the replacement fee/workload effect
  exactly once."* The fee is applied (`backend/routes/transactions.js:720-726`); **the workload effect
  is not**, because the workload count admits only live rows (`backend/routes/staff.js:41`). This
  epic implements AC-003 rather than working around it.
- 🔴 **An audit-integrity repair tool depends on the `CORRECTED` status.**
  `POST /transactions/fix-edited-status` — `backend/routes/transactions.js:782-825` — finds superseded
  rows wrongly left live and relabels them, matching on that status at `:799`. Writing replacements
  live would leave this tool permanently unable to match anything. The audit trail is a fraud control
  (a receptionist previously stole money), so degrading it is not an acceptable cost.
- The date-range financial report **already treats a corrected row as live money** —
  `backend/routes/reports.js:239` (`WHERE t.status IN ('ACTIVE', 'CORRECTED')`). It is the reference
  implementation for the today-summary fix.
- Audit display keys on the superseded row's status, not the replacement's — `web-app/summary.html:443`,
  `:461`, `web-app/index.html:453`, `web-app/transaction.html:1730`. **Both rows stay visible and the
  edited badge keeps rendering under this epic**; the manager's fraud-review view is untouched.
- Reception calls a set-busy endpoint after every submit — `web-app/transaction.html:1473` — which
  writes `staff_roster.status` and `busy_until` (`backend/routes/staff.js:660-664`). **Nothing reads
  it**: the roster query hardcodes `NULL AS busy_until` — `backend/routes/staff.js:35`.

---

## Phase 1 — Make the live row recognisable — OPEN
**Phase goal:** after an edit, the replacement counts for availability, workload and the day's money,
while every superseded row still counts for neither — and both rows stay in the ledger.

### STEP_ID: ETSC-CORE-001 — availability and workload recognise a corrected row as live — ✅ DONE
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/routes/staff.js`, `backend/services/transaction-status-sql.js` (new — the
  shared predicate's home, following the pattern of `backend/services/add-on-sql.js`), `tests/`
- **Why the fix goes here and not in the write path:** the correction spec mandates that the
  replacement row is marked `CORRECTED` — `transaction-correction-operational-reversal.md` FR-003 and
  §6. Writing it live instead would contradict that governed contract **and** silently disable the
  audit-integrity repair tool at `backend/routes/transactions.js:782-825`, which finds superseded rows
  by looking for the `CORRECTED` status at `:799`. The audit trail is a fraud control; degrading it is
  not an acceptable cost. So the readers are corrected, not the writer.
- [x] A masseuse's busy window derives from her live massage whether that massage is an original or a
      correction replacement.
- [x] Her workload count includes a correction replacement, so an edit does not reset her queue
      position — this is `transaction-correction-operational-reversal.md` AC-003, which requires the
      replacement's workload effect to apply exactly once and which the current code does not honour.
- [x] Superseded rows and cancelled rows remain excluded from both.
- [x] The two other workload-fairness readers in the same file are corrected with the same predicate:
      today's per-masseuse performance (`backend/routes/staff.js:711`) and yesterday's commission
      (`backend/routes/staff.js:755`), which orders tomorrow's roster via
      `ORDER BY previous_day_commission ASC` at `:773` — so an edit today must not change who gets
      customers tomorrow.
- [x] The predicate lives in one shared helper, not inline at each site, following the reason
      `backend/services/add-on-sql.js:5-8` gives for existing: so the aggregation sites cannot drift.
- **Validation:** after editing a one-hour massage to two hours, the masseuse reads as busy for the
  edited duration, is not offered as next in line, and keeps the workload count she had before the
  edit — satisfies AC-001, AC-002 and AC-003. All three observed failing on the pre-change build;
  this is the operator's reported symptom, so a test that never failed proves nothing.
- **Risk notes:** the predicate must admit a corrected row without admitting a superseded or cancelled
  one. Superseded rows carry a status beginning `EDITED`; cancelled rows one beginning `CANCELLED`.
  An implementation that widens to "not cancelled" would wrongly count superseded rows and double a
  masseuse's workload for every edit.
- **Completion Notes:** Shipped 2026-08-18.

  **What changed.** New shared module `backend/services/transaction-status-sql.js` exporting
  `countsAsLiveWork(alias)`, returning `status IN ('ACTIVE', 'CORRECTED')` — an allowlist of exactly
  two values, matching the reference implementation at `backend/routes/reports.js:239` and the unique
  booking index at `backend/models/database.js:359` verbatim. No new status vocabulary. Applied at all
  four transaction-status filters in `backend/routes/staff.js`: the workload count at `:42`, the busy
  window at `:202`, today's per-masseuse performance at `:712`, and yesterday's commission at `:756`.
  `grep -n "status = 'ACTIVE'" backend/routes/staff.js` now returns nothing, so no inline copy
  survived. `countsAsMassage('t')` at `:43` is untouched and still ANDed.

  **RED observed before any production line changed** —
  `tests/integration/edited-transaction-live-state.integration.test.js`, 8 of 9 failing, with the
  values the ledger predicted: `current_state` `"available"` not `"busy"`, `walk_in_priority` `true`
  not `false`, `today_massages` `0` not `1`, two-successive-edits count `0` not `1`,
  `previous_day_commission` `0` not `300`, and the per-masseuse performance row `undefined`. GREEN
  after: 9 of 9. The ninth test — a cancelled row counting for nothing — passed in both states by
  design; it is a regression guard on behaviour that was already correct, not a symptom reproduction.

  **The Validation line was too weak and was strengthened rather than relaxed.** As quoted it exercises
  only busy state, next-in-line and workload, which is `:42` and `:202`. An implementation changing
  only those two sites would have satisfied it in full while failing this step's fourth objective
  outright. Three supplementary assertions close the gap, all approved at the plan audit: yesterday's
  commission through `GET /staff/today/helper` covering `:756`; a two-successive-edits fixture
  asserting a workload of one, not three, which fails a denylist predicate directly rather than
  incidentally; and a source assertion that the predicate is imported from the shared module and no
  inline filter remains, which is what makes the fifth objective checkable at all.

  **Gates.** `npx jest __tests__` = 1 failed / 169 passed, identical to the recorded baseline, the
  single failure being `__tests__/nav.bilingual.present.test.js`, unrelated. Six integration suites
  reading the changed queries — walk-in queue refresh, transaction correction, paid time extension,
  booking reservation, time-window promotion, promotion settings manager — 56 passed, 0 failed.
  Security: all four call sites pass hardcoded literals (`'t'`, `''`), verified by grep; no user input
  reaches the interpolated alias; no new endpoint, no new input, and the change widens what is read
  while writing nothing. Performance: `EXPLAIN QUERY PLAN` before and after is byte-identical — the
  workload count keeps `SEARCH t USING COVERING INDEX idx_transactions_business_day_staff`, and the
  busy query's plan never depended on the status column.

  **Not touched, deliberately.** `backend/routes/transactions.js` (the edit write path, whose status
  values are mandated by `transaction-correction-operational-reversal.md` FR-003 and §6); every
  `web-app` file; `backend/routes/reports.js` (owned by ETSC-CORE-002); `backend/routes/admin.js` (see
  Discoveries — display-only, and payouts accrue correctly through the edit path itself);
  `backend/routes/staff.js:702`'s UTC date derivation (see Discoveries — owned by the freshness lane,
  and the reason the `:712` test pins a fixture to the real UTC date instead of `?at=`).

  **Docs.** New `backend/services/transaction-status-sql.js.md`. `backend/routes/staff.js.md` had three
  stale lines asserting the counts came from `ACTIVE` rows — corrected at `:29`, `:41` and `:137` — plus
  a new bug-record section covering the symptom, the two rejected hypotheses and the resolution.

### STEP_ID: ETSC-CORE-002 — the day's money counts a corrected row — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-001
- **Touches:** `backend/routes/reports.js`, `backend/routes/transactions.js`, `tests/`
- **Why this matters beyond tidiness:** an edited transaction currently contributes nothing to the
  day's revenue, because today's summary counts live rows only and after an edit neither row is live.
  A customer edited from 798 to 399 shows as **0** in the day's takings, so the cash the manager
  expects for that customer drops to nothing. The audit trail still shows the edit, but the headline
  number does not. **This is an open theft window, and it is the reason this step exists.**
- [ ] Today's revenue, fee and payment-method totals count a correction replacement as live money,
      matching what the date-range financial report already does at `backend/routes/reports.js:239`.
- [ ] Superseded and cancelled rows stay excluded, so an edit never double-counts.
- [ ] 🔴 **The permanent archive is corrected too.** `POST /reports/end-day`
      (`backend/routes/reports.js:456`) writes the day's row into `daily_summaries` counting live rows
      only, so every edited transaction is missing from the archived record **forever**. It is live —
      called from `web-app/api.js:499` via `web-app/shared.js:586-597` and `web-app/summary.html:515`.
      Fixing the screen and leaving the archive wrong moves the defect into the books a manager would
      audit months later.
- [ ] The daily per-masseuse report (`backend/routes/reports.js:63`) is corrected with the same
      predicate.
- **Validation:** for a day containing a transaction edited from 399 to 798, today's summary reports
  798 and excludes 399; **and** closing the day archives 798 into `daily_summaries`, not zero;
  **and** the daily per-masseuse report (`backend/routes/reports.js:63`) credits her with 798 —
  satisfies AC-004. The third assertion is here because the previous step proved the danger: its
  criterion named only two of its four readers, so an implementation could have satisfied it in full
  while leaving a reader untouched. Every reader named in the objectives gets an assertion. Both observed failing beforehand, where the day reports zero for that customer.
  The cross-report agreement assertion lives in ETSC-MONEY-001, scoped there.
- **Risk notes:** the same admit-corrected-but-not-superseded care as the previous step. The existing
  date-range report is the reference implementation — match its treatment rather than inventing one.
- **Completion Notes:**

### STEP_ID: ETSC-CORE-002a — the audit-repair tool keys on the link — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [ ] The audit-integrity repair tool at `backend/routes/transactions.js:782-825` finds a superseding
      row by its link to the row it replaces, rather than by that row's status, so it keeps working if
      the status vocabulary is ever extended.
- [ ] A full backend search has been run for every other reader of the `CORRECTED` status, and each is
      either converted the same way or recorded as deliberately left alone with a reason.
- **Validation:** the repair tool relabels a superseded row that was wrongly left live, and leaves a
  correctly-formed chain untouched — satisfies AC-009. Observed failing on a fixture where the
  superseding row carries a status the current query does not match.
- **Risk notes:** this hardens the fraud control rather than changing behaviour. It is independent of
  the two steps above and may run concurrently with them — it shares no file with `ETSC-CORE-001`.
- **Completion Notes:**

### STEP_ID: ETSC-CORE-003 — an edit is all-or-nothing — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `tests/` — **expected to be test-only.** The edit path already wraps its work in one
  database transaction (`BEGIN IMMEDIATE` at `backend/routes/transactions.js:658`, `COMMIT` at `:754`,
  `ROLLBACK` at `:771`), with both the relabel and the insert inside that span. If the implementer
  finds a real escape path, this step gains production code and records the divergence.
- [ ] The relabel of the superseded row and the insert of the replacement either both happen or
      neither does.
- [ ] After any number of successive edits, exactly one row in the chain counts as live work and live
      money; every earlier row is superseded and counts for neither.
- **Validation:** a forced failure part-way through an edit leaves the original live and no
  replacement row present; and two successive edits leave exactly one live row — satisfies AC-008.
- **Completion Notes:**

**Phase 1 complete when:**
- [ ] ETSC-CORE-001, ETSC-CORE-002, ETSC-CORE-002a and ETSC-CORE-003 are all `✅ DONE`
- [ ] `npx jest __tests__ tests/integration` shows **no new failures against the baseline recorded
      below**. Repo-root `npx jest` is NOT a usable gate: measured 2026-08-18 it is 67 failed / 41
      passed suites, because it sweeps Playwright specs that abort under Jest. Baseline for the
      usable subset, same date: `npx jest __tests__` = 1 failed / 169 passed tests, the single
      failure being `__tests__/nav.bilingual.present.test.js`, unrelated to this epic.
- [ ] A test asserting a superseded row is excluded from workload while its replacement is counted
      exists and passes — the double-count guard

**This gate authorizes Phase 2.**

---

## Phase 2 — Prove the reported symptom is gone — OPEN
**Phase goal:** the operator's actual symptom is covered by tests that fail on the old build.

### STEP_ID: ETSC-QUEUE-001 — a superseded row never counts, however many edits — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-001
- **Touches:** `__tests__/`
- **Why this is separate from the fix:** widening the readers to admit a correction replacement is
  one edit away from also admitting the superseded row it replaced. That would double a masseuse's
  workload on every edit and make her *less* available rather than more. This step is the guard.
- [ ] A superseded row contributes nothing to busy state or workload, and a cancelled row contributes
      nothing either.
- [ ] After two successive edits of the same customer, the masseuse's workload count is one, not
      three.
- [ ] A masseuse with one live correction replacement reads as busy for its duration, not for the
      superseded row's.
- **Validation:** the three assertions above pass — guards AC-001, AC-002 and AC-003 against the
  double-count failure mode. The two-successive-edits case must be built as a fixture, because it is
  the shape the operator actually reported: three rows for one customer.
- **Risk notes:** no production code is expected here. If an assertion cannot be made to pass by
  Phase 1's changes alone, the fix admitted too much — stop and narrow it rather than adding code.
- **Completion Notes:**

### STEP_ID: ETSC-MONEY-001 — the money is right and counted once — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `__tests__/`
- [ ] For a day containing an edited transaction **and no part-paid add-on**, today's summary and the
      date-range financial report return the same revenue total. The fixture must exclude part-paid
      add-ons: today's summary filters them out (`backend/routes/reports.js:204` applies the settled
      predicate) and the date-range report does not (`:239` has no such filter), so the two endpoints
      disagree by the value of any pending money for reasons that have nothing to do with editing.
      That divergence is a separate pre-existing defect — record it in Discoveries, do not fix it here.
- [ ] An edited transaction is counted once, not twice — the superseded row adds nothing.
- [ ] The masseuse's payday balance after an edit equals the edited fee, with the original reversed
      exactly once.
- **Validation:** all three assertions pass — satisfies AC-005 and AC-007, each seen failing
  beforehand. The count-once assertion is the money-side twin of the double-count guard in the
  previous step.
- **Risk notes:** this is the step that closes the theft window described at `ETSC-CORE-002`. A day
  containing an edit must never again report less than it took.
- **Completion Notes:**

**Phase 2 complete when:**
- [ ] ETSC-QUEUE-001 and ETSC-MONEY-001 are `✅ DONE`
- [ ] Every assertion in both steps has a recorded red-then-green observation
- [ ] A two-successive-edits fixture exists, matching the shape the operator reported

**This gate authorizes Phase 3.**

---

## Phase 3 — Remove the contradictory busy path — OPEN
**Phase goal:** one source of truth for whether a masseuse is busy.

### STEP_ID: ETSC-CLEAN-001 — reception stops writing the unread busy record — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-QUEUE-001
- **Touches:** `web-app/transaction.html`, `web-app/transaction.ejs`, `__tests__/`
- [ ] Reception's submit no longer writes a busy record that nothing reads; busy state derives from
      transactions only.
- [ ] Before removing anything, every consumer of the legacy busy columns has been searched for —
      including the expired-status reset job at `backend/routes/staff.js:309-396`. If a live consumer
      exists, this step narrows to removing only the intake call and the finding is recorded.
- **Validation:** submitting a customer still marks the masseuse busy for the service duration and
  advances the queue, with the set-busy call gone — no regression against AC-001 or AC-002.
- **Risk notes:** **this is cleanup, not repair, and it is the first thing to cut if the epic needs
  narrowing.** It serves no acceptance criterion directly; it exists because two contradictory busy
  systems are what made this defect hard to see. It also writes the intake page, which both other
  epics write — see the collision note at the top of this file.
- **Completion Notes:**

**Phase 3 complete when:**
- [ ] ETSC-CLEAN-001 is `✅ DONE`, or is explicitly marked cut with the reason recorded
- [ ] `npx jest __tests__ tests/integration` shows **no new failures against the baseline recorded
      below**. Repo-root `npx jest` is NOT a usable gate: measured 2026-08-18 it is 67 failed / 41
      passed suites, because it sweeps Playwright specs that abort under Jest. Baseline for the
      usable subset, same date: `npx jest __tests__` = 1 failed / 169 passed tests, the single
      failure being `__tests__/nav.bilingual.present.test.js`, unrelated to this epic.
- [ ] `web-app/transaction.html` and `web-app/transaction.ejs` remain in parity under the existing
      contract test

**This gate authorizes Phase 4.**

---

## Phase 4 — Verification & Hardening — OPEN
**Phase goal:** the lane's steps work together against real boundaries, and the fix is confirmed on
the live branch server.

### STEP_ID: ETSC-VERIFY-001 — end-to-end journeys through real boundaries — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-003, ETSC-QUEUE-001, ETSC-MONEY-001
- **Touches:** `__tests__/`
- [ ] Journey — record a customer, edit the duration, and confirm through the real handler and
      database that she stays busy for the edited duration and off the next-in-line slot.
- [ ] Journey — record a customer, edit the price, and confirm the day's summary reports the edited
      amount.
- [ ] Journey — record a customer, edit twice, and confirm the transaction list shows every
      superseded row with its edited marker and exactly one live row (AC-006).
- [ ] Journey — void an edited transaction and confirm the reversal reaches the replacement.
- [ ] At least one of these journeys has been observed failing against the pre-change build.
- **Validation:** all four journeys pass through the real handler and database, no mocks — satisfies
  AC-006 and integrates AC-001 through AC-009. Waits are bounded polling against a real condition,
  never a fixed sleep.
- **Completion Notes:**

### STEP_ID: ETSC-DEPLOY-001 — deploy to the branch server and operator live-verify — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-VERIFY-001
- **Touches:** no repo files — server checkout only
- [ ] **Gates first:** every FSM gate is green before anything is deployed. Only gate-passed code
      ever reaches a server.
- [ ] **Verify-push:** push this session's `claude/…` working branch, commit message flagged
      `live-verify test`. **No `testingNN` number is minted here** — numbers come only from a
      post-checkpoint `/push`. This push exists solely so the server can fetch the code.
- [ ] **Migrations first, via the protocol:** none required by this epic — no schema or data change.
      Record that explicitly rather than skipping the check.
- [ ] **State the rollback before touching anything:** name the previous branch and SHA the server is
      on, plus the restart command, in this step's evidence.
- [ ] **Restart rules:** `massage-shop.service` is a reader service and restarts freely. No writer or
      ingestor service is touched by this epic.
- [ ] **Health-check after:** service active, one read endpoint returns 200; record
      `LIVE = <branch>@<sha>` in the Completion Notes.
- [ ] **Live-verify — look, don't touch:** the operator edits one real transaction's duration and
      confirms the masseuse stays busy and off the next-in-line slot, and that the day's summary
      shows the edited amount. Read-only observation plus using the feature exactly as intended.
- **Validation:** the operator confirms both behaviours on the live branch server, recorded verbatim
  in the Completion Notes — satisfies AC-001, AC-002 and AC-004 against real data.
- **Risk notes:** broken at live-verify → fix, re-push the same working branch, re-verify. Do not
  mint a number on a failed verify.
- **Completion Notes:**

**Phase 4 complete when:**
- [ ] ETSC-VERIFY-001 and ETSC-DEPLOY-001 are `✅ DONE`
- [ ] `npx jest __tests__ tests/integration` shows **no new failures against the baseline recorded
      below**. Repo-root `npx jest` is NOT a usable gate: measured 2026-08-18 it is 67 failed / 41
      passed suites, because it sweeps Playwright specs that abort under Jest. Baseline for the
      usable subset, same date: `npx jest __tests__` = 1 failed / 169 passed tests, the single
      failure being `__tests__/nav.bilingual.present.test.js`, unrelated to this epic.
- [ ] **The operator has live-verified the edit behaviour on the branch server** — this condition
      requires human judgement and is a deliberate handover
- [ ] `LIVE = <branch>@<sha>` is recorded in ETSC-DEPLOY-001's Completion Notes

**This gate ends the epic.**

---

## Open Decisions
- **D-01 (ratified 2026-08-18, REVERSED from the original authoring):** the replacement row keeps
  the `CORRECTED` status and the **readers** are corrected instead. The original decision — write the
  replacement live — was made without reading
  `transaction-correction-operational-reversal.md`, which mandates that status at FR-003 and §6, and
  without noticing the audit-repair tool at `backend/routes/transactions.js:782-825` that matches on
  it. Writing replacements live would contradict a governed contract and silently disable a fraud
  control. Operator ruling 2026-08-18: the audit trail exists because a receptionist stole money, and
  both rows must remain in the ledger exactly as they are.
- **D-02 (ratified 2026-08-18):** no historic data is rewritten, and none needs to be. The
  date-range financial report already counted correction replacements
  (`backend/routes/reports.js:108`, `:147`, `:239`), so the historic record was never wrong there.
  Only the live daily summary was, and it is only viewable on the day itself — so there is nothing
  stranded to backfill. This supersedes the concern raised as Q-01 at authoring.

## Open Questions
- **Q-01 — RESOLVED 2026-08-18, blocks nothing** — asked whether past edited transactions needed
  correcting in the historic record. They do not: the date-range financial report already counted
  them (`backend/routes/reports.js:239`). Only the same-day summary was wrong, and that view does not
  persist. No backfill, no operator decision needed.

## Discoveries
- **ETSC-CORE-001 planning (2026-08-18):** the manager's staff dashboard has the same defect and is in
  no step of this epic. `backend/routes/admin.js:147`, `:151`, `:155` compute a staff member's
  transactions today, fees this week and massages this week filtering live rows only, and `:487` does
  the same for the performance report. So an edited transaction disappears from the manager's view of
  what a masseuse earned. **Payouts are unaffected** — those accrue on the staff table, which the edit
  path updates correctly (`backend/routes/transactions.js:683-686`, `:720-726`) — so this is a display
  discrepancy on the oversight surface, not a money error. **Not widened into this epic**; the
  operator schedules or declines it.
- **ETSC-CORE-001 planning (2026-08-18):** `GET /staff/performance/today` derives its date from UTC at
  `backend/routes/staff.js:702` and ignores the `?at=` clock pin every other endpoint in that file
  honours. Pre-existing, and it belongs to `daily-state-freshness-steps.md`, not here. It constrains
  how `backend/routes/staff.js:711` can be tested.
- **ETSC-CORE-001 planning (2026-08-18):** the step's Validation line does not reach two of its own
  objectives — it exercises busy state, next-in-line and workload count only, so an implementation
  changing `backend/routes/staff.js:41` and `:201` while leaving `:711` and `:755` untouched would
  pass it while failing objective 4 verbatim. **The test was strengthened rather than the criterion
  relaxed**: three assertions were added covering yesterday's commission, a two-successive-edits
  workload count, and that the predicate is imported rather than inlined.
- **Epic planning (2026-08-18):** the permanent daily archive is affected, not just the live screen.
  `POST /reports/end-day` (`backend/routes/reports.js:456`) writes `daily_summaries` counting live
  rows only, and it is live (`web-app/api.js:499`, `web-app/shared.js:586-597`,
  `web-app/summary.html:515`). Added to ETSC-CORE-002. Without it the epic would fix the screen and
  leave every edited transaction missing from the archived record permanently.
- **Epic planning (2026-08-18):** an edit distorts the NEXT day's queue order.
  `backend/routes/staff.js:755` computes `previous_day_commission` from live rows only and
  `:773` orders the roster by it. Added to ETSC-CORE-001.
- **Epic planning (2026-08-18):** two further money/fairness readers excluded corrected rows and were
  in no step — today's per-masseuse performance (`backend/routes/staff.js:711`) and the daily report
  (`backend/routes/reports.js:63`). Added to ETSC-CORE-001 and ETSC-CORE-002 respectively.
- **Epic planning (2026-08-18):** repo-root `npx jest` has no green baseline — 67 failed / 41 passed
  suites, all pre-existing, because it sweeps Playwright specs that abort under Jest. Every phase gate
  demanding "no failures" was unsatisfiable as authored and has been rewritten to a named subset plus
  a recorded baseline.
- **Epic planning (2026-08-18):** today's summary and the date-range financial report disagree by the
  value of any part-paid add-on, independently of editing — `backend/routes/reports.js:204` applies
  the settled-money filter and `:239` does not. **Pre-existing defect, out of scope here.** The
  cross-report assertion in ETSC-MONEY-001 is scoped around it rather than fixing it.
- **Epic planning (2026-08-18):** the edit path is already atomic (`BEGIN IMMEDIATE` at
  `backend/routes/transactions.js:658`), so ETSC-CORE-003 is expected to be test-only.
- **Epic planning (2026-08-18):** no test anywhere in the repo mentions the `CORRECTED` status. The
  status this whole epic turns on has zero coverage today, so every red-then-green observation here is
  genuinely new coverage rather than a modified assertion.

## Coverage
- **ETSC-001 (the live version is what counts) → ETSC-CORE-001** (availability and workload) and
  **ETSC-CORE-002** (the day's money)
- **ETSC-002 (lookups key on the link) → ETSC-CORE-002a**
- **ETSC-003 (one live row per chain) → ETSC-CORE-003, ETSC-QUEUE-001**
- **ETSC-004 (busy follows the edited duration) → ETSC-CORE-001, ETSC-QUEUE-001**
- **ETSC-005 (remove the dead busy path) → ETSC-CLEAN-001**
- **AC-001 → ETSC-CORE-001, ETSC-QUEUE-001, ETSC-VERIFY-001, ETSC-DEPLOY-001** ·
  **AC-002 → ETSC-CORE-001, ETSC-QUEUE-001, ETSC-VERIFY-001, ETSC-DEPLOY-001** ·
  **AC-003 → ETSC-CORE-001, ETSC-QUEUE-001** ·
  **AC-004 → ETSC-CORE-002, ETSC-MONEY-001, ETSC-DEPLOY-001** ·
  **AC-005 → ETSC-CORE-002, ETSC-MONEY-001** · **AC-006 → ETSC-VERIFY-001** ·
  **AC-007 → ETSC-MONEY-001** · **AC-008 → ETSC-CORE-003, ETSC-QUEUE-001** ·
  **AC-009 → ETSC-CORE-002a**
- **UNCOVERED:** none.
