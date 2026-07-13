# `scripts/todayStaffDemoSeed.js`

## Overall Purpose

`todayStaffDemoSeed.js` prepares a local SQLite database for Today Staff helper testing without deleting staff. It clears payday tracking state, removes only prior demo-seed transactions, inserts deterministic demo transactions across three business days, and returns a helper-preview summary for a simulated Bangkok business day. The module is intended for local/dev data preparation only; it refuses database paths outside the repository workspace.

## End-to-End Data Flow

An operator or test calls `runSeed({ dbPath, dryRun, baseBusinessDay })`. The module validates that `dbPath` points to an existing SQLite file inside the workspace, loads the production database singleton with `DB_PATH` set to that file, and lets `backend/models/database.js` initialize missing Today Staff schema. It then reads active staff, builds deterministic seed transactions for the three business days before the base business day, and either reports the bounded plan in dry-run mode or applies a transaction that clears payday tables/columns and upserts seed rows. The final output includes staff preservation counts, payday reset totals, seeded transaction count, and helper preview rows sorted by previous-day commission.

## Module API & Logic Breakdown

### `addDays(dateString, amount)`

- **Purpose:** Return an ISO date string offset from another ISO date string.
- **Parameters:** `dateString` (`string`, required), `amount` (`number`, required).
- **Returns:** `string` in `YYYY-MM-DD` format.
- **Raises / Throws:** None intentionally; invalid date input follows JavaScript `Date` behavior.
- **Usage & Logic Notes:** Uses UTC midnight to avoid local timezone drift while doing date arithmetic.

### `assertWorkspaceDb(dbPath)`

- **Purpose:** Enforce that the target DB is explicit, existing, and inside the workspace.
- **Parameters:** `dbPath` (`string`, required).
- **Returns:** Absolute database path.
- **Raises / Throws:** `Error` when `dbPath` is missing, outside the workspace, or nonexistent.
- **Usage & Logic Notes:** This is the primary local safety guard. It prevents accidental writes to `/tmp`, home-directory scratch DBs, or production paths reached through an unexpected mount.

### `buildSeedPlan(options)`

- **Purpose:** Build the deterministic seed plan.
- **Parameters:** `options` (`object`, optional), with `baseBusinessDay` (`string`, optional).
- **Returns:** `object` containing marker, base day, helper preview timestamp, three historical business days, and payday reset flags.
- **Raises / Throws:** None intentionally.
- **Usage & Logic Notes:** Defaults to base business day `2026-07-10`, so seeded days are `2026-07-07`, `2026-07-08`, and `2026-07-09`.
  Operators can pass `baseBusinessDay` to align the seed with the live preview's actual current business day.

### `runSeed(options)`

- **Purpose:** Execute or preview the local Today Staff demo data reset/seed operation.
- **Parameters:** `options` (`object`, required), with `dbPath` (`string`, required), `dryRun` (`boolean`, optional), and `baseBusinessDay` (`string`, optional).
- **Returns:** Summary object. Dry-run includes would-change counts; apply includes staff before/after counts, payday totals, seeded transaction count, business days, helper preview timestamp, and helper preview rows.
- **Raises / Throws:** `Error` for unsafe DB paths, missing required schema after initialization, fewer than five active staff, staff count drift, or SQLite failures.
- **Usage & Logic Notes:** Apply mode uses `BEGIN IMMEDIATE TRANSACTION`, deletes `staff_payments`, resets only payday columns on `staff`, deletes prior transactions with marker `TODAY_STAFF_DEMO_SEED_V1`, recreates demo `business_days`, inserts deterministic demo transactions, and verifies staff count did not change. The helper preview intentionally seeds enough previous-day rows that a populated local DB shows both zero and non-zero commission rows on the visible helper list.

## Dependency Mapping

### Upstream Dependencies

- `scripts/today-staff-demo-seed.js` calls `runSeed()` from the CLI.
- `tests/otdd/today-staff-demo-seed.test.js` imports `assertWorkspaceDb`, `buildSeedPlan`, and `runSeed`.
- Input data contract: an existing SQLite DB path inside this repository and a staff roster with at least five active staff.

### Downstream Dependencies

- `backend/dbPath.js` resolves the active DB path after `process.env.DB_PATH` is set.
- `backend/models/database.js` connects to SQLite and initializes schema.
- SQLite tables written/read: `staff`, `staff_payments`, `transactions`, `business_days`, `today_staff`, `today_staff_planning`, `today_staff_audit_log`.
- Output data contract: JSON-serializable seed summary containing mode, staff counts, payday reset summary, seeded transaction count, business-day list, and helper preview rows.

## Bug & Resolution History

### Bug Summary

Initial demo seeding used only five active staff, which meant a local DB with many active staff and no previous-day transactions could render the helper preview’s first page as all zero-commission rows.

### Validated Hypothesis

The helper sorts by previous-day commission ascending, so active staff without previous-day transactions sort before seeded staff with non-zero commissions.

### Invalidated Hypotheses

- The helper endpoint was failing to read seeded transactions.
- The seed rows were missing `business_day`.
- The API boundary was using a different database.

### Resolution

`getActiveSeedStaff()` now reads all active staff while still requiring at least five, and `buildTransactions()` adds deterministic previous-day rows for overflow staff. A permanent OTDD regression asserts that a larger active roster produces at least one non-zero row in the visible helper preview.

### Bug Summary

During browser review on `2026-07-13`, the live page showed every helper row as `฿0` because the demo data had been seeded for base business day `2026-07-10`.

### Validated Hypothesis

The script supported arbitrary base business days, but the local preview DB needed to be reseeded with the current preview business day so the helper's "yesterday" matched seeded demo rows.

### Invalidated Hypotheses

- The helper query ignored `transactions.business_day`.
- The seed script failed to insert non-zero `masseuse_fee` values.
- The UI lost the commission values during render.

### Resolution

The DB was reseeded with `--base-business-day 2026-07-13`, which inserted previous-day fake commissions for `2026-07-12`. The operations doc now calls out the distinction between deterministic test seed dates and live preview seed dates.
