# `tests/integration/booking.reservation.integration.test.js`

## Overall Purpose

This suite verifies the real Express booking and transaction boundaries against a disposable SQLite database. It protects the distinction between non-financial reservations and paid arrivals.

## End-to-End Data Flow

The suite initializes the production database model in a temporary database, seeds staff and services, mounts the production routers, and drives them through Supertest. Assertions inspect both HTTP responses and persisted rows.

## Test Contracts

- Creating a reservation writes one `BOOKED` row and no transaction, staff earnings, or booking credit.
- Converting a requested-staff reservation writes one transaction, marks it `COMPLETED`, and writes exactly one separate `฿50` active credit.
- Repeating conversion is rejected without duplicate financial state.
- The partial unique transaction index enforces one current financial conversion per booking while allowing correction history.
- Converting a generic reservation uses arrival-time staff selection and writes no requested-staff credit.

## Dependency Mapping

- **Upstream:** Jest.
- **Downstream:** Production database model, booking route, transaction route, SQLite, Express, and Supertest.
- **Isolation:** `DATABASE_PATH` points to a disposable operating-system temporary file and is closed after the suite.

## Bug & Resolution History

Added with the reservation feature to prevent bookings from being treated as immediate revenue or requested-staff credit from being issued before arrival.
