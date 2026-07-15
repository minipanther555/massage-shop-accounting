# `tests/unit/booking-service.test.js`

## Overall Purpose

This permanent unit suite guards the pure reservation rules: offset-aware end-time calculation, current-minute normalization, stale-past rejection, the exact 15-minute boundary, requested-staff conflict detection, and universal booking-credit eligibility.

## Dependency Mapping

- **Upstream:** Jest.
- **Downstream:** `backend/services/booking-service.js`.
- **Isolation:** No database, network, clock, or filesystem dependency.

## Regression Contract

Exactly 15 minutes is valid, 14 minutes is invalid, the current minute normalizes to server time, stale past input fails, and any `BOOKED` reservation with a serving masseuse is eligible for the `฿50` credit. Requested-staff bookings credit the requested/serving staff; queue-assigned bookings credit the serving staff; no serving staff and non-`BOOKED` statuses remain ineligible.
