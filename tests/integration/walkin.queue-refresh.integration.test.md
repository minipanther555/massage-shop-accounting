# `tests/integration/walkin.queue-refresh.integration.test.js`

## 1. Header Section

* **Overall Purpose:** Verifies the real Express/SQLite contracts behind workload-based walk-in priority, retained Today Staff day-start order, booking/no-show eligibility, and recent transaction ordering.
* **End-to-End Data Flow:** The test creates an isolated SQLite database, seeds `business_days`, active `staff`, ordered `today_staff`, bookings, and transactions, then drives the real `/api/staff/advance-queue`, `/api/staff/current-status`, and `/api/transactions/recent` routes through Supertest.

## 2. Module API & Logic Breakdown

* **`advance-queue retains the original Today Staff order when the current first staff is served`**
  * **Purpose:** Proves a walk-in for the visible first Today Staff row does not rewrite the original day-start order.
  * **Parameters:** Supertest POST body `{ currentMasseuse: 'สา' }`.
  * **Returns:** Expects `Today Staff order retained; workload determines the next walk-in`, `newNext`, and the unchanged database order `สา`, `nine นาย`, `May เมย์`.

* **`advance-queue does not rotate Today Staff for a manual non-next selection`**
  * **Purpose:** Proves requested/manual staff selection does not change the queue.
  * **Parameters:** Supertest POST body `{ currentMasseuse: 'May เมย์' }`.
  * **Returns:** Expects unchanged Today Staff order.

* **`current status uses original Today Staff order as equal-workload tie-break`**
  * **Purpose:** Proves the next Walk-in staff is the eligible staff with the lowest assigned workload, with stable Today Staff position as the tie-break.
  * **Parameters:** Supertest GET `/api/staff/current-status` after seeding equal current-day workload.
  * **Returns:** Expects only the original first eligible staff row to carry `walk_in_priority: true`.

* **`current status ignores an unreleased booking from a previous business day`**
  * **Purpose:** Proves previous-day stale bookings do not make today's staff unavailable.
  * **Parameters:** Supertest GET `/api/staff/current-status` after seeding a previous-day `BOOKED` row.
  * **Returns:** Expects the staff member's `next_booking` to be `null` and current state to remain `available`.

* **`recent transactions endpoint normalizes mixed offsets and returns newest first`**
  * **Purpose:** Proves a later `Z` timestamp sorts ahead of an older `+07:00` timestamp representing an earlier absolute instant.
  * **Parameters:** Supertest GET `/api/transactions/recent?limit=2&date=2030-01-01`.
  * **Returns:** Expects `TX-NEW`, then `TX-OLD`.

## 3. Dependency Mapping

* **Upstream Dependencies:** `backend/server.js`, `backend/models/database.js`, `backend/routes/staff.js`, `backend/routes/transactions.js`, `backend/services/booking-service.js`, `backend/utils/business-day.js`.
* **Downstream Dependencies:** Isolated temporary SQLite database; no production or preview database is touched.

## 4. Bug & Resolution History

* **Bug Summary:** The queue API mutated legacy `staff_roster`, while the page rendered `today_staff`; recent transaction ordering lacked deterministic newest-first behavior.
* **Validated Hypothesis:** Real route and browser tests reproduced both queue divergence and lexical ordering across mixed timestamp offsets.
* **Resolution:** The integration test now protects retained `today_staff` order, manual-selection no-op behavior, and normalized `/recent` ordering with `TX-NEW` at `14:55Z` ahead of `TX-OLD` at `21:21+07:00`.

* **Bug Summary:** Equal workload ties and stale bookings could make New Customer auto-select the wrong staff member.
* **Validated Hypothesis:** Current status mixed unscoped booking rows, rotated queue positions, and non-display-order tie-breaks; the correct product rule is assigned workload first and original Today Staff order for ties.
* **Resolution:** The integration test now proves `walk_in_priority` uses stable Today Staff position when workloads tie and ignores unreleased bookings from prior business days.
