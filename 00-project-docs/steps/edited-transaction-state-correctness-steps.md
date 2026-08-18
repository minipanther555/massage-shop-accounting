# Edited Transaction State Correctness — Execution Steps

## Goal
After a transaction is edited, every part of the system agrees the edited version is the real one —
the masseuse's availability, her workload, the day's money, and the monthly report. Today an edit
writes a status that half the system does not recognise, so she reads as free mid-massage and her
money vanishes from the daily summary. Spec:
`00-project-docs/feature-specifications/edited-transaction-state-correctness.md`. Planning map: none.

> **Status:** OPEN — no steps started. Ship this epic FIRST of the three; it is the smallest and it is
> currently losing money from the daily summary.

> **Epic complete when:** Phase 4's gate is met — the verification journeys pass and the operator has
> live-verified an edit on the branch server.

## Scope (this lane)
- **Owns:** the status an edit writes to the replacement transaction row, every reader of that
  status, and the removal of the dead set-busy path in reception intake.
- **Does NOT own:** the intake refresh and overnight staleness defects — those belong to
  `daily-state-freshness-steps.md`. Tips and miscellaneous income belong to
  `tips-and-miscellaneous-income-steps.md`.

## ⚠️ Cross-epic file collisions — READ BEFORE RUNNING IN PARALLEL
Three epics are in flight. Two files are **written by all three**:
- `web-app/transaction.html` and its `.ejs` mirror — this lane writes it at `ETSC-CLEAN-001`.
- `backend/routes/transactions.js` — this lane writes it at `ETSC-CORE-001`, `-002`, `-003`.

`daily-state-freshness-steps.md` and `tips-and-miscellaneous-income-steps.md` write both files too.
**Running those two epics concurrently with this one will conflict on merge.** This lane is the
shortest; finishing it first and rebasing the other two onto it is the cheapest ordering.

This lane does **not** write `backend/routes/reports.js`. It changes which status is *written*, so
the existing `status = 'ACTIVE'` queries there start matching edited transactions with no edit to
that file. The freshness lane does rewrite those same query lines, for an unrelated reason (the day
column). The two changes are compatible in either order.

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
- 🔴 One reader keys on the retiring status: `backend/routes/transactions.js:799` selects
  `WHERE corrected_from_id = ? AND status = "CORRECTED"`. It must be converted before the status
  changes, or the void path silently finds nothing.
- The unique booking index covers `status IN ('ACTIVE','CORRECTED')` —
  `backend/models/database.js:359`. With the original relabelled `EDITED`, one row remains in the
  index either way.
- Reception calls a set-busy endpoint after every submit — `web-app/transaction.html:1473` — which
  writes `staff_roster.status` and `busy_until` (`backend/routes/staff.js:660-664`). **Nothing reads
  it**: the roster query hardcodes `NULL AS busy_until` — `backend/routes/staff.js:35`.

---

## Phase 1 — Make the live row recognisable — OPEN
**Phase goal:** after an edit, exactly one row in the chain carries the live status, every existing
reader finds it, and no reader depends on the retiring status.

### STEP_ID: ETSC-CORE-001 — replacement lookups key on the link, not the status — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- **Why this is first (prefactor):** keying on `corrected_from_id` works under today's behaviour as
  well as tomorrow's, so this lands safely before the status changes. Doing it after would leave a
  window where the void path cannot find a replacement.
- [ ] A replacement transaction is found by its link to the row it replaced, without reference to the
      transaction's status.
- [ ] A full backend search has been run for any other reader of the `CORRECTED` status, and every
      one found is converted the same way or recorded as deliberately left alone with a reason.
- **Validation:** voiding a transaction that has been edited resolves its replacement and reverses
  it — satisfies AC-009. The test must be observed failing against a build where the status has
  already been changed but the lookup has not, proving it actually guards the ordering.
- **Risk notes:** this is the shared-contract step of the lane. `ETSC-CORE-002` must not start until
  it is `✅ DONE`.
- **Completion Notes:**

### STEP_ID: ETSC-CORE-002 — an edit writes a live transaction row — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-001
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [ ] The replacement row an edit inserts carries the live status, so busy, workload, queue, today's
      money and the date-range report all see it with no change to any of those queries.
- [ ] The superseded row still carries its edited marker naming the replacement, so the audit trail
      is unchanged.
- **Validation:** after editing a 399 baht transaction to 798, today's income includes 798 and
  excludes 399, and the date-range report for the same day returns the identical total — satisfies
  AC-004 and AC-005. Both assertions must be seen failing on the pre-change build.
- **Risk notes:** the date-range report already accepts both statuses, so it must not double-count;
  the superseded row's edited marker is what keeps it out.
- **Completion Notes:**

### STEP_ID: ETSC-CORE-003 — an edit is all-or-nothing — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [ ] The relabel of the superseded row and the insert of the replacement either both happen or
      neither does.
- [ ] After any number of successive edits, exactly one row in the chain is live.
- **Validation:** a forced failure part-way through an edit leaves the original live and no
  replacement row present; and two successive edits leave exactly one live row — satisfies AC-008.
- **Completion Notes:**

**Phase 1 complete when:**
- [ ] ETSC-CORE-001, ETSC-CORE-002 and ETSC-CORE-003 are all `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] No backend source file matches a query filtering on the retiring `CORRECTED` status except
      where a Completion Note records a deliberate exception

**This gate authorizes Phase 2.**

---

## Phase 2 — Prove the reported symptom is gone — OPEN
**Phase goal:** the operator's actual symptom is covered by tests that fail on the old build.

### STEP_ID: ETSC-QUEUE-001 — availability and queue position follow the edited massage — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `__tests__/`
- [ ] A masseuse whose massage was edited from one hour to two reads as busy for the edited
      duration, is not offered as next in line while it runs, and keeps the workload count she had
      before the edit.
- **Validation:** the three assertions above pass — satisfies AC-001, AC-002 and AC-003. Each must be
  observed failing on the pre-change build; this is the operator's reported symptom, so a test that
  never failed proves nothing.
- **Risk notes:** no production code is expected here. If any assertion cannot be made to pass by the
  Phase 1 changes alone, the root cause was incompletely understood — stop and reconcile the spec
  rather than adding code to force it green.
- **Completion Notes:**

### STEP_ID: ETSC-MONEY-001 — the two report families agree — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `__tests__/`
- [ ] For a day containing an edited transaction, today's summary and the date-range report return
      the same revenue total.
- [ ] The masseuse's payday balance after an edit equals the edited fee, with the original reversed
      exactly once.
- **Validation:** both assertions pass — satisfies AC-005 and AC-007, each seen failing beforehand.
- **Completion Notes:**

**Phase 2 complete when:**
- [ ] ETSC-QUEUE-001 and ETSC-MONEY-001 are `✅ DONE`
- [ ] Every assertion in both steps has a recorded red-then-green observation

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
- **D-01 (ratified):** the replacement row carries the live status, rather than widening roughly
  fifteen queries to accept the retiring one. Rationale in spec §5 — this codebase already
  centralised exactly this class of rule to stop it drifting.
- **D-02 (ratified):** historic rows already carrying the retiring status are not rewritten. Past
  daily summaries stay understated; correcting finished books is the operator's call.

## Open Questions
- **Q-01 — blocks: none** — should past edited transactions be corrected in the historic record?
  Rewriting finished books is an operator decision and blocks nothing in this epic.

## Discoveries

## Coverage
- **ETSC-001 (live row after an edit) → ETSC-CORE-002**
- **ETSC-002 (lookups key on the link) → ETSC-CORE-001**
- **ETSC-003 (one live row per chain) → ETSC-CORE-003**
- **ETSC-004 (busy follows edited duration) → ETSC-QUEUE-001**
- **ETSC-005 (remove the dead busy path) → ETSC-CLEAN-001**
- **AC-001 → ETSC-QUEUE-001, ETSC-VERIFY-001, ETSC-DEPLOY-001** · **AC-002 → ETSC-QUEUE-001,
  ETSC-VERIFY-001, ETSC-DEPLOY-001** · **AC-003 → ETSC-QUEUE-001** · **AC-004 → ETSC-CORE-002,
  ETSC-DEPLOY-001** · **AC-005 → ETSC-CORE-002, ETSC-MONEY-001** · **AC-006 → ETSC-VERIFY-001** ·
  **AC-007 → ETSC-MONEY-001** · **AC-008 → ETSC-CORE-003** · **AC-009 → ETSC-CORE-001**
- **UNCOVERED:** none.
