# Database-Per-Branch Routing Steps

> **Status:** DBR-001 IN PROGRESS - local OTDD green; Git deployment and Top Thai 43 live canary pending.

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
- [ ] Commit and deploy the Git-controlled routing code.
- [ ] Rebuild disposable `massage_shop.branch-43.db` through the bootstrap command.
- [ ] Run a bounded Top Thai 43 live canary and prove no shared staff visibility.
- [ ] Record live evidence and mark DBR-001 DONE.
