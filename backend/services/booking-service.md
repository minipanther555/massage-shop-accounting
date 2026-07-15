# Booking Service Module Specification

## Overall Purpose
`booking-service.js` owns the pure, reusable business rules for reservation time calculations, the mandatory 15-minute gap, overlap detection, and requested-staff credit eligibility. It performs no database or HTTP work so routes and tests share one deterministic interpretation.

## End-to-End Data Flow
A booking route receives an offset-aware Bangkok timestamp and duration, then calls `calculateScheduledEnd`. It reads existing requested-staff bookings and calls `hasBookingConflict` before writing. A transaction conversion calls `isBookingCreditEligible` before creating the separate credit. Availability checks call `canFinishBeforeBooking` to enforce the exact 15-minute cutoff.

## Module API & Logic Breakdown

### `BOOKING_CREDIT_AMOUNT`
- Purpose: Canonical v1 requested-staff credit.
- Type: number.
- Value: `50`.

### `BOOKING_BUFFER_MINUTES`
- Purpose: Canonical minimum gap before/after bookings.
- Type: number.
- Value: `15`.

### `parseTimestamp(value, fieldName)`
- Parameters: `value` string required; `fieldName` string optional.
- Returns: number, epoch milliseconds.
- Throws: `Error` for missing/invalid values.
- Notes: Callers should provide ISO-8601 values with offsets when persistence is involved.

### `calculateScheduledEnd(scheduledStart, durationMinutes)`
- Parameters: ISO timestamp string and positive integer minutes, both required.
- Returns: ISO timestamp string preserving the input offset.
- Throws: `Error` for invalid timestamp, missing offset, or invalid duration.

### `normalizeBookingStart(scheduledStart, nowMs = Date.now())`
- Parameters: offset-aware timestamp string required; optional epoch-millisecond server clock.
- Returns: the original future timestamp, or the current server instant expressed with the supplied offset when the requested minute is current/slightly stale.
- Throws: `Error` when the requested time is more than the two-minute transport grace window in the past.
- Notes: Removes the old forced future delay while preventing genuinely stale reservations.

### `createBookingId()`
- Parameters: none.
- Returns: collision-resistant `BK-<epoch>-<random>` identifier string.
- Throws: cryptographic random-byte errors.
- Notes: Shared by reservation creation and atomic immediate requested-staff conversion.

### `canFinishBeforeBooking(massageEnd, bookingStart)`
- Parameters: two timestamp strings, required.
- Returns: boolean; true when end is at least 15 minutes before booking start.
- Throws: `Error` for invalid timestamps.

### `hasBookingConflict(candidateStart, candidateEnd, existingBookings)`
- Parameters: candidate timestamp strings and array of rows containing `scheduled_start`/`scheduled_end`.
- Returns: boolean.
- Throws: `Error` for invalid intervals.
- Notes: Applies the 15-minute buffer to both sides so back-to-back bookings are not rushed.

### `isBookingCreditEligible(booking, servingMasseuseName)`
- Parameters: booking object and serving staff name.
- Returns: boolean.
- Notes: Requires status `BOOKED` and a serving staff name. Requested-staff reservations credit the requested masseuse; queue-assigned reservations credit the serving masseuse. Ordinary walk-ins do not pass a booking object.

## Dependency Mapping

### Upstream Dependencies
- `backend/routes/bookings.js`
- `backend/routes/transactions.js`
- Focused booking tests

### Downstream Dependencies
- JavaScript `Date` parsing only.
- Outputs are primitive booleans, numbers, and ISO strings.

## Bug & Resolution History

### Initial Booking Separation (2026-07-13)
- Bug Summary: No canonical scheduling/buffer/credit rules existed.
- Validated Hypothesis: Keeping these rules inline in multiple routes would allow drift.
- Invalidated Hypotheses: Booking credit could be added to base transaction commission; future reservations could use current busy-state behavior.
- Resolution: Added one pure rules module shared by reservation and conversion paths.

### Immediate Reservations Were Forced Into The Future (2026-07-14)
- Bug Summary: Reservation creation rejected the current minute and the browser defaulted booking time thirty minutes ahead.
- Validated Hypothesis: The route used a strict `scheduled_start <= Date.now()` rejection and had no transport-grace normalization.
- Invalidated Hypotheses: Immediate requested staff required a separate booking type; browser time should be trusted as the financial timestamp.
- Resolution: Added `normalizeBookingStart()` with a two-minute grace and shared booking-ID generation for the atomic immediate path.
