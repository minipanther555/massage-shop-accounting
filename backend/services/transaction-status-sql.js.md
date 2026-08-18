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
*   **Consumes:** nothing — a pure string helper, no database access.
*   **Applied alongside, never instead of:** `countsAsMassage()` from `backend/services/add-on-sql.js` at `backend/routes/staff.js:43`. The two rules are independent — one asks whether the row is live, the other whether it is a distinct massage — and both must hold for a row to increment a workload count.

## 4. Testing & Verification

`tests/integration/edited-transaction-live-state.integration.test.js` proves the behaviour through the real handlers and database: a one-hour massage edited to two hours leaves the masseuse busy for the edited duration and off the next-in-line slot with her workload count intact; two successive edits leave a workload of one, not three; a cancelled row counts for nothing; yesterday's commission counts the corrected row once; and the predicate is imported from this module rather than inlined at each site.

## 5. Known Non-Consumers

`backend/routes/reports.js` and `backend/routes/transactions.js` carry live-row-only filters that belong to `ETSC-CORE-002` and are not converted by this module yet. `backend/routes/admin.js` carries seven more (`:147`, `:151`, `:155`, `:179`, `:487`, `:511`, `:514`); those are a manager-dashboard display discrepancy only — payouts accrue on the `staff` table through the edit path itself (`backend/routes/transactions.js:683-686`, `:720-726`) — and were deliberately left alone. Recorded as a Discovery in `00-project-docs/steps/edited-transaction-state-correctness-steps.md`.
