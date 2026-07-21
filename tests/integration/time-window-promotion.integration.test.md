# Time-Window Promotion Integration Test Specification

## Overall Purpose
This test uses the real Express transaction route and an ephemeral SQLite database to prove that a promotion quote and transaction write preserve customer-price audit fields while keeping the normal masseuse commission.

## End-to-End Data Flow
The fixture inserts staff, in-shop and Home Service rows, branch settings, and one in-shop promotion row. Supertest calls `POST /api/transactions/quote` and `POST /api/transactions`; assertions read the stored transaction and staff ledger values.

## Coverage
- Automatic quote and transaction save produce `payment_amount=399`, `base_price=450`, `discount_amount=51`, and `promotion_type=TIME_WINDOW` for Thai Massage 60 minutes in-shop.
- The staff ledger earns `130`, not a discounted commission.
- The receptionist override works at 18:14 Bangkok time and expires at 18:15.
- The same service/duration at Home Service receives no in-shop promotion.

## Dependencies
- `backend/server.js`, `backend/routes/transactions.js`, `backend/models/database.js`, and `backend/services/time-window-promotion-service.js`.
- An ephemeral temporary SQLite file, deleted in `afterAll`.
