# `backend/models/database.md`

## 1. Header Section

*   **Overall Purpose:** This module is responsible for all interactions with the SQLite database. It encapsulates the database connection logic, schema initialization, and data access methods (`run`, `get`, `all`). It acts as a singleton data access layer for the entire backend application, ensuring that all other modules interact with the database through a consistent and centralized interface.
*   **End-to-End Data Flow:** When the application starts, the `server.js` module calls the `connect()` method of this module. This establishes a connection to the SQLite database file specified by the `DATABASE_PATH` environment variable. Upon connection, it automatically runs `initializeTables()`, which creates all necessary tables (`transactions`, `staff`, `services`, etc.) if they don't already exist and runs migrations to add any missing columns. Subsequently, route handlers (e.g., in `routes/transactions.js`) use the exported database instance to execute queries. For example, to create a new transaction, a route handler would call `database.run(INSERT_SQL, [params])`. To fetch data, it would use `database.get()` for a single row or `database.all()` for multiple rows.

## 2. Module API & Logic Breakdown

This module exports a single instance of the `Database` class.

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
    *   **Logic Notes:** It contains a list of `CREATE TABLE IF NOT EXISTS` SQL statements for every table required by the application. It then calls `addMissingColumns()` to perform simple, non-destructive schema migrations. Finally, it calls `insertDefaultData()` which is currently a no-op.

*   **`addMissingColumns()` method:**
    *   **Purpose:** To add new columns to existing tables without dropping them, allowing for schema evolution.
    *   **Logic Notes:** It attempts to execute `ALTER TABLE ... ADD COLUMN` for a predefined list of columns. It wraps each attempt in a `try...catch` block to gracefully handle cases where the column already exists, preventing crashes on subsequent application starts.

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
    *   **Logic Notes:** This is called by `server.js` during a graceful shutdown.

## 3. Dependency Mapping

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** Primarily `server.js` (for connection), but also all files in the `/routes` and `/middleware` directories that need to perform database operations.
    *   **Input Data Contracts / Schemas:** The module is called with SQL strings and parameter arrays. The structure of the parameters depends on the specific query being executed by the calling module.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:** None. This module interacts directly with the `sqlite3` library.
    *   **Output Data Contracts / Schemas:**
        *   `get()`: Returns a single JSON object representing a database row, or `undefined`.
        *   `all()`: Returns an array of JSON objects representing database rows.

## 4. Bug & Resolution History
*   (This section will be populated as bugs are identified and resolved.)

