# Database-Per-Branch Routing Steps

> **Status:** DBR-001 DONE (2026-07-21) - deployed as `testing3411`; Top Thai 43 live canary passed.
> DBR-002 DONE (2026-07-27) - all five configured branches provisioned; Top Thai 49 adopted its own trading history.

## DBR-001 - Provision and Route Top Thai 43 Independently

**Goal:** Ensure a Top Thai 43 session uses an isolated SQLite database with its own staff, transactions, bookings, business-day state, and reports, instead of the shared/49 operational database.

**Dependencies:** Branch login metadata provides trusted `location_id: 43`; the service has a required `DB_PATH` source/default file; the branch file is explicitly provisioned before use.

**Expected output / verification:** `massage_shop.branch-43.db` passes `PRAGMA integrity_check`, contains catalog/payment configuration, and has zero staff, transactions, and bookings. A Top Thai 43 session reads only that file; a missing branch file returns `503`, never shared data.

**Technical considerations:** Use `AsyncLocalStorage` in `backend/models/database.js` to preserve the `database.run/get/all` route API. Derive database paths only from `session.location_id`. `backend/scripts/bootstrap-branch-database.js` copies the configured source, clears operational/staff tables inside one SQLite transaction, retains catalog/configuration, and verifies counts. Do not trust old branch-named SQLite files as an active baseline.

**Potential challenges and mitigation:** Existing routes use a singleton-style import, so selection must happen at the server middleware boundary. A missing branch file must fail closed. The legacy schema has no revision ledger, so integrity, table inventory, and branch row counts are required before the live canary.

**Completion checklist:**

- [x] Trace branch session metadata and the singleton database path.
- [x] Add permanent OTDD coverage for missing-file fail-closed behavior and cross-branch write isolation.
- [x] Add a deterministic source-controlled branch bootstrap command.
- [x] Update co-located docs and the multi-location feature specification.
- [x] Commit and deploy the Git-controlled routing code as `testing3411` (`e61ff79`).
- [x] Rebuild disposable `massage_shop.branch-43.db` through the bootstrap command: integrity `ok`, 0 staff, 0 transactions, 0 bookings, 109 services, 7 payment methods.
- [x] Run a bounded Top Thai 43 live canary: a valid `manager_top_thai_43` session reported `location_id: 43`, `/api/staff/allstaff` returned `[]`, while the untouched shared database retained 40 staff.
- [x] Record live evidence and mark DBR-001 DONE.

---

## DBR-002 - Provision Every Configured Branch; Adopt Shop 49's Own History

**Status:** DONE (2026-07-27) - live, deployed at `5d9254e`

**Goal:** Give every branch with a login a provisioned database, and give Top Thai 49 back the trading history that was already sitting in the source database.

**The finding that changed the approach.** The prior ledger recorded that shop 49 "simply has no database file" and that provisioning meant bootstrapping an empty one. Reading the live data disproved it. `massage_shop.db` **is** shop 49:

- 30 founding staff, hired 2025-08-18 through 2026-01-23 - one shop hiring over time, long before multi-branch existed. `staff_roster` mixes names from across that whole span.
- 10 additional staff all created on **2026-07-21** - the exact day branch routing shipped as `testing3411` - whose names are transliterations of Top Thai 43's roster (`P'ni`/`P'นิ`, `Yam`/`แยม`, `P'Air`/`พี่แอร์`, ...). Branch-43's setup happened inside the shared database before routing cut over.
- `today_staff` contained rows for one business day only: 2026-07-21, the same 43 setup day.
- Every transaction carried `location_id = 1`; the database never knew its own branch number. **The identification of that original shop as 49 rests on the operator's testimony, not on the data.**

Bootstrapping would have been correct in form and wrong in substance: `bootstrap-branch-database.js` clears `staff`, so shop 49 would have opened with zero masseuses and a manager re-typing thirty names.

**What was done:**

- New `backend/scripts/adopt-source-as-branch.js` - copies the source to a branch file **preserving** staff, roster, and history, removing foreign-branch rows by an auditable `created_at` date rule, clearing the day-scoped queue, and writing the branch `locations` row. The source is never modified.
- New `backend/scripts/sync-branch-catalog.js` - brings every branch to the exhaustive union of services offered anywhere (115). Insert-only; never reprices an existing row; skips rather than guesses on a price conflict; excludes dated backup files by strict filename regex.
- New `tests/otdd/branch-provisioning.otdd.test.js` - 10 permanent guardrails over both commands.

**Live evidence (2026-07-27):**

| File | staff | txn | services | tables | locations row |
|---|---|---|---|---|---|
| `massage_shop.db` (source, untouched) | 40 | 1 | 109 | 19 | - |
| `branch-9` | 0 | 0 | 115 | 17 | missing |
| `branch-33` | 0 | 0 | 115 | 17 | missing |
| `branch-43` | 13 | 54 | 115 | 19 | `Top Thai 43` |
| **`branch-49` (new)** | **30** | **0** | **115** | **19** | `Top Thai 49` |
| `branch-55` | 0 | 0 | 115 | 17 | missing |

All six `PRAGMA integrity_check` = `ok`. Adoption receipt: 10 staff removed, 1 branch-43 transaction removed, 42 daily-queue rows cleared, 30 staff and 14 roster rows preserved, zero staff with `created_at` 2026-07-21 remaining. Branch-43's 13 staff / 54 transactions / 7 bookings and all its prices were unchanged by the catalog sync. Service `active`, health `200`, no errors in the log.

**Deliberately not synchronised:** per-branch promotion configuration. `seedBranchPromotionConfiguration()` supplies each branch's default on first authenticated use - 43 enabled 10:00-00:00, 49 enabled 10:00-18:00, every other branch disabled.

**Deliberately left behind, recoverable:** the source database keeps its 40 staff and the one stranded branch-43 sale `TX-1784627268613-c902e2` (฿500, 2026-07-21, `P'ni`) which exists in **no** branch file. It was excluded from 49 so a 43 sale would not land in 49's books. It remains in the archive rather than being deleted.

**Open sub-item:** branches 9, 33, and 55 still carry 17 tables and no branch `locations` row, because they were hand-created on 2026-07-17 before the bootstrap command existed. Neither blocks trading - routing is filename-based and never reads `locations`, and the schema self-repairs on first authenticated use via `connect()` -> `initializeTables()` -> `addMissingColumns()` (`backend/models/database.js:14-29, 271-273`), the path branch-43 already demonstrated. Re-running `bootstrap-branch-database.js <id> --replace` on each would make them uniform; the attempt was blocked by the local tool-permission classifier on the `--replace` flag and was not worked around.

**Rollback:** `/opt/massage-shop/KEEP/backend/data/*.pre-provision-20260727-125010.db` (all five pre-change files, each verified `integrity_check = ok` before any write); delete `massage_shop.branch-49.db` to restore the prior 503 behaviour. Code rollback: `git checkout testing3420` on the server - the diff is additive-only (5 files, +483, -0) and touches no application code, so no restart was needed and none was performed.
