# `backend/scripts/adopt-source-as-branch.js`

## Overall Purpose

This command turns the configured source database into a named branch database **while preserving the staff, roster, and trading history already in it**. It is the counterpart to `bootstrap-branch-database.js`: bootstrap creates an *empty* branch for a shop that has never traded, whereas adopt claims an *existing* body of data for a shop that was already trading before database-per-branch routing existed.

It exists because the original single-shop database (`massage_shop.db`) is Top Thai 49's operational history. Bootstrapping 49 would have been correct in form and wrong in substance: it clears the `staff` table, so shop 49 would have opened with zero masseuses and a manager re-typing thirty names.

## End-to-End Data Flow

An operator runs `node backend/scripts/adopt-source-as-branch.js <location-id> [--exclude-staff-created-on=YYYY-MM-DD ...] [--replace]` from the deployment directory. The command loads the same `.env` `DB_PATH` the service uses, derives `massage_shop.branch-<location-id>.db`, copies the source, verifies integrity and the `locations` table, then inside one SQLite transaction removes every row belonging to a *different* branch, clears the day-scoped staff queue, and inserts the branch's own `locations` row. It prints a JSON receipt naming exactly which staff were removed and what remains. Runtime requests reach the resulting file through `backend/models/database.js` once an authenticated session carries the same location ID.

**The source database is never modified.** It remains the archive of record for anything the adoption deliberately leaves behind.

## API & Logic

### CLI command

- **Purpose:** Adopt the source database as a branch database, preserving that branch's history.
- **Parameters:**
  - `<location-id>` — required positive integer.
  - `--exclude-staff-created-on=YYYY-MM-DD` — repeatable. Staff whose `created_at` falls on this date are treated as belonging to a different branch and removed, along with every row keyed to their names.
  - `--replace` — permitted only for a confirmed disposable target.
- **Foreign-row removal rule:** staff matching an excluded date are deleted, and so are their rows in `transactions`, `staff_roster`, `bookings` (`requested_masseuse_name`), and `staff_payments` (`masseuse_name`). The rule is a date, not a name list, so the receipt is auditable and the command is deterministic.
- **Daily queue:** `today_staff`, `today_staff_planning`, and `today_staff_audit_log` are cleared wholesale. This state is rebuilt every business day and carries no history worth adopting; clearing it wholesale prevents a foreign branch's setup day from leaving a partial queue behind.
- **Returns:** JSON with the target path, location ID, excluded dates, removed staff names, per-table removal counts, and post-adoption counts.
- **Throws:** invalid ID, malformed date, missing source, source/target identity, existing target without `--replace`, failed integrity check, missing `locations` table, a missing branch `locations` row after the write, an uncleared daily queue, or a removed-staff count that disagrees with the matched set.

### Choosing between the two provisioning commands

| Situation | Command |
|---|---|
| Shop has never traded; needs an empty book | `bootstrap-branch-database.js` |
| Shop's history is already inside the source database | `adopt-source-as-branch.js` |

## Dependency Mapping

- **Upstream:** `DB_PATH` (`backend/dbPath.js`), server filesystem, an explicit branch location ID, and the operator's determination of which dates identify foreign staff.
- **Downstream:** the SQLite target file, `locations`, and runtime branch routing in `backend/models/database.js` (`getBranchPath` / `runWithLocation`).
- **Guardrails:** `tests/otdd/branch-provisioning.otdd.test.js` proves founding staff and history survive, foreign rows are fully removed, the `locations` row is written, the source is untouched, and an existing target is refused without `--replace`.

## Bug & Resolution History

- **2026-07-27:** Created during the chain-wide provisioning pass. The preceding session's ledger recorded that Top Thai 49 simply had no database file and that provisioning meant bootstrapping an empty one. Reading the live data disproved that: `massage_shop.db` holds thirty founding staff hired between 2025-08-18 and 2026-01-23 — shop 49's own roster — plus ten Top Thai 43 staff created on 2026-07-21 when branch routing shipped, and one stranded ฿500 branch-43 sale. Bootstrapping would have discarded shop 49's roster. This command adopts the history and excludes the 43 spillover by creation date instead.
