# `backend/models/database.md`

## 1. Header Section

*   **Overall Purpose:** This module centralizes SQLite connection, additive schema initialization, request-scoped branch routing, and data access. It defines both Today Staff business-day state and reservation state through `bookings`, `booking_credits`, and `transactions.booking_id`.
*   **End-to-End Data Flow:** At startup `server.js` connects the required default `DB_PATH` database. For API traffic, `server.js` reads only the server-side authenticated session's `location_id` and calls `runWithLocation()`. The router derives `massage_shop.branch-<location_id>.db` beside the default path, opens that file on first use, and stores the connection in `AsyncLocalStorage` for the request. Route handlers keep calling `database.run/get/all`, which then use that request-bound branch connection. A missing branch file raises `BRANCH_DATABASE_MISSING`; it never falls back to shared data. Unauthenticated or legacy paths retain the default connection.

## 2. Module API & Logic Breakdown

This module exports one `DatabaseRouter`, which manages one or more internal `Database` connections while preserving the existing `run/get/all` route API.

*   **`Database` class:**
    *   **Purpose:** To manage the database connection and provide methods for querying.
    *   **Properties:**
        *   `db`: Holds the active `sqlite3` database object.
        *   `dbPath`: The file path to the SQLite database file. Defaults to `./data/massage_shop.db` but can be overridden by the `DATABASE_PATH` environment variable.

*   **`connect()` method:**
    *   **Purpose:** To establish a connection to the database file and initialize the schema.
    *   **Returns:** A `Promise` that resolves when the connection is successful and tables are initialized, or rejects on error.
    *   **Logic Notes:** This is the main entry point for using the database. It chains directly to `initializeTables()`.

*   **`initializeTables()` method:**
    *   **Purpose:** To ensure the database schema is up-to-date.
*   **Logic Notes:** It contains a list of `CREATE TABLE IF NOT EXISTS` SQL statements for every table required by the application. Current legacy local DB data does not constrain the Today Staff redesign; the new product concepts are additive so old tables can coexist while the new route contracts use business-day-scoped tables. It then calls `addMissingColumns()` to perform simple, non-destructive schema migrations, seeds branch-local time-window configuration only when it is absent (`43` is 10:00 through midnight and `49` is 10:00 through 18:00), and finally calls `insertDefaultData()` which is currently a no-op. A narrowly scoped correction changes only the original untouched 43 seed from 18:00 to midnight; it never overwrites a manager-edited row.

*   **`ensureIndexes()` method:**
    *   **Purpose:** To create idempotent indexes and uniqueness constraints required by Today Staff helper/planning queries.
    *   **Logic Notes:** Creates Today Staff indexes, a recent-transaction lookup index on `(date, timestamp DESC, id DESC)`, booking status/start and staff/status/start indexes, and booking uniqueness constraints. Partial unique indexes prevent more than one active/corrected transaction and more than one active requested-staff credit per booking while still allowing a corrected transaction to replace an `EDITED` row. It also creates `idx_expenses_business_day` on `expenses (business_day)` for day-scoped expense totals (`RIT-DB-001`).
    *   **Why an index cannot go in `columnTasks`:** the `columnTasks` applier only ever emits `ALTER TABLE ... ADD COLUMN`, so an index has no way to be expressed there. `addMissingColumns()` calls `ensureIndexes()` as its last action, which is what guarantees a column added in the same pass exists before an index over it is created. Any future index on a newly added column depends on that ordering.

*   **`addMissingColumns()` method:**
    *   **Purpose:** To add new columns to existing tables without dropping them, allowing for schema evolution.
    *   **Logic Notes:** It iterates through a predefined list of columns for multiple tables. It wraps each `ALTER TABLE ... ADD COLUMN` attempt in a `try...catch` block. This makes the database initialization idempotent and resilient, as it gracefully handles cases where a column already exists by logging it and continuing, which prevents the server from crashing on startup if it's connected to an already-migrated database. Any error *other* than "duplicate column name" is considered fatal and is re-thrown to halt the server startup process. **That catch is this project's whole idempotence guarantee** — it has no Alembic and no revision table, so the deploy artifact is the committed `columnTasks` list itself, repeatable from source and additive only.
    *   **`expenses.masseuse_name TEXT` and `expenses.business_day DATE` (`RIT-DB-001`)** are the newest entries. Both are nullable and nothing is backfilled, so every pre-existing expense row stays valid and reads `NULL` for both. `business_day` is the shop day from `getBusinessDay()` and is **not** a synonym for the existing `date` column, which every writer fills from the UTC calendar day — the two disagree between 00:00 and 07:00 Bangkok, so any query choosing between them is making a semantic choice. **`RIT-MONEY-002` is the first writer of both**: `createMoneyOnlyAddOn()` in `backend/routes/transactions.js` fills them on the expense row paired with a `TIP`. Rows written by `backend/routes/expenses.js` still leave both `NULL`.
    *   **Rollback posture for `RIT-DB-001`: Rollback-NoOp.** Reverting the source commit removes the two `columnTasks` entries and the index statement; the columns and index already created stay in place, hold only `NULL`s, and no code reads them. SQLite `DROP COLUMN` is deliberately **not** used — dropping a column is a destructive data operation, and this project's correction spec forbids destructive cleanup of financial records.

*   **Permanent schema guardrails:**
    *   `tests/otdd/paid-time-extension-schema.test.js` — the `transactions` add-on columns.
    *   `tests/otdd/reception-intake-expenses-schema.test.js` — the `expenses` attribution columns and the business-day index, including that a pre-existing database keeps its expense row count and total through the upgrade.
    *   Run each **alone** (`mocha tests/otdd/<file>`): every OTDD file sets `process.env.DB_PATH` at module load, but `DatabaseRouter.defaultPath` is captured once at first require, so running the directory as a whole makes later files fail with `SQLITE_CANTOPEN`. Pre-existing, recorded as `Q-02` in the Paid Time Extension steps file.

*   **`run(sql, params)` method:**
    *   **Purpose:** To execute SQL statements that do not return data (e.g., `INSERT`, `UPDATE`, `DELETE`).
    *   **Parameters:**
        *   `sql` (string, required): The SQL query to execute.
        *   `params` (array, optional): An array of parameters to bind to the SQL query to prevent SQL injection.
    *   **Returns:** A `Promise` that resolves with an object containing `id` (the last inserted row ID) and `changes` (number of rows affected), or rejects on error.

*   **`get(sql, params)` method:**
    *   **Purpose:** To execute a SQL query that is expected to return a single row.
    *   **Parameters:** (Same as `run`)
    *   **Returns:** A `Promise` that resolves with the first matching row object, or `undefined` if no rows are found. Rejects on error.

*   **`all(sql, params)` method:**
    *   **Purpose:** To execute a SQL query that may return multiple rows.
    *   **Parameters:** (Same as `run`)
    *   **Returns:** A `Promise` that resolves with an array of all matching row objects. The array will be empty if no rows are found. Rejects on error.

*   **`close()` method:**
    *   **Purpose:** To gracefully close the database connection.
    *   **Returns:** A `Promise` that resolves when the connection is closed, or rejects on error.
    *   **Logic Notes:** This is called by `server.js` during a graceful shutdown and closes all opened branch connections.

*   **`getBranchPath(locationId)` method:**
    *   **Purpose:** Derive the only permitted branch filename from a positive server-side session location ID.
    *   **Parameters:** `locationId` (positive integer or numeric string, required).
    *   **Returns:** A same-directory path such as `massage_shop.branch-43.db`.
    *   **Raises / Throws:** Rejects a non-positive or non-integer ID.
    *   **Logic Notes:** It does not accept a path from an HTTP request.

*   **`runWithLocation(locationId, callback)` method:**
    *   **Purpose:** Bind all database work initiated by `callback` to one provisioned branch connection.
    *   **Parameters:** `locationId` (server-side session value) and `callback` (required continuation).
    *   **Returns:** The callback result.
    *   **Raises / Throws:** `BRANCH_DATABASE_MISSING` when the branch file is absent, plus connection/validation failures.
    *   **Logic Notes:** `server.js` maps a missing branch database to HTTP `503`; absence cannot silently use the default/shared file.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** `server.js` (startup connection and trusted session branch binding), `backend/scripts/bootstrap-branch-database.js` (matching branch filenames), and all route modules through `run/get/all`.
    *   **Input Data Contracts / Schemas:** The module is called with SQL strings and parameter arrays. The structure of the parameters depends on the specific query being executed by the calling module.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:** None. This module interacts directly with the `sqlite3` library.
    *   **Output Data Contracts / Schemas:**
        *   `get()`: Returns a single JSON object representing a database row, or `undefined`.
        *   `all()`: Returns an array of JSON objects representing database rows.
        *   Today Staff schema contracts:
            *   `business_days`: one row per `business_day`, with open/reset status.
            *   `today_staff`: visible Today Staff participation rows with `removed_at` preserving history.
            *   `today_staff_planning`: one planning status per business day and staff member.
            *   `today_staff_audit_log`: audit-safe planning action log.
            *   `transactions.business_day`: Bangkok business-day label used by helper earnings and reporting.
            *   `transactions.start_datetime` / `transactions.end_datetime`: optional canonical service-window timestamps supplied by New Customer or booking arrival conversion. Current Shop Status prefers these fields and falls back to `timestamp + duration` for legacy rows.
            *   `bookings`: non-financial reservation schedule with optional requested staff and lifecycle status.
            *   `booking_credits`: separate `฿50` payable-credit ledger linked to a completed booking transaction and excluded from Today Staff base-commission ranking.
            *   `transactions.booking_id`: nullable reservation link with partial uniqueness across `ACTIVE` and `CORRECTED` rows, enforcing one current financial conversion per booking.
            *   `transactions.base_price`, `discount_amount`, `promotion_type`, and `promotion_label`: immutable customer-price audit values. `payment_amount` remains the final amount received; `masseuse_fee` remains the normal earned commission.
            *   `time_window_promotion_settings`: one branch-local configuration row with enabled state, start/end Bangkok minutes, and reception-override grace minutes.
            *   `time_window_promotion_prices`: selected service-name/duration/location promotional prices. A missing row means that service keeps its base price.

## 4. Bug & Resolution History

*   **Bug Summary (2026-07-21):** A Top Thai 43 manager login showed the shared/49 staff list.
*   **Validated Hypothesis:** Auth sessions already carried `location_id: 43`, but every route reached one singleton connection opened from `DB_PATH`; old branch-named files were inactive artifacts rather than runtime targets.
*   **Invalidated Hypotheses:** The branch login option was not absent; staff did not need a `location_id` column under the database-per-branch model; merely finding a branch-named SQLite file did not activate it.
*   **Resolution:** Add request-scoped branch routing, fail missing branch files closed, and bootstrap disposable branch files only through the bounded source-controlled command and OTDD guardrail.

*   **Bug Summary (August 2024):** The server logs showed a non-fatal `SQLITE_ERROR: duplicate column name: corrected_from_id` on every startup.
*   **Validated Hypothesis:** The `addMissingColumns()` function, while correctly designed to prevent crashes, attempts to add every column in its list on every server start. This is inefficient and clutters the logs with expected errors.
*   **Invalidated Hypotheses:** This was not a data corruption issue or a critical failure.
*   **Resolution:** The behavior is currently accepted as a non-critical issue. The `try...catch` block correctly prevents it from crashing the server. A future improvement would be to implement a more sophisticated migration system that tracks which migrations have already been run, but this is not a priority.

*   **Bug Summary (August 2024):** The application server was crashing immediately on startup with a `SQLITE_ERROR: duplicate column name: corrected_from_id`.
*   **Validated Hypothesis:** A hardcoded `ALTER TABLE transactions ADD COLUMN corrected_from_id` statement was mistakenly placed inside the main `initializeTables` loop instead of within the `addMissingColumns` function. Unlike the statements in `addMissingColumns`, this one was not wrapped in a `try...catch` block, causing a fatal error on any startup after the first one.
*   **Resolution:** The erroneous `ALTER TABLE` statement was removed from the `initializeTables` loop. The existing, correct logic within the `addMissingColumns` function was already sufficient to add the column safely.

*   **Bug Summary (August 2025):** The application server, when connected to a production database copy, would crash on startup with an unhandled `SQLITE_ERROR: duplicate column name: hire_date`.
*   **Validated Hypothesis:** The error handling within the `addMissingColumns` function was inconsistent and brittle. While it attempted to catch "duplicate column" errors, the logic was flawed and did not prevent the error from being re-thrown by an outer `try...catch` block, which would then crash the server process. This prevented the local Docker-based development environment from starting.
*   **Resolution:** The `addMissingColumns` function was refactored into a single, unified loop that iterates over a list of all required columns across all tables. The error handling was simplified and made robust: it now correctly logs and ignores "duplicate column name" errors while re-throwing any other unexpected, fatal errors. This makes the database initialization process fully idempotent and resilient.
