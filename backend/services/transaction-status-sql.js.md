# `backend/services/transaction-status-sql.js`

## 1. Header Section

SQL predicate for transaction rows that count as live work and live money. Single home for the rule that every busy, workload, queue and money reader would otherwise get wrong independently after a transaction is edited.

An edit does not update a transaction in place. It relabels the original `EDITED (Corrected by <id>)` (`backend/routes/transactions.js:693-696`) and inserts a replacement carrying status `CORRECTED` (`:713`). **After an edit, neither row is `ACTIVE`.** Any reader filtering on `ACTIVE` alone therefore behaves as if the massage never happened — the masseuse reads as free mid-massage and sorts to the front of the walk-in queue, which is the operator's reported symptom of 2026-08-18.

## 2. Module API & Logic Breakdown

*   **`countsAsLiveWork(alias = '')`**
    *   **Purpose:** Does this row count as live work and live money?
    *   **Returns:** SQL boolean fragment — `status IN ('ACTIVE', 'CORRECTED')`, prefixed with the alias when one is given.
    *   **Logic:** True for an ordinary live transaction (`ACTIVE`) and for a correction replacement (`CORRECTED`). False for a superseded row (`EDITED (…)`) and a cancelled row (`CANCELLED (…)`), both of which are audit records only. See feature spec `ETSC-001`.

**It is an allowlist on purpose, and must never become a denylist.** A predicate written as "anything not cancelled" would also admit the superseded `EDITED` row alongside its replacement, doubling a masseuse's workload on every edit and pushing her further down the queue than before — a worse failure than the one being fixed. Naming what is admitted also means a status value added later is excluded by default, which is the safe direction. `tests/integration/edited-transaction-live-state.integration.test.js` asserts the fragment contains no `NOT LIKE` or `!=` form.

**The two admitted values are not this module's to choose.** The status vocabulary is fixed by `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md` FR-003 and §6. The same two-value list already appears at `backend/routes/reports.js:239` and in the unique booking index at `backend/models/database.js:359`; those were the reference implementations this module was matched to, and it introduced no new vocabulary.

**`alias` is a table alias, never user input.** It is called only with hardcoded literals (`'t'`, `''`) from route modules. It is interpolated rather than parameterised because a table alias cannot be bound as a SQL parameter; do not extend this helper to accept caller-supplied strings. This is the same constraint `backend/services/add-on-sql.js.md` records for its own helpers.

## 3. Dependency Mapping

*   **Consumed by:** `backend/routes/staff.js` — four sites: the workload count in `getActiveTodayStaff()` (`:42`), the busy window in `getActiveTransactionByStaff()` (`:202`), today's per-masseuse performance (`:712`), and yesterday's commission (`:756`), which orders tomorrow's roster via `ORDER BY previous_day_commission ASC` at `:773`.
*   **Consumed by:** `backend/routes/reports.js` — six money sites: the daily report's transaction summary (`:25`), payment breakdown (`:46`) and per-masseuse performance (`:64`); today's summary (`:205`) and its payment breakdown (`:216`); and the permanent end-day archive (`:457`).
*   **Consumed by:** `backend/routes/transactions.js` — five sites: the correction replacement picker's workload subquery (`:21`) and busy scan (`:29`) in `getCorrectionEligibleStaff()`; the audit-repair tool's superseded-row scan (`:817`), where it is an allowlist deciding which rows may be relabelled, so a cancelled row keeps its own reason string; and two money sites, the today-summary totals (`:958`) and its payment breakdown (`:969`).
*   **Consumes:** nothing — a pure string helper, no database access.
*   **Applied alongside, never instead of:** `countsAsMassage()` from `backend/services/add-on-sql.js` at `backend/routes/staff.js:43`. The two rules are independent — one asks whether the row is live, the other whether it is a distinct massage — and both must hold for a row to increment a workload count.

## 4. Testing & Verification

`tests/integration/edited-transaction-live-state.integration.test.js` proves the behaviour through the real handlers and database: a one-hour massage edited to two hours leaves the masseuse busy for the edited duration and off the next-in-line slot with her workload count intact; two successive edits leave a workload of one, not three; a cancelled row counts for nothing; yesterday's commission counts the corrected row once; and the predicate is imported from this module rather than inlined at each site.

`tests/integration/edited-transaction-day-money.integration.test.js` covers the money side, with **one assertion per reader** rather than per endpoint — a criterion naming only some readers is what let a partial fix pass twice in this epic. Six readers are pinned there; the seventh and eighth, the permanent end-day archive, are in `tests/integration/edited-transaction-end-day-archive.integration.test.js`, which needs its own database because `POST /reports/end-day` deletes the day's transaction rows and would empty any fixture it shared.

`tests/integration/superseded-row-never-counts.integration.test.js` is the **guard on the allowlist itself** (`ETSC-QUEUE-001`), and it is deliberately not a copy of the two specs above. Both of those build fixtures where a wrongly admitted superseded row would be invisible: their edit LENGTHENS the massage, and the busy window is the MAX end across live rows (`backend/routes/staff.js:208-213`), so the shorter superseded row changes no answer; and every superseded row there sits beside a live replacement for the same masseuse, so excluding it cannot be seen in busy state. This spec uses a SHORTENING edit, so a wrongly admitted superseded row moves `busy_until_iso` by an hour, and a masseuse holding a superseded row ALONE — reception corrected the wrong masseuse, so the replacement went to a colleague — who must read available while the colleague reads busy. It also pins the operator-visible cost of a double-count: a masseuse whose one massage was edited twice must still outrank a colleague who really did two, from a worse queue position.

Turning this helper into the denylist it warns about (`status NOT LIKE 'CANCELLED%'`) turns 7 of that spec's 8 assertions red, including `today_massages` reading 3 for one massage. The eighth is the plain cancelled-row assertion, which a denylist still satisfies — recorded rather than removed, because it is the only one of the eight that guards the cancelled half of the rule.

## 5. Known Non-Consumers

**Attribution matters here — being vague about which filter belongs to which step is how one gets missed.** An earlier version of this section said only that "`reports.js` and `transactions.js` carry live-row-only filters that belong to `ETSC-CORE-002`". That was wrong: `ETSC-CORE-002` is **money only**, and the sentence silently absorbed two filters it never covered.

*   ~~**`backend/routes/transactions.js:21` and `:29`**~~ — `getCorrectionEligibleStaff()`. **No longer a non-consumer: converted by `ETSC-CORE-002b` on 2026-08-18** and listed under Dependency Mapping above.
*   ~~**`backend/routes/transactions.js:791` and `:800`**~~ — the audit-integrity repair tool. **No longer a non-consumer: converted by `ETSC-CORE-002a` on 2026-08-18.** Both status-keyed matches were replaced by a join on `corrected_from_id`; the predecessor side now uses this predicate. See `backend/routes/transactions.js.md`.
*   **`backend/routes/admin.js`** — seven more (`:147`, `:151`, `:155`, `:179`, `:487`, `:511`, `:514`). A manager-dashboard **display** discrepancy only: payouts accrue on the `staff` table through the edit path itself (`backend/routes/transactions.js:683-686`, `:720-726`), so no money is wrong. Deliberately left alone; recorded as a Discovery in `00-project-docs/steps/edited-transaction-state-correctness-steps.md` for the operator to schedule or decline.
*   **The add-on and cancellation eligibility guards** in `backend/routes/transactions.js` (`:291`, `:437`, `:452`, `:494`, `:504`, `:878`, `:893`) and the **pending-add-on preservation subquery** in `backend/routes/reports.js` (`:485`, `:488`) are not consumers by design. They test a row's own lifecycle state, or select rows to rescue from deletion — neither aggregates money or work, and widening them would change contracts this module has nothing to do with.
