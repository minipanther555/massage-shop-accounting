# Transaction Booking Presence Test Specification

## Overall Purpose
This focused Jest contract test prevents the mirrored New Customer templates, browser API wrapper, and Today Staff helper from drifting away from the booking specification.

## End-to-End Data Flow
The test reads source artifacts without mutating application state. It verifies both templates expose the same booking/arrival controls without rendering the backend `฿50` credit as receptionist-facing UI, the API wrapper exposes booking methods, customer text is escaped, and the helper route continues to reference transaction base commission rather than booking credits.

## Module API & Logic Breakdown

### Template Contract Test
- Parameters: each transaction template path.
- Returns: Jest pass/fail, including rejection of `booking-credit-card`, `+฿50`, or booking-credit toast copy in either template.
- Reservation rows must explicitly label customer, service, and staff data so seeded or real contact text cannot be mistaken for a masseuse name or transaction summary.
- Throws: assertion failures when booking controls or semantics disappear.

### API Contract Test
- Parameters: `web-app/api.js` source.
- Returns: Jest pass/fail for required booking methods.

### Ranking Isolation Test
- Parameters: `backend/routes/staff.js` source after the helper route declaration.
- Returns: Jest pass/fail proving `t.masseuse_fee` remains and `booking_credits` is absent.

## Dependency Mapping

### Upstream Dependencies
- Jest test runner.
- Booking feature specification and BKG-001 steps.

### Downstream Dependencies
- Transaction templates, API wrapper, and staff helper route.

## Bug & Resolution History

### Booking Contract Introduction (2026-07-13)
- Bug Summary: No permanent guard protected mirrored booking markup or ranking isolation.
- Validated Hypothesis: Source-contract coverage cheaply prevents accidental template or SQL drift.
- Invalidated Hypotheses: One template test was sufficient; booking credits could safely share helper aggregation.
- Resolution: Added mirrored template, API, escaping, and helper-isolation assertions.

### Backend Credit Leaked Into Walk-In UI (2026-07-13)
- Bug Summary: A large `+฿50` card appeared even in walk-in mode.
- Validated Hypothesis: The backend accounting rule was unnecessarily represented in the intake UI, and the card's `display: flex` rule overrode its HTML `hidden` attribute.
- Resolution: Added a permanent contract that forbids booking-credit UI and keeps the credit exclusively in backend transaction conversion.
