# `backend/services/add-on-sql.js`

## 1. Header Section

SQL predicates for Paid Time Extension add-on rows. Single home for the two rules that linked add-on rows would otherwise get wrong in every aggregation site independently.

## 2. Module API & Logic Breakdown

*   **`countsAsMassage(alias = '')`**
    *   **Purpose:** Does this row count as a massage performed?
    *   **Returns:** SQL boolean fragment `(add_on_kind IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')` — true for an ordinary transaction or an `ADDITIONAL_SERVICE` add-on, false for a `DURATION_UPGRADE`, a `TIP` or a `MISC_INCOME` row.
    *   **Logic:** Extending one customer's session is one massage, not two; a second service is genuinely a second piece of work and must affect walk-in queue fairness. See feature spec `PTE-010`.
    *   **The rule is kind-driven, not parent-driven (`RIT-CONTRACT-002`, 2026-08-19).** It previously read `(parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')`. The parent test made *any* parentless row a massage, which would let a miscellaneous-income charge or a parentless tip inflate a masseuse's workload and queue position. Kind is what actually decides. See `reception-intake-truth-and-non-massage-income.md` FR-007 / AC-009 and its "Contract: countable massage (AMENDED)" block.
    *   **The change is behaviour-preserving for every row shape a database can hold today.** An ordinary massage has both columns `NULL`; the add-on route (`backend/routes/transactions.js:267-270`) rejects any `add_on_kind` outside its allow-list and requires a parent, so a row with a parent always has one of the two known kinds and a row without a parent always has `add_on_kind IS NULL`. Old and new predicates therefore agree on all three existing shapes. `TIP` and `MISC_INCOME` become writable only when `RIT-MONEY-001` widens that validator.

*   **`isSettled(alias = '')`**
    *   **Purpose:** Has the money actually arrived?
    *   **Returns:** SQL boolean fragment excluding `payment_status = 'PENDING'`.
    *   **Logic:** A pending add-on is work underway with payment still owed, so it must not reach revenue, fees, or payable staff pay until settled. Every pre-existing row defaults to `PAID`, so history is never reclassified. See feature spec `PTE-011`.

**`alias` is a table alias, never user input.** It is called only with hardcoded literals (`'t'`, `'t2'`, `''`) from route modules. It is interpolated rather than parameterised because a table alias cannot be bound as a SQL parameter; do not extend this helper to accept caller-supplied strings.

## 3. Dependency Mapping

*   **Consumed by:** `backend/routes/reports.js`, `backend/routes/staff.js`, `backend/routes/admin.js`.
*   **Consumes:** nothing — pure string helpers, no database access.

## 4. Testing & Verification

Behaviour is proven through the consumers in `tests/integration/paid-time-extension.integration.test.js`: a duration upgrade leaves counts unchanged, an additional service increments them by exactly one, and a pending add-on contributes no revenue until settled.

`countsAsMassage()` is additionally proven directly by `__tests__/add-on-sql.counts-as-massage.test.js`, which evaluates the fragment through SQLite against seeded rows and asserts all five contract verdicts in one test — ordinary massage counts, `ADDITIONAL_SERVICE` counts, `DURATION_UPGRADE` does not, `TIP` does not, parentless `MISC_INCOME` does not — so a change satisfying only the new kinds fails.
