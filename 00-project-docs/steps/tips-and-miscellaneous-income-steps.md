# Tips and Miscellaneous Income — Execution Steps

## Goal
Every baht in is recordable as income and every baht out as an expense — including money that is not
a massage payment, like a tip or a tiger balm, and cash handed straight back out to a masseuse — with
the tip still traceable to the person who got it. A card tip goes in as income and out as an expense,
nets to zero on profit, and both movements stay visible. Spec:
`00-project-docs/feature-specifications/tips-and-miscellaneous-income.md`. Planning map: none.

> **Status:** OPEN — no steps started. Ship AFTER
> `edited-transaction-state-correctness-steps.md`; a tip that is later edited or voided depends on
> that epic's status handling being correct first.

> **Epic complete when:** Phase 4's gate is met — the verification journeys pass and the operator has
> live-verified recording a tip on the branch server.

## Scope (this lane)
- **Owns:** the non-massage income kinds, their exclusion from massage counts and from the payday
  balance, the paired tip payout, expense attribution, standalone income, the reception surface for
  recording them, and the reporting that makes tips visible per masseuse.
- **Does NOT own:** the edited-transaction defect — that belongs to
  `edited-transaction-state-correctness-steps.md`. The intake refresh and overnight staleness belong
  to `daily-state-freshness-steps.md`. This lane does not add point-of-sale integration and does not
  add cash-drawer or till tracking.

## ⚠️ Cross-epic file collisions — READ BEFORE RUNNING IN PARALLEL
Three epics are in flight. Two files are **written by all three**:
- `web-app/transaction.html` and its `.ejs` mirror — this lane writes it at `TMI-UI-001`.
- `backend/routes/transactions.js` — this lane writes it at `TMI-INCOME-001`, `-002` and `-003`.

`edited-transaction-state-correctness-steps.md` and `daily-state-freshness-steps.md` write both files
too. **Running this epic concurrently with either will conflict on merge.** Land the
edited-transaction epic first — this lane also has a real ordering dependency on it, not just a
textual one: an edited or voided tip must reach its paired payout, which needs that epic's
replacement-row handling to be correct.

## Dependencies
- **Add-on mechanism (live):** add-on rows are ordinary rows in `transactions` linked by
  `parent_transaction_id`, which makes money aggregate correctly with no query change —
  `backend/services/add-on-sql.js:1-12`. This lane extends that pattern rather than inventing one.
- **Payment methods (live, runtime data):** an admin-managed table with no defaults seeded in code —
  `backend/models/database.js:92-99`. **"Gowabi" does not exist anywhere in code**; whether it exists
  is a live-data question, resolved at `TMI-DEPLOY-001`.
- **Payday balance (live, must not move):** a transaction's commission accrues via
  `UPDATE staff SET total_fees_earned = total_fees_earned + ?` —
  `backend/routes/transactions.js:720-726`.
- **Expenses (live):** the create endpoint accepts only description, amount and date —
  `backend/routes/expenses.js:24-48`.
- Invariant: existing expense entry keeps working unchanged when the new fields are omitted.
- Invariant: ordinary massages keep their existing revenue, commission and payday-balance behaviour.

---

## Verified source status (read the code, 2026-08-18 CFEP)
- **No tip or gratuity concept exists anywhere** in `web-app/` or `backend/`. Entirely net-new.
- `add_on_kind` is a free `TEXT` column — `backend/models/database.js:62` — so **new kinds need no
  migration**. The create path currently rejects anything but the two existing kinds —
  `backend/routes/transactions.js:268`.
- 🔴 **The counts-as-a-massage rule treats any row without a parent as a massage** —
  `backend/services/add-on-sql.js:25`
  (`parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE'`). A standalone income row
  has no parent, so it would wrongly count as a massage, inflate the masseuse's workload and push her
  down the walk-in queue. This is the same class of defect the edited-transaction epic is fixing, and
  it must not be re-created here.
- The existing additional-service kind **deliberately does** count as a massage —
  `backend/services/add-on-sql.js:17-25` — so it must not be reused for a tip or a product sale.
- The owed-balance ledger exists: `total_fees_earned` and `total_fees_paid` —
  `backend/models/database.js:164-165`; outstanding is derived as earned minus paid —
  `backend/routes/admin.js:135`. **The operator has excluded this path for tips**, which are handed
  over in cash immediately.
- The `expenses` table has only date, description, amount and timestamps —
  `backend/models/database.js:102-109`.
- Legacy databases gain new columns at startup through `addMissingColumns()` —
  `backend/models/database.js:270`, `:287-288`. This is the mechanism the expense migration uses.
- The daily summary already breaks revenue down by payment method —
  `backend/routes/transactions.js:940-950`, `backend/routes/reports.js:41-46` — so non-massage income
  appears there automatically once it is an ordinary transaction row.

---

## Phase 1 — Shared contracts, gated before anything depends on them — OPEN
**Phase goal:** the counts-as-a-massage rule and the expense record can carry this feature, before
any feature step relies on them.

### STEP_ID: TMI-CONTRACT-001 — non-massage income never counts as a massage — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/services/add-on-sql.js`, `__tests__/`
- **Why this is first (shared contract):** this predicate is the single home for a rule roughly
  twenty aggregation sites depend on. Changing it once, here, is what stops those sites drifting —
  and every income step in Phase 2 depends on it already being right.
- [ ] A transaction row marked as a tip or as miscellaneous income is excluded from the
      counts-as-a-massage rule, **including when it has no parent row**.
- [ ] The existing kinds keep their current behaviour: a duration upgrade still does not count as a
      massage, an additional service still does.
- **Validation:** the predicate excludes both new kinds with and without a parent, and returns
  unchanged results for the two existing kinds and for ordinary transactions — satisfies AC-005 in
  part. Observed failing beforehand on the no-parent case, which today counts as a massage.
- **Risk notes:** this is the shared-contract step of the lane. `TMI-INCOME-001` and everything after
  it must not start until this is `✅ DONE`. Getting it wrong re-creates the queue defect the
  edited-transaction epic exists to fix.
- **Completion Notes:**

### STEP_ID: TMI-CONTRACT-002 — an expense can say who, how and why — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/models/database.js`, `backend/routes/expenses.js`, `__tests__/`
- [ ] An expense can carry the masseuse it was paid to, the method it was paid by, a category, and a
      link to the transaction it relates to — every one of them optional.
- [ ] Recording an expense with none of the new fields behaves exactly as it does today, and existing
      rows remain valid.
- **Validation:** an expense created with only description, amount and date succeeds and reads back
  identically to today; an expense created with all new fields reads them back — satisfies AC-002 and
  AC-003 in part.
- **Risk notes:** additive nullable columns only, applied through the existing startup mechanism at
  `backend/models/database.js:270`. No backfill. Shared contract: `TMI-INCOME-002` depends on it.
- **Completion Notes:**

**Phase 1 complete when:**
- [ ] TMI-CONTRACT-001 and TMI-CONTRACT-002 are `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] A test asserting a parentless non-massage row is excluded from massage counts exists and passes

**This gate authorizes Phase 2.**

---

## Phase 2 — Money in, money out — OPEN
**Phase goal:** the three kinds of non-massage money can be recorded correctly through the API.

### STEP_ID: TMI-INCOME-001 — a tip or extra charge can be recorded against a massage — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** TMI-CONTRACT-001
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [ ] A tip or an extra charge can be recorded against an existing sale, carrying its own amount and
      its own payment method, which may differ from the massage's.
- [ ] Both kinds record a zero commission, so the masseuse's payday balance does not move.
- [ ] A missing amount, a missing payment method, or an unknown parent sale is rejected with a clear
      message and nothing is written.
- **Validation:** recording a 100 tip on a 700 massage raises the day's income to 800, and
  `total_fees_earned` is byte-identical before and after — satisfies AC-001 and AC-004. Both observed
  failing beforehand, where the request is rejected outright.
- **Completion Notes:**

### STEP_ID: TMI-INCOME-002 — a tip records its payout in the same action — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** TMI-INCOME-001, TMI-CONTRACT-002
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [ ] Recording a tip writes both the income and the matching cash-out expense as one operation, with
      the expense carrying the masseuse, the amount, a tip-payout category and a link to the tip.
- [ ] If either write fails, neither is left behind.
- [ ] An extra charge that is not a tip writes **no** expense.
- **Validation:** a 100 tip produces a 100 expense and leaves the day's profit identical to the same
  day without the tip; a forced failure part-way leaves neither row — satisfies AC-002 and AC-009.
- **Risk notes:** this is the pairing that keeps the books honest. A tip recorded as income with no
  payout overstates profit by the tip; the all-or-nothing write is what prevents it.
- **Completion Notes:**

### STEP_ID: TMI-INCOME-003 — income with no massage behind it — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** TMI-INCOME-001
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [ ] Income can be recorded that is attached to no massage and requires no masseuse.
- [ ] It raises the day's income, creates no expense, accrues no commission, and appears in no
      massage count.
- **Validation:** a standalone income row raises the day's income and leaves every masseuse's
  workload count and the walk-in queue order unchanged — satisfies AC-006. Observed failing
  beforehand, where such a row would count as a massage.
- **Risk notes:** this is the case `TMI-CONTRACT-001` exists for. If it passes without that step, the
  predicate change was not actually exercised.
- **Completion Notes:**

**Phase 2 complete when:**
- [ ] TMI-INCOME-001, TMI-INCOME-002 and TMI-INCOME-003 are all `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] A test asserting the walk-in queue order is unchanged by a tip, an extra charge and a
      standalone income row exists and passes

**This gate authorizes Phase 3.**

---

## Phase 3 — Reception and reporting — OPEN
**Phase goal:** the shop can actually use it, and the manager can see it.

### STEP_ID: TMI-UI-001 — reception can record a tip or an extra charge — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** TMI-INCOME-002
- **Touches:** `web-app/transaction.html`, `web-app/transaction.ejs`, `__tests__/`
- [ ] Reception can record a tip against a customer's massage, choosing the amount and the payment
      method it came in by.
- [ ] Reception can record an extra charge that is income only, with no payout.
- [ ] The intake page and its `.ejs` mirror receive the identical change.
- **Validation:** the existing parity contract test passes across both intake files, and a runtime
  test confirms recording a tip through the page produces the paired income and expense — satisfies
  AC-008 and exercises AC-001 and AC-002 through the real surface.
- **Risk notes:** **this file is written by both other epics** — see the collision note at the top.
  It is also the step whose speed the operator judges at AC-007, so the flow must not add steps to an
  ordinary customer with no tip.
- **Completion Notes:**

### STEP_ID: TMI-REPORT-001 — tips are visible per masseuse and per day — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** TMI-INCOME-002
- **Touches:** `web-app/summary.html`, `web-app/summary.ejs`, `backend/routes/reports.js`,
  `__tests__/`
- [ ] The daily summary shows tips received grouped by masseuse.
- [ ] Tip payouts are visible within the day's expense total.
- **Validation:** asking what a given masseuse received in tips on a given day returns the correct
  total — satisfies AC-003.
- **Risk notes:** `backend/routes/reports.js` is also written by
  `daily-state-freshness-steps.md`. Check that lane's status before starting.
- **Completion Notes:**

**Phase 3 complete when:**
- [ ] TMI-UI-001 and TMI-REPORT-001 are `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] `web-app/transaction.html` and `web-app/transaction.ejs` remain in parity under the existing
      contract test

**This gate authorizes Phase 4.**

---

## Phase 4 — Verification & Hardening — OPEN
**Phase goal:** the lane's steps work together, and the operator confirms the flow on real data.

### STEP_ID: TMI-VERIFY-001 — end-to-end journeys through real boundaries — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** TMI-UI-001, TMI-REPORT-001
- **Touches:** `__tests__/`
- [ ] Journey — a 700 massage plus a 100 tip yields 800 income, 100 expense and unchanged profit
      (AC-001, AC-002).
- [ ] Journey — the same tip leaves the payday balance untouched and is retrievable per masseuse
      (AC-003, AC-004).
- [ ] Journey — a 50 extra charge yields 50 income, no expense, an unchanged workload count and an
      unchanged queue order (AC-005).
- [ ] Journey — standalone income raises the day's income and appears in no massage count (AC-006).
- [ ] Journey — an ordinary massage with no tip behaves exactly as it does today (regression).
- [ ] At least one journey has been observed failing against the pre-change build.
- **Validation:** all five journeys pass through the real handler and database, no mocks. Waits are
  bounded polling against a real condition, never a fixed sleep.
- **Completion Notes:**

### STEP_ID: TMI-DEPLOY-001 — deploy to the branch server and operator live-verify — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** TMI-VERIFY-001
- **Touches:** no repo files — server checkout only
- [ ] **Gates first:** every FSM gate is green before anything is deployed. Only gate-passed code
      ever reaches a server.
- [ ] **Verify-push:** push this session's `claude/…` working branch, commit message flagged
      `live-verify test`. **No `testingNN` number is minted here** — numbers come only from a
      post-checkpoint `/push`. This push exists solely so the server can fetch the code.
- [ ] **Migrations first, via the protocol:** this epic adds nullable columns to the expenses table.
      They apply through the existing startup mechanism rather than a hand-written migration; confirm
      they landed on the branch server's database **before** the code that reads them is exercised,
      and record the confirmation. Any deviation routes to `/db-ops-regular` rather than inline SQL.
- [ ] **State the rollback before touching anything:** name the previous branch and SHA the server is
      on, plus the restart command, in this step's evidence. The added columns are nullable and
      harmless if left in place after a code rollback.
- [ ] **Restart rules:** `massage-shop.service` is a reader service and restarts freely. No writer or
      ingestor service is touched by this epic.
- [ ] **Health-check after:** service active, one read endpoint returns 200; record
      `LIVE = <branch>@<sha>` in the Completion Notes.
- [ ] **Confirm the payment methods that actually exist** in the branch server's database, since
      "Gowabi" appears nowhere in code and may need adding through the manager pages. Record what is
      present. This needs no code change either way.
- [ ] **Live-verify — look, don't touch:** the operator records one real tip and confirms the day's
      income rises by the tip, the day's expenses rise by the same amount, profit is unchanged, and
      the tip shows against the right masseuse. Read-only observation plus using the feature exactly
      as intended.
- [ ] **Operator judgement on speed:** the operator confirms that recording a tip does not slow down
      taking a customer in (AC-007).
- **Validation:** the operator confirms the income, the expense, the unchanged profit, the masseuse
  attribution and the intake speed on the live branch server, each recorded verbatim in the
  Completion Notes — satisfies AC-001, AC-002, AC-003 and AC-007 against real data.
- **Risk notes:** broken at live-verify → fix, re-push the same working branch, re-verify. Do not
  mint a number on a failed verify.
- **Completion Notes:**

**Phase 4 complete when:**
- [ ] TMI-VERIFY-001 and TMI-DEPLOY-001 are `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] **The operator has live-verified a real tip and judged the intake speed acceptable** — this
      condition requires human judgement and is a deliberate handover
- [ ] `LIVE = <branch>@<sha>` is recorded in TMI-DEPLOY-001's Completion Notes

**This gate ends the epic.**

---

## Open Decisions
- **D-01 (ratified):** a tip is income **and** an expense, netting to zero on profit, with both
  movements visible. Not excluded from income.
- **D-02 (ratified):** a tip is handed over in cash immediately and never accrues to the payday
  balance.
- **D-03 (ratified):** one tip goes to one named masseuse. No pooling or splitting.
- **D-04 (ratified):** built on the existing add-on pattern, because add-on rows already aggregate
  into money totals with no query change.
- **D-05 (ratified):** point-of-sale integration through card and booking-platform notifications is
  out of scope.
- **D-06 (ratified):** cash-drawer and till tracking are out of scope; the manager does not want them.
- **D-07 (ratified):** miscellaneous income lives in this epic, because a tip is one case of it.

## Open Questions
- **Q-01 — blocks: none** — whether "Gowabi" exists as a payment method in the branch server's live
  database. It is admin-editable data, needs no code change either way, and is resolved during
  `TMI-DEPLOY-001`.

## Discoveries

## Coverage
- **TMI-001 (non-massage income kinds) → TMI-INCOME-001**
- **TMI-002 (never counts as a massage) → TMI-CONTRACT-001**
- **TMI-003 (never accrues to payday) → TMI-INCOME-001**
- **TMI-004 (paired payout) → TMI-INCOME-002**
- **TMI-005 (expense attribution) → TMI-CONTRACT-002**
- **TMI-006 (standalone income) → TMI-INCOME-003**
- **TMI-007 (reporting) → TMI-REPORT-001**
- **AC-001 → TMI-INCOME-001, TMI-VERIFY-001, TMI-DEPLOY-001** · **AC-002 → TMI-INCOME-002,
  TMI-VERIFY-001, TMI-DEPLOY-001** · **AC-003 → TMI-REPORT-001, TMI-VERIFY-001, TMI-DEPLOY-001** ·
  **AC-004 → TMI-INCOME-001, TMI-VERIFY-001** · **AC-005 → TMI-CONTRACT-001, TMI-VERIFY-001** ·
  **AC-006 → TMI-INCOME-003, TMI-VERIFY-001** · **AC-007 → TMI-DEPLOY-001** ·
  **AC-008 → TMI-UI-001** · **AC-009 → TMI-INCOME-002**
- **UNCOVERED:** none.
