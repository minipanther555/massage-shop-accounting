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
- Converting a generic reservation uses arrival-time staff selection and writes one booking credit for the serving masseuse.
- Creating a reservation in the current minute succeeds without a forced future delay.
- A present walk-in with manually selected staff creates one transaction and no implicit booking or booking credit, even if a stale client sends `requested_staff_booking: true`.
- Transaction read APIs expose `booking_credit_amount`; filtered pagination remains valid.
- Financial reports expose base commission, booking credit, and combined staff pay.
- Mixed UTC/`+07:00` timestamps are ordered chronologically and new timestamps are stored as ISO text.

## Dependency Mapping

- **Upstream:** Jest.
- **Downstream:** Production database model, booking route, transaction route, SQLite, Express, and Supertest.
- **Isolation:** `DATABASE_PATH` points to a disposable operating-system temporary file and is closed after the suite.

## Bug & Resolution History

Added with the reservation feature to prevent bookings from being treated as immediate revenue or requested-staff credit from being issued before arrival.

Expanded for BKG-005 after browser smoke exposed timestamp ordering and credit visibility gaps. Updated again on 2026-07-23 after manager clarification that non-next staff selection during a present walk-in must not imply Booking mode or create booking credit.
