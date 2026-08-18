# Tips and Miscellaneous Income — Feature Specification

**Status:** Ready for `/steps-file-creation`
**Authored:** 2026-08-18
**Prefix:** `TMI-xxx`

## 1. Executive Summary

### Feature Name
Tips and Miscellaneous Income

### Goal (ratified by operator, 2026-08-18)

> The app is replacing a paper income-and-expense book, so every baht in should be recordable as
> income and every baht out as an expense — including money that isn't a massage payment, like a tip
> or a tiger balm, and cash handed straight back out to a masseuse — with the tip still traceable to
> the person who got it.

The shop's books are a two-sided record of money in and money out. A tip taken on a card arrives as
income and leaves as cash within minutes; both movements must be visible and the net effect on
profit must be zero.

### Success Criteria (ratified by operator, 2026-08-18)

1. A 700 baht massage with a 100 baht tip shows **800 of income** for the day. *(machine)*
2. That same tip also shows **100 of expense**, so profit for the day is unchanged. *(machine)*
3. You can ask **what tips a masseuse received** on a given day and get the right number. *(machine)*
4. A tip **does not change her payday balance**. *(machine)*
5. A 50 baht tiger balm shows **50 of income, no expense**, and **does not count as a massage
   performed**, so it cannot push her down the queue. *(machine)*
6. You can record **income not attached to any massage at all**. *(machine)*
7. Reception can do all of this **without slowing down taking a customer in**. *(judgment — operator)*

### Chain Pointers
- **Planning map:** none — decided in one session.
- **Steps file:** not yet decomposed.
- **Co-located docs:** `web-app/transaction.html.md`, `web-app/transaction.ejs.md`,
  `backend/routes/transactions.js.md`, `web-app/summary.html.md`.

### Requirement Sources
- Operator interview, 2026-08-18 (goal + criteria ratified; assumptions confirmed).
- Read-only code mapping of the money model, this session (citations throughout).
- Existing add-on mechanism: `backend/services/add-on-sql.js`, spec `paid-time-extension.md`.

---

## 2. Scope Definition

### In Scope
- Recording a tip against a transaction, with the masseuse who received it.
- Recording the matching cash payout of that tip as an expense.
- Recording an extra charge on a transaction that is income only (tiger balm and similar).
- Recording standalone income not attached to any massage.
- Recording the payment method an expense was settled by.

### Out of Scope
- **Point-of-sale integration.** The operator raised connecting to card/Gowabi notification emails
  and text messages as hypothetical. It is a separate integration and nothing here depends on it.
- **Cash drawer / till tracking.** The manager explicitly does not want it. The app records income
  and expenses, not cash on hand.
- Splitting or pooling a tip between multiple staff. One tip goes to one named masseuse.
- Any change to how the per-massage commission accrues to the payday balance.

### Non-Goals
- This does not make the app reconcile a physical cash count.
- This does not change existing revenue, commission, or payday-balance behaviour for ordinary
  massages.

---

## 3. Existing System Impact Analysis

### Existing Components Affected

**`backend/services/add-on-sql.js`** — the single home for the "counts as a massage" and "money has
arrived" rules, deliberately centralised so roughly twenty aggregation sites cannot drift apart.
*Impact:* `countsAsMassage()` currently returns
`(parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')` (`add-on-sql.js:25`). A tip
or an extra charge must never count as a massage, and a standalone income row has no parent, so this
predicate must be extended to exclude non-massage kinds regardless of parent.
*Required modification:* extend the predicate in this one file. Do not touch the aggregation sites.

**`backend/routes/transactions.js`** — add-on creation currently rejects any kind other than a
duration upgrade or an additional service (`transactions.js:268`).
*Required modification:* accept the new non-massage kinds; write `masseuse_fee = 0` for them.

**`backend/models/database.js`** — `expenses` table has only `date`, `description`, `amount`,
`timestamp` (`database.js:102-109`).
*Required modification:* add masseuse attribution, payment method, a category, and an optional link
to the transaction the payout belongs to.

**`backend/routes/expenses.js`** — the create endpoint accepts only description, amount and date
(`expenses.js:24-48`).
*Required modification:* accept and persist the new fields.

**`web-app/transaction.html` and `web-app/transaction.ejs`** — reception intake. The two files are
byte-identical apart from two CSRF-token placeholders, and parity is enforced by a contract test.
*Required modification:* a way to add a tip or an extra charge. **Every change must be mirrored.**

**`web-app/summary.html` / `.ejs` and `web-app/admin-reports.html`** — daily totals.
*Required modification:* surface tips received per masseuse, and tip payouts in the expense side.

### Components Explicitly Unaffected
- `staff.total_fees_earned` / `total_fees_paid` accrual for ordinary massages
  (`transactions.js:720-726`).
- The `staff_payments` payout ledger (`database.js:144-155`).
- Booking credits (`database.js:236-245`).
- Service pricing and promotions.

### Regression Risks

| Cause | Impact | Mitigation |
|---|---|---|
| A tip or extra-charge row counted as a massage | The masseuse's workload count rises, so the walk-in queue wrongly sends her to the back — the same class of defect as the edited-transaction queue bug | Criterion 5 is a required test; extend `countsAsMassage()` in its single home only |
| A tip row carrying a non-zero commission | The tip silently accrues to the payday balance, double-paying her | Force `masseuse_fee = 0` for non-massage kinds; assert the payday balance is unchanged |
| The `.ejs` mirror not updated | Contract test fails, or the two intake pages diverge in production | Mirror every intake change; the existing parity test covers it |
| A tip counted as revenue but its payout never recorded | Profit overstated by the tip total | Criterion 2 requires the paired expense; the pairing is a single transaction (see TMI-004) |

---

## 4. Integration Architecture

### Upstream Dependencies
- `payment_methods` table (`database.js:92-99`) — admin-managed, free-text method names, no defaults
  seeded in code. **"Gowabi" does not exist in code**; whether it exists is a runtime data question.

### Downstream Dependencies
- `GET /reports/summary/today` and `GET /transactions/summary/today` — revenue and payment-method
  breakdown.
- `web-app/summary.html` — daily summary display.
- `GET /staff/roster` and `GET /staff/current-status` — consume the massage count that
  `countsAsMassage()` produces.

### Contracts
- `POST /transactions` — extended to accept the new non-massage add-on kinds.
- `POST /expenses` — extended to accept masseuse name, payment method, category, and transaction link.
- `GET /expenses` — returns the new fields.
- `countsAsMassage(alias)` — internal SQL predicate contract; its meaning is unchanged (*is this a
  massage performed?*), only its coverage widens.

---

## 5. Functional Requirements

### TMI-001: Non-massage income kinds

**Description.** Introduce income rows that are money in but not massage work: a `TIP` and a
`MISC_INCOME` (extra charges such as tiger balm, and standalone income).

**Trigger.** Reception records a tip or an extra charge, or a manager records standalone income.

**Processing logic.** These are rows in `transactions`, following the existing add-on pattern so
money aggregates with no query change. A tip or extra charge on a massage carries
`parent_transaction_id` pointing at the sale. Standalone income carries no parent.

**Outputs.** A transaction row with `add_on_kind` of `TIP` or `MISC_INCOME`, `masseuse_fee = 0`, and
its own `payment_method`.

**Failure modes.** Missing amount, missing payment method, unknown parent transaction — reject with
a clear message; write nothing.

**Edge cases.** A tip whose payment method differs from the massage's (massage on card, tip in cash)
is legal and must be recorded with its own method.

### TMI-002: Non-massage income never counts as a massage

**Description.** A tip or miscellaneous-income row must not affect queue fairness or any massage
count.

**Processing logic.** Extend `countsAsMassage()` in `backend/services/add-on-sql.js` so it excludes
rows whose `add_on_kind` is `TIP` or `MISC_INCOME`, **including rows with no parent**. The current
predicate treats any parentless row as a massage, which a standalone income row would wrongly satisfy.

**Outputs.** `today_massages` and walk-in priority ordering unchanged by any non-massage income row.

**Edge cases.** A standalone income row with no masseuse at all must not appear in any per-masseuse
count.

### TMI-003: Non-massage income never accrues to the payday balance

**Description.** The operator's rule: a tip is handed over in cash immediately, so nothing is owed.

**Processing logic.** Write `masseuse_fee = 0` on every `TIP` and `MISC_INCOME` row, so the existing
`UPDATE staff SET total_fees_earned = total_fees_earned + ?` (`transactions.js:720-726`) adds nothing.

**Outputs.** `staff.total_fees_earned` unchanged by a tip.

### TMI-004: A tip creates its payout expense in the same action

**Description.** Recording a tip records both sides — the income in and the cash out — as one
operation, so the two can never be entered inconsistently.

**Trigger.** Reception records a tip.

**Processing logic.** In one database transaction: insert the tip income row (TMI-001), and insert a
matching expense row carrying the same amount, the masseuse's name, a `TIP_PAYOUT` category, and a
link to the tip row. If either insert fails, neither is written.

**Outputs.** Income up by the tip; expenses up by the tip; profit unchanged.

**Failure modes.** Partial write is forbidden. On any failure the whole operation rolls back.

**Edge cases.** An extra charge that is not a tip (tiger balm) creates **no** expense row —
this is the distinction criterion 5 tests.

### TMI-005: Expenses carry attribution and payment method

**Description.** An expense must be able to say who it was paid to, how it was paid, what kind of
expense it is, and which transaction it relates to.

**Processing logic.** Extend the `expenses` table and `POST /expenses` with: `masseuse_name`
(nullable), `payment_method` (nullable), `category` (nullable, e.g. `TIP_PAYOUT`),
`related_transaction_id` (nullable). All nullable so existing rows and the existing expense form
keep working unchanged.

**Outputs.** Existing expense entry behaviour unchanged when the new fields are omitted.

### TMI-006: Standalone miscellaneous income

**Description.** A way to record income not attached to any massage.

**Trigger.** Manager records income from a product sale or any other source.

**Processing logic.** A `MISC_INCOME` transaction row with no parent and no masseuse requirement.
Excluded from massage counts by TMI-002.

**Outputs.** The day's income rises by the amount; no commission, no expense, no queue effect.

### TMI-007: Reporting

**Description.** Tips must be visible per masseuse and per day, and tip payouts visible on the
expense side.

**Processing logic.** Daily summary gains: tips received grouped by masseuse, and tip payouts within
the expense total. The existing payment-method revenue breakdown picks up non-massage income
automatically, because these are ordinary transaction rows.

**Outputs.** A manager can answer "what did she get in tips today" from the summary page.

---

## 6. Data Model Changes

### `transactions` (existing table, no schema change)
- **Ownership:** transactions subsystem.
- **Change:** two new permitted values for `add_on_kind` — `TIP` and `MISC_INCOME`. The column is
  already `TEXT` (`database.js:62`), so **no migration is required**.
- **Constraints:** `masseuse_fee = 0` for both kinds. `payment_method` required.
- **Relationships:** `parent_transaction_id` set for a tip or extra charge on a massage; null for
  standalone income.
- **Lifecycle:** same as any transaction row, including correction and void paths.

### `expenses` (existing table, additive migration)
- **Ownership:** expenses subsystem.
- **New fields:** `masseuse_name TEXT NULL`, `payment_method TEXT NULL`, `category TEXT NULL`,
  `related_transaction_id TEXT NULL`.
- **Constraints:** all nullable — existing rows remain valid and the existing expense form is
  unaffected.
- **Migration:** additive columns only, applied through the project's existing
  `addMissingColumns()` mechanism (`database.js:270`), which is how the staff fee totals were
  back-filled onto legacy databases.
- **Indexing:** index `(date, category)` if tip-payout reporting proves slow. Not required initially
  — daily row counts are small.

---

## 7. State Transitions

A tip row follows the same status lifecycle as any transaction (`ACTIVE`, `CORRECTED`, `EDITED`,
`CANCELLED`).

**Constraint inherited from the edited-transaction queue bug:** if a tip is edited or voided, its
paired payout expense must follow. Voiding a tip without reversing its payout would leave profit
understated. See `edited-transaction-queue-state.md` — that epic fixes the status handling this one
depends on.

---

## 8. Operational Considerations

- **Logging:** log both sides of a tip write with the amount, masseuse and payment method.
- **Security:** amounts must go through the existing input validation
  (`backend/middleware/input-validation.js`). Masseuse names reach the page through XSS-safe sinks
  only, matching the existing intake pattern.
- **Permissions:** unchanged. Reception records tips; the manager records standalone income.
- **Performance:** negligible — a handful of extra rows per day.

---

## 9. Rollout Plan

- **Deployment:** the project's standard numbered-branch publish and branch-server deploy.
- **Migration:** additive nullable columns on `expenses`; applied automatically at startup by the
  existing missing-column mechanism. No backfill needed.
- **Backward compatibility:** every existing query keeps working. Rows without the new kinds behave
  exactly as before.
- **Rollback:** revert the application code. The added columns are nullable and harmless if left in
  place.

---

## 10. Testing Requirements

- **Unit:** `countsAsMassage()` excludes both new kinds, with and without a parent.
- **Integration:** a tip write creates exactly two rows and rolls back entirely on failure.
- **Integration:** a tip leaves `staff.total_fees_earned` unchanged.
- **Integration:** an extra charge creates one row and no expense.
- **End-to-end:** 700 massage plus 100 tip yields 800 income, 100 expense, unchanged profit.
- **Regression:** the walk-in queue order is unchanged by a tip or an extra charge.
- **Regression:** the existing expense form still works with the new fields omitted.
- **Contract:** `transaction.html` and `transaction.ejs` stay in parity.

---

## 11. Risks and Assumptions

### Assumptions
- **User Confirmed** — the tip amount is known at reception when the transaction is recorded.
- **User Confirmed** — the tip money lands in the shop's account, so the shop fronts the cash.
- **User Confirmed** — one tip goes to one named masseuse; no pooling or splitting.
- **User Confirmed** — the tip never touches the payday balance.
- **User Confirmed** — point-of-sale integration and till tracking are out of scope.
- **Documented** — add-on rows aggregate into money totals with no query change
  (`add-on-sql.js:1-12`).
- **Documented** — `add_on_kind` is a free `TEXT` column, so new kinds need no migration
  (`database.js:62`).

### Risks

| Cause | Impact | Mitigation |
|---|---|---|
| "Gowabi" may not exist as a payment method in the live database | Reception cannot select it | Confirm live `payment_methods` rows before rollout; the admin page can add it without a code change |
| The paired write spans two tables | A crash between them corrupts the day's books | Single database transaction, all-or-nothing (TMI-004) |

### Open Questions
None. Every question raised in the interview was answered by the operator or decided here.

---

## 12. Acceptance Criteria

- **AC-001** *(criterion 1)* — A 700 massage plus a 100 tip yields 800 in the day's income total.
- **AC-002** *(criterion 2)* — The same tip yields 100 in the day's expense total, and the day's
  profit figure is identical to the same day without the tip.
- **AC-003** *(criterion 3)* — A per-masseuse tips-received figure for a given day returns the
  correct total.
- **AC-004** *(criterion 4)* — `staff.total_fees_earned` is byte-identical before and after a tip.
- **AC-005** *(criterion 5)* — A 50 extra charge yields 50 income, zero expense rows, and an
  unchanged `today_massages` count and unchanged walk-in queue order.
- **AC-006** *(criterion 6)* — A standalone income row with no parent raises the day's income and
  appears in no massage count.
- **AC-007** *(criterion 7, judgment)* — Operator confirms on the live branch server that recording
  a tip does not slow reception intake.
- **AC-008** *(guardrail)* — `transaction.html` and `transaction.ejs` remain in parity under the
  existing contract test.
- **AC-009** *(guardrail)* — A failure during the paired tip write leaves neither row behind.

### Goal coverage check
- **Every ratified criterion has a requirement behind it:** 1→TMI-001, 2→TMI-004, 3→TMI-007,
  4→TMI-003, 5→TMI-002, 6→TMI-006, 7→TMI-001/TMI-004 (intake flow). Clean.
- **Every requirement serves a criterion:** TMI-001→1/7, TMI-002→5, TMI-003→4, TMI-004→2,
  TMI-005→2/3 (attribution is what makes criterion 3 answerable), TMI-006→6, TMI-007→3. Clean.
- Both directions clean; no orphans in either.
