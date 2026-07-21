# `backend/scripts/bootstrap-branch-database.js`

## Overall Purpose

This command creates one deterministic, disposable branch SQLite database without copying staff, transactions, bookings, expenses, or other operational history from the shared source database. It retains only the source schema, service catalog, payment methods, and location metadata required for a new branch to begin testing.

## End-to-End Data Flow

An operator runs `node backend/scripts/bootstrap-branch-database.js <location-id>` from the backend deployment directory. The command loads the same `.env` `DB_PATH` used by the service, derives `massage_shop.branch-<location-id>.db`, copies the source database, verifies integrity and the `locations` table, deletes every per-branch operational table in one SQLite transaction, inserts the branch metadata when missing, then prints counts that prove the new file has zero staff, transactions, and bookings. Runtime requests subsequently reach this file through `backend/models/database.js` when the authenticated server-side session carries the same location ID.

## API & Logic

### CLI command

- **Purpose:** Provision a branch database from the configured source.
- **Parameters:** `<location-id>` required positive integer; `--replace` optional and only permitted for a confirmed disposable target.
- **Returns:** JSON with the target path, location ID, and post-bootstrap counts.
- **Throws:** Rejects invalid IDs, missing source, source/target identity, existing target without `--replace`, failed SQLite integrity, a missing `locations` table, and any failed clear/verification action.
- **Usage notes:** The script never changes the source DB. It clears branch operational data in a single transaction. It must run only while the target branch database is disposable.

## Dependency Mapping

- **Upstream:** `DB_PATH`, server filesystem, an explicit branch location ID.
- **Downstream:** SQLite target file, `locations`, catalog tables, and runtime branch routing in `backend/models/database.js`.
- **Output contract:** `staff_count`, `transaction_count`, and `booking_count` must all be zero; service and payment-method counts remain observable.

## Bug & Resolution History

- **2026-07-21:** Inactive old branch-named files existed, but the live process had no branch routing and all branch logins read the shared staff list. This command replaces only a disposable target through a bounded, verified bootstrap path; it does not treat old files as valid branch databases.
