# `backend/scripts/sync-branch-catalog.js`

## Overall Purpose

This command brings every branch database's service catalog up to the exhaustive union of services offered anywhere in the chain. Branch catalogs drifted apart: Top Thai 43 gained three "Thai massage with tiger balm" rows, Top Thai 33 / 55 / Thonglor 9 gained three foot scrub / foot spa rows, and the source database has neither. A shop cannot ring up a sale that has no catalog row, so a missing service is lost revenue; an extra service a shop never sells is harmless — reception simply never picks it, and a manager can deactivate it on the Services & Pricing page.

## End-to-End Data Flow

An operator runs `node backend/scripts/sync-branch-catalog.js [--apply]` from the deployment directory. Without `--apply` it is a read-only report. The command discovers every `massage_shop.branch-<digits>.db` beside `DB_PATH`, reads each one's `services` table plus the source's, builds the union keyed on `(service_name, duration_minutes, location)`, and reports what each branch is missing. With `--apply` it inserts the missing rows into each branch, stamping the row's `location_id` with that branch's ID.

## API & Logic

### CLI command

- **Purpose:** Make every branch's service catalog exhaustive without ever repricing an existing service.
- **Parameters:** `--apply` — perform the inserts. Omitted, the command only reports.
- **Returns:** JSON with the union size, any conflicts, and a per-branch breakdown of what was missing, what was inserted, and the resulting service count.

### Money-safety rules

These are the point of the command, not incidental:

- **Insert only.** It never runs `UPDATE` against `services`. A branch's existing price, commission, or active flag is never touched, so a manager's local pricing decision cannot be silently overwritten by another branch's number.
- **Conflicts are skipped, not guessed.** If two branches price the same `(service_name, duration_minutes, location)` differently, that key is reported as a conflict and inserted nowhere. Guessing a price is guessing money.
- **The source database is a donor, never a target.** `massage_shop.db` contributes services to the union but is never written to; it is the archive of record.
- **Dated backups are excluded by construction.** The discovery pattern is a strict `^<base>\.branch-(\d+)\.db$` regex, so a file such as `massage_shop.branch-43.pre-pte-20260723-182830.db` is never opened for writing. A looser `branch-*` glob would have swept it in.

### Deliberately NOT synchronised

Per-branch promotion configuration — `time_window_promotion_settings` and `time_window_promotion_prices` — is left alone. Whether a branch runs a discount window, and during which hours, is a per-branch decision. `seedBranchPromotionConfiguration()` in `backend/models/database.js` supplies each branch's default on first authenticated use (43: 10:00–00:00 enabled; 49: 10:00–18:00 enabled; every other branch: disabled).

## Dependency Mapping

- **Upstream:** `DB_PATH` (`backend/dbPath.js`), the branch database files, the `services` table schema.
- **Downstream:** each branch's `services` table; the New Customer service/duration buttons and the Services & Pricing page read from it.
- **Guardrails:** `tests/otdd/branch-provisioning.otdd.test.js` proves the union is applied to every branch, existing prices survive, conflicts are skipped, dated backups are never written, and the source is untouched.

## Bug & Resolution History

- **2026-07-27:** Created during the chain-wide provisioning pass, after a live read found the source database's 109 services to be a strict subset of every branch's 112, with the two branch families holding *different* extras (union 115). Provisioning a new branch from the source alone would have opened a shop missing services its neighbours sell.
