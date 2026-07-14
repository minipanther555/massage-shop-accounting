# Bookings Route Module Specification

## Overall Purpose
This Express router owns non-financial reservation APIs. It validates service/time/staff inputs, enforces the 15-minute requested-staff gap, lists upcoming reservations, exposes availability, and supports non-financial cancellation/no-show states. It never creates revenue, transaction commission, booking credit, or busy status.

## End-to-End Data Flow
The New Customer page posts reservation details through `api.js` after the browser has an authenticated session. `backend/server.js` mounts this router behind `authenticateToken`, so every booking endpoint requires auth before this module validates the service and optional requested staff. `POST /api/bookings` uses `booking-service.js` to calculate the end and detect conflicts, then inserts a `BOOKED` row. The page later reads `GET /api/bookings/upcoming`; arrival conversion is performed by `POST /api/transactions` with `booking_id`, not by this module.

## Module API & Logic Breakdown

### `GET /upcoming`
- Parameters: authenticated request from the server-level `authenticateToken` middleware; no required query fields.
- Returns: array of active future booking rows ordered by start.
- Throws/Failures: HTTP 500 on database errors.

### `GET /availability`
- Parameters: authenticated request plus `masseuse_name` and offset-aware `massage_end` query fields.
- Returns: `{ available, buffer_minutes, next_booking }`.
- Failures: HTTP 400 for missing/invalid input.

### `GET /:bookingId`
- Parameters: authenticated request plus booking ID path string.
- Returns: one booking row.
- Failures: 404 absent; 500 database failure.

### `POST /`
- Parameters: authenticated request plus JSON reservation contract from the feature specification; payment is intentionally absent.
- Returns: HTTP 201 booking row plus `booking_credit_eligible` display hint.
- Failures: 400 invalid/future/service/staff input; 409 requested-staff conflict.
- Logic Notes: Writes only `bookings`.

### `POST /:bookingId/status`
- Parameters: authenticated request plus `{ status: "CANCELLED" | "NO_SHOW" }`.
- Returns: updated booking.
- Failures: 400 invalid status; 409 inactive booking; 500 database failure.

## Dependency Mapping

### Upstream Dependencies
- `backend/server.js` mounts `/api/bookings` behind `authenticateToken`.
- `web-app/api.js` calls all browser-facing endpoints.
- `web-app/transaction.html` and `.ejs` render results.

### Downstream Dependencies
- `backend/models/database.js`: `bookings`, `services`, `staff`.
- `backend/services/booking-service.js`: time, buffer, conflict rules.
- `backend/routes/transactions.js`: downstream arrival conversion consumer.

## Bug & Resolution History

### Reservation Was Previously Forced Through Transaction Entry (2026-07-13)
- Bug Summary: Future bookings had no persistence path other than immediate paid transactions and busy state.
- Validated Hypothesis: Reservation and financial completion are separate lifecycle events.
- Invalidated Hypotheses: A future booking should immediately create revenue; every booking necessarily requests staff.
- Resolution: Added a non-financial reservation API with nullable requested staff and explicit lifecycle status.

### Booking APIs Were Mounted Without Auth Guard (2026-07-13)
- Bug Summary: Checkpoint security review found that reservation endpoints could be reached without the standard authenticated-session middleware.
- Validated Hypothesis: The router itself assumes an authenticated request, but `backend/server.js` originally mounted `/api/bookings` directly.
- Resolution: `backend/server.js` now mounts `/api/bookings` behind `authenticateToken`; this module spec now documents auth as an upstream contract for every public endpoint.
