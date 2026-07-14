# `tests/unit/booking-service.test.js`

## Overall Purpose

This permanent unit suite guards the pure reservation rules: offset-aware end-time calculation, the exact 15-minute boundary, requested-staff conflict detection, and fixed-credit eligibility.

## Dependency Mapping

- **Upstream:** Jest.
- **Downstream:** `backend/services/booking-service.js`.
- **Isolation:** No database, network, clock, or filesystem dependency.

## Regression Contract

Exactly 15 minutes is valid, 14 minutes is invalid, and only a `BOOKED` reservation whose requested name matches the arriving masseuse is eligible for the `฿50` credit.
