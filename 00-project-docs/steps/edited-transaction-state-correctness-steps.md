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
  `backend/routes/staff.js:41`, `:201`. **No change required here** once the written status is right.
- **Today's money (live):** reads only `ACTIVE` — `backend/routes/reports.js:24`, `:45`, `:204`,
  `:215`. **No change required here** for the same reason.
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

### STEP_ID: ETSC-CORE-001 — availability and workload recognise a corrected row as live — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/routes/staff.js`, `__tests__/`
- **Why the fix goes here and not in the write path:** the correction spec mandates that the
  replacement row is marked `CORRECTED` — `transaction-correction-operational-reversal.md` FR-003 and
  §6. Writing it live instead would contradict that governed contract **and** silently disable the
  audit-integrity repair tool at `backend/routes/transactions.js:782-825`, which finds superseded rows
  by looking for the `CORRECTED` status at `:799`. The audit trail is a fraud control; degrading it is
  not an acceptable cost. So the readers are corrected, not the writer.
- [ ] A masseuse's busy window derives from her live massage whether that massage is an original or a
      correction replacement.
- [ ] Her workload count includes a correction replacement, so an edit does not reset her queue
      position — this is `transaction-correction-operational-reversal.md` AC-003, which requires the
      replacement's workload effect to apply exactly once and which the current code does not honour.
- [ ] Superseded rows and cancelled rows remain excluded from both.
- **Validation:** after editing a one-hour massage to two hours, the masseuse reads as busy for the
  edited duration, is not offered as next in line, and keeps the workload count she had before the
  edit — satisfies AC-001, AC-002 and AC-003. All three observed failing on the pre-change build;
  this is the operator's reported symptom, so a test that never failed proves nothing.
- **Risk notes:** the predicate must admit a corrected row without admitting a superseded or cancelled
  one. Superseded rows carry a status beginning `EDITED`; cancelled rows one beginning `CANCELLED`.
  An implementation that widens to "not cancelled" would wrongly count superseded rows and double a
  masseuse's workload for every edit.
- **Completion Notes:**

### STEP_ID: ETSC-CORE-002 — the day's money counts a corrected row — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-001
- **Touches:** `backend/routes/reports.js`, `backend/routes/transactions.js`, `__tests__/`
- **Why this matters beyond tidiness:** an edited transaction currently contributes nothing to the
  day's revenue, because today's summary counts live rows only and after an edit neither row is live.
  A customer edited from 798 to 399 shows as **0** in the day's takings, so the cash the manager
  expects for that customer drops to nothing. The audit trail still shows the edit, but the headline
  number does not. **This is an open theft window, and it is the reason this step exists.**
- [ ] Today's revenue, fee and payment-method totals count a correction replacement as live money,
      matching what the date-range financial report already does at `backend/routes/reports.js:239`.
- [ ] Superseded and cancelled rows stay excluded, so an edit never double-counts.
- **Validation:** for a day containing a transaction edited from 399 to 798, today's summary reports
  798, excludes 399, and returns the same total as the date-range report for that day — satisfies
  AC-004 and AC-005. Both observed failing beforehand, where the day reports zero for that customer.
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
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [ ] The relabel of the superseded row and the insert of the replacement either both happen or
      neither does.
- [ ] After any number of successive edits, exactly one row in the chain counts as live work and live
      money; every earlier row is superseded and counts for neither.
- **Validation:** a forced failure part-way through an edit leaves the original live and no
  replacement row present; and two successive edits leave exactly one live row — satisfies AC-008.
- **Completion Notes:**

**Phase 1 complete when:**
- [ ] ETSC-CORE-001, ETSC-CORE-002, ETSC-CORE-002a and ETSC-CORE-003 are all `✅ DONE`
- [ ] `npx jest` passes with no failures
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
- [ ] For a day containing an edited transaction, today's summary and the date-range financial report
      return the same revenue total.
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
- [ ] `npx jest` passes with no failures
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
- [ ] `npx jest` passes with no failures
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
