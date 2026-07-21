# `backend/dbPath.js`

## Overall Purpose

This module is the one authoritative source of the configured SQLite database path. It rejects a missing `DB_PATH` at process startup so an operator cannot accidentally run the POS against an implicit local or development file.

## End-to-End Data Flow

The service manager supplies `DB_PATH`; this module validates and returns it. `backend/models/database.js` treats that path as the shared legacy/default database and derives a branch path in the same directory only from a trusted authenticated session location. The branch bootstrap command uses the same source path, so database creation and runtime routing agree on file names.

## API & Logic

### Exported `DB_PATH`

- **Purpose:** Return the trimmed `DB_PATH` environment value.
- **Parameters:** `process.env.DB_PATH`, required non-empty string.
- **Returns:** Absolute or deployment-resolved SQLite path string.
- **Throws:** Throws at import time when `DB_PATH` is absent or blank.
- **Usage notes:** Never accept a database path from an HTTP request. Branch routing derives only `massage_shop.branch-<location_id>.db` beside this source file.

## Dependency Mapping

- **Upstream:** systemd/local-preview environment configuration.
- **Downstream:** `backend/models/database.js`, `backend/scripts/bootstrap-branch-database.js`.
- **Contract:** The path names the legacy shared source database; branch files are not configured with arbitrary request input.

## Bug & Resolution History

- **2026-07-21:** Branch logins carried `location_id`, but all routes used this single configured path. The database router now retains this value only as the default connection and selects a separately provisioned branch file from the authenticated session context.
