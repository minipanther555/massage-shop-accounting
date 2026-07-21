# Time-Window Promotion Service Unit Test Specification

## Overall Purpose
This test locks the pure time-window promotion contract: Bangkok time is authoritative, configured in-shop prices apply automatically in the daytime window, reception can override only during the fifteen-minute close grace, and missing configuration never produces a free service.

## Coverage
- `getBangkokMinuteOfDay()` converts a UTC instant to the correct Bangkok minute.
- `calculateTimeWindowPromotion()` applies automatically from 10:00 through 17:59.
- At 18:00 through 18:14, only an explicit override applies the configured price.
- At 18:15, the override is rejected.
- A null promotional-price join returns the normal base price.

## Dependencies
- `backend/services/time-window-promotion-service.js`.
- Jest only; no database or network.
