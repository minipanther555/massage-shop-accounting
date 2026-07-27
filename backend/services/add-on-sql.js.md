# `backend/services/add-on-sql.js`

## 1. Header Section

SQL predicates for Paid Time Extension add-on rows. Single home for the two rules that linked add-on rows would otherwise get wrong in every aggregation site independently.

## 2. Module API & Logic Breakdown

*   **`countsAsMassage(alias = '')`**
    *   **Purpose:** Does this row count as a massage performed?
    *   **Returns:** SQL boolean fragment — true for an ordinary transaction or an `ADDITIONAL_SERVICE` add-on, false for a `DURATION_UPGRADE`.
    *   **Logic:** Extending one customer's session is one massage, not two; a second service is genuinely a second piece of work and must affect walk-in queue fairness. See feature spec `PTE-010`.

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
