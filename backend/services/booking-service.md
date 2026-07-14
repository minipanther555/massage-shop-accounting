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
- Notes: Requires status `BOOKED`, a requested staff name, and exact requested/serving staff match.

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
