# Time-Window Promotion Service Module Specification

## Overall Purpose
`time-window-promotion-service.js` is the server-side source of truth for the low-business-hours promotion. It reads an active service and the current branch's stored promotion configuration, evaluates the current Bangkok clock, and returns an auditable final customer price without changing the service's masseuse commission.

## End-to-End Data Flow
New Customer selects a service and calls `POST /api/transactions/quote` through `web-app/api.js`. `backend/routes/transactions.js` calls `getTimeWindowQuote()`, which joins `services` to location-specific `time_window_promotion_prices`, reads `time_window_promotion_settings`, and evaluates the Bangkok minute. The page displays the returned price and optional reception override control. On submission the transaction route calls the same function again and stores `base_price`, `discount_amount`, `promotion_type`, and `promotion_label` with the authoritative final payment amount.

## Module API & Logic Breakdown

### `getBangkokMinuteOfDay(now)`
- Purpose: Convert a JavaScript date to `0..1439` using `Asia/Bangkok`, independently of the server's host timezone.
- Parameters: `now` Date, optional, defaults to the current clock.
- Returns: number.

### `calculateTimeWindowPromotion({ service, settings, now, manualOverride })`
- Purpose: Apply an eligible configured promotion.
- Parameters: `service` contains `price` and nullable `promotional_price`; `settings` contains `enabled`, `start_minute`, `end_minute`, and `manual_override_grace_minutes`; `now` and `manualOverride` are optional.
- Returns: `{ basePrice, finalPrice, discountAmount, promotionType, promotionLabel, automatic, manualOverrideEligible, manualOverrideApplied }`.
- Logic Notes: The automatic window is start-inclusive/end-exclusive. The receptionist override is permitted only from the configured end through the end plus grace, end-exclusive. A missing promotion price never coerces to a free price.

### `getTimeWindowQuote(database, selection)`
- Purpose: Read the selected active service and current branch configuration, then return a quote plus unchanged `masseuseFee`.
- Parameters: database router and `{ serviceType, duration, location, manualOverride?, now? }`.
- Returns: quote object or `null` if the service is not active.

## Dependency Mapping

### Upstream Dependencies
- `backend/routes/transactions.js` for preview and final transaction pricing.
- Focused unit and integration tests.

### Downstream Dependencies
- `services`, `time_window_promotion_settings`, and location-specific `time_window_promotion_prices` through the request-bound database connection.
- JavaScript `Intl.DateTimeFormat` for Bangkok time.

## Bug & Resolution History

### Missing Promotion Rows Could Become Free Services (2026-07-21)
- Bug Summary: `Number(null)` evaluates to zero in JavaScript.
- Validated Hypothesis: A left-joined service without a promotion row could have been treated as a `0` price.
- Resolution: Promotion application now requires a non-null configured promotional price; unmatched services retain their base price.
