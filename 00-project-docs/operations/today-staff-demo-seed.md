# Today Staff Demo Seed Operation

## Purpose

This operation prepares the local SQLite database for manual testing of the Today Staff helper list. It preserves all staff rows, clears payday tracking state, and seeds deterministic demo transaction history for three business days.

## Scope

- Local/dev SQLite only.
- Default target used during setup: `data/massage_shop.db`.
- Default deterministic base business day: `2026-07-10`.
- Live preview base business day used on `2026-07-13`: `2026-07-13`.
- Seeded history days are always the three business days before the selected base business day.
- Seed marker: `TODAY_STAFF_DEMO_SEED_V1`.

## Commands

Dry-run:

```bash
PATH=/opt/homebrew/bin:$PATH node scripts/today-staff-demo-seed.js --db data/massage_shop.db --dry-run
```

Apply:

```bash
PATH=/opt/homebrew/bin:$PATH node scripts/today-staff-demo-seed.js --db data/massage_shop.db --apply
```

Optional simulated day:

```bash
PATH=/opt/homebrew/bin:$PATH node scripts/today-staff-demo-seed.js --db data/massage_shop.db --base-business-day 2026-07-10 --apply
```

Live preview reseed for July 13, 2026:

```bash
PATH=/opt/homebrew/bin:$PATH node scripts/today-staff-demo-seed.js --db data/massage_shop.db --base-business-day 2026-07-13 --apply
```

## Safety Rules

- The script refuses missing DB paths.
- The script refuses paths outside this repository workspace.
- Staff rows are not deleted.
- `staff_payments` is cleared.
- Staff payday tracking columns are reset to zero/null:
  - `total_fees_earned`
  - `total_fees_paid`
  - `last_payment_date`
  - `last_payment_amount`
  - `last_payment_type`
- Only prior demo transactions with `customer_contact = 'TODAY_STAFF_DEMO_SEED_V1'` are removed before reseeding.
- Apply mode runs in a SQLite transaction and verifies staff count before/after.

## Expected Local Result

After the apply run on `data/massage_shop.db`:

- Staff count remains `29`.
- `staff_payments` count is `0`.
- Staff payday totals are `0`.
- Staff last-payment dates are cleared.
- Demo transaction count is `24` for the current active roster.
- The helper endpoint for the selected base business day reports the previous business day.
- With the July 13 preview seed, the helper endpoint reports business day `2026-07-13` and previous business day `2026-07-12`.
- The helper rows sort from zero previous-day commission upward, with visible non-zero rows so ranking can be manually inspected.

## Smoke Verification

Live HTTP smoke should use `PWTEST=1` and a local port:

```bash
DB_PATH=/Users/aidantam/projects/eiw-massage-shop-bookkeeping/data/massage_shop.db \
NODE_ENV=testing \
PWTEST=1 \
PORT=3137 \
node -e '<start backend/server.js, request /api/staff/today/helper?PWTEST=1&at=2026-07-10T10%3A00%3A00%2B07%3A00, then close>'
```

Expected response characteristics:

- HTTP `200`.
- `business_day` matches the selected base business day.
- `previous_business_day` is the prior business day.
- Rows include staff with `previous_day_commission = 0`.
- Rows also include non-zero previous-day commissions in ascending order.

## Bug & Resolution History

### Bug Summary: Preview Showed All Zero Previous-Day Values On July 13, 2026

The demo data was initially seeded for base business day `2026-07-10`, but the live preview page used the real current business day, `2026-07-13`. The helper therefore looked for previous-day rows on `2026-07-12`, where no demo data existed, so every staff member appeared to have `฿0`.

### Validated Hypothesis

The helper API was correct; the mismatch was between the deterministic seed date and the live preview date.

### Invalidated Hypotheses

- The helper API failed to read seeded transactions.
- The UI sorted or displayed commissions incorrectly.
- The seeded transaction rows were missing commission values.

### Resolution

The local DB was reseeded with `--base-business-day 2026-07-13`, producing demo rows for `2026-07-10`, `2026-07-11`, and `2026-07-12`. The live helper API then returned previous business day `2026-07-12` with visible non-zero fake commissions.

## Notes

The current backend startup self-check has an existing hardcoded `/app/backend/data/massage_shop.db` expectation and a delayed check timer. During short-lived local smoke tests, it may log a post-close `SQLITE_MISUSE: Database is closed` after the server is intentionally shut down. That log does not indicate failure when the HTTP request has already returned `200` and the process exits `0`.
