# Today Staff Massage Count OTDD Test Specification

## Overall Purpose
This OTDD smoke test guards the Today Staff current-business-day massage count contract. It proves the real staff route returns a completed massage count for each visible Today Staff row using `transactions.business_day`, so the receptionist can rebalance queue order after requested bookings or walk-in assignments change daily fairness.

## End-to-End Data Flow
The test creates an ephemeral SQLite database, initializes the production schema through `backend/models/database.js`, seeds one active staff member into `today_staff`, inserts same-day `ACTIVE`, same-day non-active, and previous-business-day transactions, then calls the real Express `GET /api/staff/roster` route through Supertest. The route returns `today_massages`, and the test verifies that only current-business-day `ACTIVE` transaction rows are counted.

## Module API & Logic Breakdown

### `GET /api/staff/roster returns ACTIVE transaction count for the current business day only`
- **Purpose:** Proves the Today Staff roster endpoint reports completed massages for the current Bangkok business day.
- **Parameters:** None; the test constructs its own DB fixture and passes `at=2026-07-13T08:00:00.000Z` to select the July 13 Bangkok business day.
- **Returns:** Mocha pass/fail.
- **Raises/Throws:** Assertion failure when the route does not return HTTP 200, does not return one row, or returns a `today_massages` value other than `2`.
- **Usage & Logic Notes:** The fixture includes two `ACTIVE` rows for `2026-07-13`, one `EDITED` row for `2026-07-13`, and one `ACTIVE` row for `2026-07-12`; the expected count is therefore `2`.

## Dependency Mapping

### Upstream Dependencies (Inputs)
- `backend/server.js`
- `backend/routes/staff.js`
- `backend/models/database.js`
- `transactions.business_day`
- `today_staff`
- `staff`

### Downstream Dependencies (Outputs)
- Supertest route response.
- Mocha assertion result.

## Bug & Resolution History

### Bug Summary: Current-Day Count Could Regress to Calendar Date or Include Edited Rows
**Validated Hypothesis:** A route-level smoke test can detect whether `GET /api/staff/roster` counts only active transactions from the selected Bangkok business day.

**Invalidated Hypotheses:**
- The UI contract test alone was sufficient.
- Directly querying the DB in the test was enough to prove route wiring.

**Resolution:** Added a real Express-route smoke test using an ephemeral SQLite database and mixed transaction statuses/business days.
