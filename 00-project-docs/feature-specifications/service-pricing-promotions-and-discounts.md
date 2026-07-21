# Service Pricing, Promotions, and Time-Window Discounts

## 1. Executive Summary

### Feature Name
Service Pricing, Promotions, and Time-Window Discounts

### Goal
Update the POS so service prices, staff commissions, loyalty promotions, return-customer discounts, and low-business-hour prices are represented by explicit governed rules instead of ad hoc live database edits. The base service price and commission table was supplied on 2026-07-16; implementation remains blocked only on final service-name mapping, branch-specific promotion windows, and promotion interaction rules.

### Success Criteria
- Manager-provided service price and commission changes can be applied without breaking New Customer service/duration selection.
- Staff commission remains auditable separately from customer-facing price, discounts, and promotions.
- A customer with ten completed massage stamps can redeem one free massage according to a documented eligibility and redemption rule.
- A returning customer can receive a 10% discount when returning within seven days, according to a documented customer-identification rule.
- Reduced pricing can apply from 10:00 a.m. through 6:00 p.m. only for the operator-selected eligible massage services.
- Daily Summary, Home, reports, and staff-pay surfaces show discounted sales and staff commissions without confusing discounted revenue with base commission.

### Requirement Sources
- Operator clarification on 2026-07-15 after live New Customer service-catalog debugging.
- Operator price/commission table and time-window promotion table supplied on 2026-07-16.
- Existing service catalog and New Customer service/duration button contracts.
- Existing reporting and staff-pay separation rules from the booking-credit workstream.

## 2. Scope Definition

### In Scope
- Service catalog price and masseuse commission updates.
- Ten-stamp loyalty free-massage promotion.
- Ten percent return-within-seven-days discount.
- Time-window reduced pricing from 10:00 a.m. until 6:00 p.m. for selected massage services, configurable per branch so each branch can enable/disable the promotion and define its own start/end times.
- Transaction payload and reporting changes needed to preserve original price, applied discount/promotion, final paid amount, and staff commission.
- Thai-first New Customer UI affordances for selecting or applying an eligible promotion without slowing normal walk-in entry.

### Out of Scope Until Clarified
- Online customer accounts, SMS reminders, or automated external marketing.
- Deposits, prepaid packages, or online payments.
- Automatic identity matching beyond the customer identifier the operator approves.
- Any promotion stacking behavior not explicitly confirmed.

### Non-Goals
- Do not infer price/commission numbers before the operator provides the final table.
- Do not silently apply discounts without visible receptionist confirmation unless the final spec explicitly requires automatic application.
- Do not let customer discounts reduce staff commission unless the operator explicitly confirms that business rule.
- Do not hard-code one global promotion window; reduced-price windows are branch configurable.

## 3. Existing System Impact Analysis

### Existing Components Affected
- `backend/routes/services.js`: service price/commission reads and manager updates.
- `backend/models/database.js`: may need additive promotion/discount fields or tables once rules are finalized.
- `backend/routes/transactions.js`: transaction creation must preserve selected service, base price, final paid amount, staff commission, and applied promotion metadata.
- `backend/routes/reports.js`: revenue, discounts, staff pay, and detail rows must remain auditable.
- `web-app/transaction.html` and `web-app/transaction.ejs`: New Customer promotion selection, discount display, and final price/fee preview.
- `web-app/shared.js`: service catalog mapping, transaction submission payload, and transaction display mapping.
- Home, Daily Summary, Financial Reports, and Payday Tracking surfaces: display discounts/promotions without corrupting commission totals.
- Admin services page: price and commission updates remain manager-owned and must not accidentally deactivate active menu rows.

### Components Explicitly Unaffected
- Today Staff queue ordering must not use customer discounts or promotion values.
- Booking-credit eligibility remains separate from loyalty and return discounts.
- Authentication roles remain unchanged unless a later step creates manager-only promotion administration.

### Regression Risks
- Discounted final price accidentally changes staff commission. Mitigation: store/display base commission separately from customer discount.
- Free massage appears as negative revenue or corrupts payment totals. Mitigation: represent redemption explicitly and define whether staff commission is still paid.
- Time-window pricing applies outside Bangkok business time. Mitigation: use server/Bangkok time and cover boundary tests.
- Promotions stack unexpectedly. Mitigation: define a single stacking priority before implementation.
- Service catalog rows are accidentally inactive and disappear from New Customer. Mitigation: add active-service catalog checks for governed core services.

## 4. Integration Architecture

### Upstream Dependencies
- Manager/operator supplies the final price and commission table.
- Reception supplies customer identifier when a promotion requires history lookup.
- Server supplies Bangkok time for time-window price eligibility.
- Existing service catalog supplies base service/duration/location rows.

### Downstream Dependencies
- New Customer transaction creation.
- Transaction history and recent activity.
- Daily Summary and Financial Reports.
- Payday Tracking and staff earning detail panels.
- Future manager promotion administration, if selected.

### Draft Contracts

#### Service Price/Commission Update Input
The governed input identifies:
- `service_name`
- `duration_minutes`
- `location`
- `price`
- `masseuse_fee`
- `active`

### Base Service Price and Commission Table

Source: operator table sent on 2026-07-16. The number after `=` in the source message is the masseuse commission. Unless later clarified, rows apply to the service catalog's relevant branch/location rows and customer-facing price changes do not alter the listed commission.

| Service | Duration | Customer price | Masseuse commission |
| --- | ---: | ---: | ---: |
| Foot massage | 30 | 350 | 100 |
| Foot massage | 60 | 450 | 130 |
| Foot massage | 90 | 650 | 195 |
| Foot massage | 120 | 800 | 260 |
| Foot massage with herbal compress | 60 | 650 | 160 |
| Foot massage with herbal compress | 90 | 950 | 240 |
| Foot massage with herbal compress | 120 | 1200 | 320 |
| Thai Massage | 60 | 450 | 130 |
| Thai Massage | 90 | 650 | 195 |
| Thai Massage | 120 | 800 | 260 |
| Thai massage with Herbal compress | 60 | 650 | 160 |
| Thai massage with Herbal compress | 90 | 950 | 240 |
| Thai massage with Herbal compress | 120 | 1200 | 320 |
| Thai massage with oil | 60 | 600 | 150 |
| Thai massage with oil | 90 | 900 | 225 |
| Thai massage with oil | 120 | 1100 | 300 |
| Back, Neck & shoulder | 30 | 350 | 100 |
| Back, Neck & shoulder | 60 | 500 | 150 |
| Back, Neck & shoulder | 90 | 700 | 225 |
| Back, Neck & shoulder | 120 | 900 | 300 |
| Back, neck & shoulder with herbal compress | 60 | 700 | 180 |
| Back, neck & shoulder with herbal compress | 90 | 1000 | 270 |
| Back, neck & shoulder with herbal compress | 120 | 1300 | 360 |
| Oil massage | 60 | 700 | 180 |
| Oil massage | 90 | 1000 | 270 |
| Oil massage | 120 | 1300 | 360 |
| Deep oil massage | 60 | 1000 | 250 |
| Deep oil massage | 90 | 1500 | 375 |
| Deep oil massage | 120 | 1900 | 500 |
| Oil massage with herbal compress | 60 | 900 | 210 |
| Oil massage with herbal compress | 90 | 1300 | 315 |
| Oil massage with herbal compress | 120 | 1700 | 420 |
| Aroma massage | 60 | 850 | 180 |
| Aroma massage | 90 | 1250 | 270 |
| Aroma massage | 120 | 1600 | 360 |
| Aroma massage with herbal compress | 60 | 1050 | 210 |
| Aroma massage with herbal compress | 90 | 1500 | 315 |
| Aroma massage with herbal compress | 120 | 2000 | 420 |
| Body Scrub | 30 | 500 | 150 |
| Body Scrub | 60 | 700 | 180 |
| Body Scrub + oil massage | 90 | 1050 | 270 |
| Body Scrub + oil massage | 120 | 1300 | 360 |
| Body Scrub + Aroma massage | 90 | 1200 | 270 |
| Body Scrub + Aroma massage | 120 | 1500 | 360 |
| Foot spa | 30 | 500 | 150 |
| Foot + back, neck & shoulder | 60 | 600 | 150 |
| Foot + back, neck & shoulder | 90 | 800 | 225 |
| Foot + back, neck & shoulder | 120 | 900 | 300 |
| Foot scrub with foot massage | 90 | 950 | 280 |
| Foot scrub with foot massage | 120 | 1100 | 345 |
| Foot + Thai Massage | 90 | 700 | 195 |
| Foot + Thai Massage | 120 | 800 | 260 |
| Foot + oil Massage | 90 | 1000 | 245 |
| Foot + oil Massage | 120 | 1100 | 310 |
| Foot + Aroma Massage | 90 | 1100 | 245 |
| Foot + Aroma Massage | 120 | 1200 | 310 |
| Coconut lovers - coconut oil massage | 60 | 700 | 180 |
| Coconut lovers - coconut oil massage | 90 | 1000 | 270 |
| Coconut lovers - coconut oil massage | 120 | 1300 | 360 |

### Time-Window Promotion Price Table

Source: operator table sent on 2026-07-16. During reduced-price windows, masseuse commission stays the same as the base table. The promotion is stored per branch with enable/disable, start/end, and grace settings; branch-43's initial configuration is seeded from this table without overwriting a later branch configuration change.

Confirmed branch promotion windows:
- Branch `43` / Top Thai 43: 10:00 a.m. until midnight Bangkok time, start-inclusive/end-exclusive: `[10:00, 24:00)`.
- Branch `49` / Top Thai 49: 10:00 a.m. until 6:00 p.m. Bangkok time, start-inclusive/end-exclusive: `[10:00, 18:00)`.
- From each branch's configured end through the next 14 minutes, reception may explicitly reapply the same promotion; the override expires at the configured end plus 15 minutes.
- A manager changes the enabled state, start time, end time, and override grace on the existing Services & Pricing page. The setting is scoped to that manager's authenticated branch.

| Promotion group | Included services | Duration | Promotional customer price | Masseuse commission |
| --- | --- | ---: | ---: | --- |
| Thai/Foot promotion | Thai Massage; Foot massage | 60 | 399 | Same as base commission |
| Thai/Foot promotion | Thai Massage; Foot massage | 90 | 598 | Same as base commission |
| Thai/Foot promotion | Thai Massage; Foot massage | 120 | 798 | Same as base commission |
| Oil promotion | Oil massage | 60 | 599 | Same as base commission |
| Oil promotion | Oil massage | 90 | 899 | Same as base commission |
| Oil promotion | Oil massage | 120 | 1198 | Same as base commission |
| Aroma promotion | Aroma massage | 60 | 699 | Same as base commission |
| Aroma promotion | Aroma massage | 90 | 1049 | Same as base commission |
| Aroma promotion | Aroma massage | 120 | 1398 | Same as base commission |

Current implementation scope: these supplied promotional prices map to `In-Shop` catalog rows only. Separate `Home Service` rows have different base prices and commissions and have no configured promotion row.

#### Promotion Metadata on Transaction
Implemented transaction audit shape for the time-window promotion:
```json
{
  "base_price": 800,
  "discount_amount": 80,
  "final_payment_amount": 720,
  "promotion_type": "RETURN_7_DAY | TEN_STAMP_FREE | TIME_WINDOW | null",
  "promotion_label": "string for receipt/report display",
  "masseuse_fee": 240
}
```

## 5. Functional Requirements

### FR-SPD-001: Governed Price and Commission Update
The system must support manager-approved service price and commission updates for existing service rows. New Customer must continue showing every active service/duration/location combination returned by `/api/services`.

### FR-SPD-002: Ten-Stamp Free Massage Promotion
When a customer has ten eligible completed massage stamps, reception can redeem a free massage. The final rule must define how a customer is identified, which massages count as stamps, which service is free, whether staff commission is still paid, and whether redemption consumes all ten stamps.

### FR-SPD-003: Seven-Day Return Discount
When a customer returns within seven days of a qualifying massage, reception can apply a 10% discount. The final rule must define the date boundary, customer identifier, eligible services, whether the discount is automatic or manual-confirmed, and whether it stacks with other promotions.

### FR-SPD-004: Low-Business-Hours Reduced Pricing
Selected services may use reduced customer-facing prices within a branch-configured Bangkok-time window. Managers set enable/disable, start time, end time, and override grace on Services & Pricing for their authenticated branch. Top Thai 43 defaults to `[10:00, 24:00)` and Top Thai 49 defaults to `[10:00, 18:00)`. Reception can explicitly apply the same promotion from the configured end through the next 14 minutes; no time-window promotion applies at or after the end plus 15 minutes. Staff commission does not change during the reduced-price window; it remains the same as the base table.

### FR-SPD-005: Reporting and Staff-Pay Separation
Reports must show base revenue, discount/promotion impact, final paid amount, staff commission, booking credit, and combined staff pay without merging these concepts. Today Staff ordering remains based on governed base commission logic only.

## 6. Data Model Considerations

The implemented time-window slice adds `transactions.base_price`, `discount_amount`, `promotion_type`, and `promotion_label`, plus `time_window_promotion_settings` and `time_window_promotion_prices`. Future ten-stamp and seven-day work may add customer/redeeming state only after their unresolved rules are specified.

## 7. Open Questions

1. Confirm exact mapping for service names that differ from current catalog spelling/casing, especially `Body Scurb`/`Body Scrub`, `Body scurb + Aroma massage`, `Foot scurb with foot massage`, `Back,Neck&shoulder`, and `Thai massage with oil`.
2. Confirm whether `Thai massage with oil`, `Deep oil massage`, `Oil massage with herbal compress`, and `Aroma massage with herbal compress` should be new active services if they do not already exist in the live catalog.
3. Resolved for time-window promotion: automatic end is exclusive; reception override is available for fifteen minutes after each configured branch end.
4. For the ten-stamp promotion, what customer identifier is used: phone number, name, manual stamp card only, or another value?
5. Resolved: a ten-stamp free massage still pays the normal staff commission; service eligibility remains open and is not part of the time-window implementation.
6. Which services are eligible for the ten-stamp free massage?
7. For the seven-day return discount, does "within seven days" mean seven calendar days, 168 hours, or same Bangkok business-day window plus six days?
8. Can the seven-day return discount stack with the ten-stamp free massage or time-window pricing?
9. Resolved by promotion type: time-window pricing is automatic with the defined reception override; ten-stamp and seven-day discounts are receptionist-applied only.

## 8. Acceptance Criteria Draft

- AC-SPD-001: New Customer renders all active service/duration/location rows after price and commission updates.
- AC-SPD-002: A changed service row calculates final customer price and staff commission from the governed table.
- AC-SPD-003: A ten-stamp redemption creates an auditable transaction with correct revenue, discount, and staff-pay treatment.
- AC-SPD-004: A seven-day return discount applies exactly 10% under the confirmed eligibility rule.
- AC-SPD-005: Time-window pricing applies only to configured in-shop service/duration rows, automatically in the manager-configured Bangkok-time interval, and by reception override only through the configured end plus 14 minutes.
- AC-SPD-008: A manager can read and update only the authenticated branch's time-window enabled state, start/end time, and override grace on Services & Pricing; a reception session cannot write these settings.
- AC-SPD-006: Reports and Payday Tracking separate base price, discount, final paid amount, base commission, booking credit, and total staff pay.
- AC-SPD-007: Promotion and discount behavior has focused unit/integration tests plus browser verification on the New Customer page.
