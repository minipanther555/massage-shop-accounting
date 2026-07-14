# `tests/integration/walkin.queue-refresh.integration.test.js`

## 1. Header Section

* **Overall Purpose:** Verifies the real Express/SQLite contracts behind normal walk-in queue rotation and recent transaction ordering.
* **End-to-End Data Flow:** The test creates an isolated SQLite database, seeds `business_days`, active `staff`, and ordered `today_staff`, then drives the real `/api/staff/advance-queue` and `/api/transactions/recent` routes through Supertest.

## 2. Module API & Logic Breakdown

* **`advance-queue rotates the active Today Staff list when the current next staff is served`**
  * **Purpose:** Proves a walk-in for the visible first Today Staff row moves that row to the end.
  * **Parameters:** Supertest POST body `{ currentMasseuse: 'สา' }`.
  * **Returns:** Expects `Today Staff queue advanced`, `newNext`, and the database order `nine นาย`, `May เมย์`, `สา`.

* **`advance-queue does not rotate Today Staff for a manual non-next selection`**
  * **Purpose:** Proves requested/manual staff selection does not change the queue.
  * **Parameters:** Supertest POST body `{ currentMasseuse: 'May เมย์' }`.
  * **Returns:** Expects unchanged Today Staff order.

* **`recent transactions endpoint returns newest first with deterministic tie-break`**
  * **Purpose:** Proves same-timestamp transactions are returned in newest insertion order.
  * **Parameters:** Supertest GET `/api/transactions/recent?limit=2&date=2030-01-01`.
  * **Returns:** Expects `TX-NEW`, then `TX-OLD`.

## 3. Dependency Mapping

* **Upstream Dependencies:** `backend/server.js`, `backend/models/database.js`, `backend/routes/staff.js`, `backend/routes/transactions.js`, `backend/utils/business-day.js`.
* **Downstream Dependencies:** Isolated temporary SQLite database; no production or preview database is touched.

## 4. Bug & Resolution History

* **Bug Summary:** The queue API mutated legacy `staff_roster`, while the page rendered `today_staff`; recent transaction ordering lacked deterministic newest-first behavior.
* **Validated Hypothesis:** Real route tests reproduced both divergences.
* **Resolution:** The integration test now protects `today_staff` rotation, manual-selection no-op behavior, and deterministic `/recent` ordering.
