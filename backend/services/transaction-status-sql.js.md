# `backend/services/transaction-status-sql.js`

## 1. Header Section

SQL predicates for transaction *status*. Single home for the "is this transaction live work" rule, so the availability, workload, walk-in priority, today's revenue and today's customer-count queries cannot drift apart. Sibling of `add-on-sql.js`, which owns the orthogonal *add-on* rules (counting and settlement).

## 2. Module API & Logic Breakdown

*   **`isLiveWork(alias = '')`**
    *   **Purpose:** Does this transaction represent work that is happening now, or was genuinely performed?
    *   **Returns:** SQL boolean fragment — `status IN ('ACTIVE', 'CORRECTED')`, prefixed with the alias when one is given.
    *   **Logic:** `ACTIVE` is an ordinary live row. `CORRECTED` is the replacement row an edit creates, and it is a real completed massage — excluding it is the defect this contract exists to fix (`D-01`, the ratified decision that a corrected massage still counts). Everything else is not live work.
    *   **Why an allow-list, not a deny-list:** `transactions.status` is free `TEXT` (`backend/models/database.js:50`) and the correction workflow composes literals into it — `EDITED (Corrected by TX-…)` at `backend/routes/transactions.js:695`, and two different cancellation strings at `:502` and `:893`. There is no fixed vocabulary a deny-list could enumerate, so naming the two true values is the only form that stays correct when a new terminal status is invented. It also matches the existing partial unique index at `backend/models/database.js:359`, which already spells the live set the same way.
    *   **Edge case (FR-001):** a correction chain of any length yields exactly one live row — the original and every intermediate replacement carry an `EDITED (…)` status, only the final replacement is `CORRECTED`.

**`alias` is a table alias, never user input.** It is to be called only with hardcoded literals (`'t'`, `''`) from route modules. It is interpolated rather than parameterised because a table alias cannot be bound as a SQL parameter; do not extend this helper to accept caller-supplied strings.

**Applying it to a query with no `status` column fails loudly at test time** rather than silently returning everything — SQLite rejects the unknown column.

## 3. Dependency Mapping

*   **Consumed by:** nothing yet. This module is the shared contract Phase 0 of the reception-intake epic gates before its dependent steps; `RIT-LIVE-001` (`backend/routes/staff.js`) and `RIT-LIVE-002` (`backend/routes/reports.js`, `backend/routes/transactions.js`) are its first consumers.
*   **Not to be consumed by:** the date-range reports at `backend/routes/reports.js:108`, `:147`, `:168`, `:239`. They already spell the same set inline and are explicitly out of the epic's scope; changing them risks moving historical figures for no gain.
*   **Consumes:** nothing — a pure string helper with no database access.

## 4. Testing & Verification

`__tests__/transaction-status-sql.live-work.test.js` evaluates the fragment through SQLite against real seeded rows, never as a string. One test asserts all verdicts together — `ACTIVE` and `CORRECTED` in, the `EDITED (Corrected by TX-1)` original and both cancelled literals out — so a predicate returning a constant fails in either direction. Two further tests cover the aliased form and the two-consecutive-edits chain.

## 5. Notes for consumers

`transactions.status` carries no index. Adopting this predicate on a large today-scoped query is not expected to change the plan, because those queries already filter on `business_day` or `date` first — but a consuming step that makes status the leading filter should check the plan.
