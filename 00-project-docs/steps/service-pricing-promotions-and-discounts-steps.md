# Service Pricing, Promotions, and Time-Window Discounts Steps

> **Status:** SPD-001 PARTIAL - time-window rules are implemented; SPD-003a manager configuration, SPD-003b Oil category regression, and SPD-003c payment-button intake are DONE; catalog price/commission updates and receptionist-only loyalty/return discounts remain open
> **Feature Specification:** `00-project-docs/feature-specifications/service-pricing-promotions-and-discounts.md`

## SPD-001 - Clarify Price, Commission, and Promotion Rules

**Status:** PARTIAL - time-window rules confirmed 2026-07-21; remaining price mapping and loyalty/return details pending

**Goal:** Convert the high-level pricing and promotion requests into a complete implementation-ready contract before changing code or production data.

**Dependencies:** Existing service catalog, New Customer service/duration UI, transaction creation, reports, Payday Tracking, and booking-credit staff-pay separation.

**Traceability:** FR-SPD-001 through FR-SPD-005; AC-SPD-001 through AC-SPD-007.

**Action Items:**
- [x] Collect the final changed service price and commission table supplied on 2026-07-16.
- [ ] Define the ten-stamp free-massage eligibility, customer identifier, redemption, and staff-commission rules.
- [ ] Define the seven-day return 10% discount eligibility, date boundary, and stacking rules.
- [x] Capture the supplied time-window promotion price table for Thai/Foot, Oil, and Aroma service groups.
- [x] Capture the rule that time-window promotion prices do not change masseuse commission.
- [ ] Confirm service-name mapping and whether unmatched table rows should create new active services.
- [x] Define branch time-window configuration: branch 43 `[10:00, 24:00)`, branch 49 `[10:00, 18:00)`, and receptionist override through configured end plus 14 minutes.
- [x] Decide time-window application behavior: automatic during the window, receptionist-only override during the grace period, normal commission throughout.
- [x] Update this spec and steps file with the confirmed time-window answers before implementation.

**Expected Output/Deliverable:** A complete operator-approved pricing/promotion rule table and implementation plan. The base table is now captured in the spec; remaining clarification must close service mapping and promotion behavior.

**Technical Considerations:** Preserve the active service catalog contract used by New Customer. Keep customer-facing discounts separate from staff commission and booking credit. Use Bangkok/server time for time-window pricing. Time-window pricing must be branch-configurable and must not change masseuse commission. Do not introduce promotion stacking by inference.

**Potential Challenges and Mitigations:** Customer identity may be unreliable if only free-text contact is available; mitigate by confirming the identifier before data-model design. Time-window pricing can create reporting ambiguity; mitigate by storing base price, discount, final paid amount, and promotion type separately if schema changes are approved.

**Validation:** Focused unit tests cover Bangkok clock/boundaries and missing configured prices; an integration test proves stored discounted payment/audit values while staff commission remains unchanged. Remaining promotion types still require their own rule closure.

## SPD-002 - Apply Governed Price and Commission Updates

**Status:** PENDING - full catalog price/commission update remains blocked by unresolved service mapping

**Goal:** Update service prices and staff commissions from the confirmed table while keeping all expected active service durations visible on New Customer.

**Dependencies:** SPD-001, `backend/routes/services.js`, `backend/models/database.js`, `web-app/transaction.html`, `web-app/transaction.ejs`, `web-app/shared.js`, admin services page.

**Expected Output/Deliverable:** Updated service rows with regression checks that core active service/duration rows remain visible.

**Technical Considerations:** Prefer scripted, reviewable updates over manual one-off edits when the full table is known. Guard against accidentally deactivating services.

**Potential Challenges and Mitigations:** Live catalog drift can hide duration buttons; mitigate with service-catalog smoke checks before and after update.

**Validation:** Read-only service catalog checks, New Customer browser verification, focused service/transaction tests, and docs update.

## SPD-003 - Implement Promotion and Discount Transaction Support

**Status:** PARTIAL - time-window pricing and SPD-003a manager configuration are implemented; ten-stamp and seven-day receptionist controls remain blocked by their unresolved eligibility rules

**Goal:** Add transaction support for ten-stamp free massage, seven-day return discount, and low-business-hour reduced pricing.

**Dependencies:** SPD-001 time-window rules, transaction route, New Customer UI, plus SPD-002 and remaining rule decisions for the other promotion types.

**Expected Output/Deliverable:** Promotion-aware transaction flow that preserves auditability of base price, discount, final paid amount, staff commission, booking credit, and staff pay.

**Technical Considerations:** Add schema only after RED tests and explicit approval. Use server-side validation for eligibility and Bangkok time boundaries. Keep manual override/confirmation behavior visible if required by the final spec.

**Potential Challenges and Mitigations:** Multiple promotions may be eligible at once; mitigate with a confirmed priority/stacking rule and regression tests.

**Validation:** The time-window sub-slice has unit boundary tests, quote/transaction integration coverage, source contracts, and live branch-43 browser/API smoke still required after deployment. Ten-stamp and seven-day behavior require separate focused tests when specified.

### SPD-003a - Manager Time-Window Promotion Configuration

**Status:** DONE (2026-07-21)

**Goal:** Let a manager change the authenticated branch's low-business-hours promotion enabled state, Bangkok start/end times, and reception override grace from the existing Services & Pricing page without exposing the control in New Customer.

**Dependencies:** SPD-003 time-window tables/service, `backend/routes/services.js`, `web-app/api.js`, `web-app/admin-services.html`, and branch-scoped manager sessions.

**Action Items:**
- [x] Add manager-only read/write endpoints for the current branch's `time_window_promotion_settings` row.
- [x] Render a Thai-first time-window configuration panel on Services & Pricing with explicit save/error/success states.
- [x] Seed/correct defaults: Top Thai 43 `[10:00, 24:00)`, Top Thai 49 `[10:00, 18:00)`, both with fifteen-minute grace.
- [x] Prove a manager cannot change another branch and reception cannot write settings.

**Expected Output/Deliverable:** A saved manager setting takes effect in the server-side quote flow immediately and remains branch-local across restart.

**Technical Considerations:** `24:00` is stored as minute `1440`; automatic evaluation remains end-exclusive. The manager endpoint must be declared before `/:id` in the services router. Never accept a branch/location ID from the browser; the request-bound database connection remains derived from the authenticated session.

**Potential Challenges and Mitigations:** Existing branch-43 settings were seeded with the now-corrected 18:00 end; update only that known initial tuple during startup so later manager changes are never overwritten. Keep Home Service without a promotion row.

**Validation:** Permanent route/UI contracts and integration tests cover manager read/write, validation, branch isolation, reception denial, `43=1440`, `49=1080`, and quote behavior after update; browser smoke saves branch-43 configuration and observes the success state; lint, dependency audit, and `git diff --check` pass.

**Completion Notes (2026-07-21):** `promotion-settings-manager.integration.test.js`, `time-window-promotion.integration.test.js`, and their source contracts passed as 5 suites / 16 tests. `npm run lint` and `git diff --check` passed. Live `testing3414` manager smoke signed in as Top Thai 43, loaded enabled `10:00` through `00:00` with 15-minute grace, saved the unchanged setting, and displayed `บันทึกการตั้งค่าราคาโปรโมชั่นแล้ว`. The live 43 row is `enabled=1, start_minute=600, end_minute=1440, manual_override_grace_minutes=15`. The Top Thai 49 default is implemented and tested, but its branch database file is not yet provisioned on massage-server; no staff/data clone was created. A fresh dependency audit could not run because `registry.npmjs.org` DNS resolution failed; no dependency files changed.

### SPD-003b - Oil Category Promotion Selection Regression

**Status:** DONE (2026-07-22)

**Goal:** Ensure the generic Oil button on New Customer resolves to the exact active `Oil massage` catalog service, preserving reachability of its governed branch time-window prices.

**Dependencies:** SPD-003 time-window pricing, `web-app/transaction.html`, `web-app/transaction.ejs`, and the exact Oil massage rows in the active catalog.

**Action Items:**
- [x] Add a preferred category-service resolver that selects exact `Oil massage` when that active row exists and otherwise preserves the first available catalog fallback.
- [x] Add a permanent mirrored-template regression test.
- [x] Verify branch-43 Oil 60/90/120 In-Shop prices in the live browser are ฿599/฿899/฿1198 during its enabled window, with unchanged commission.

**Expected Output/Deliverable:** The Oil button no longer silently selects Coconut lovers or another oil-named service when the intended standard Oil massage row is active.

**Technical Considerations:** The backend quote is intentionally exact-service-name based. Do not broaden the promotion table to unrelated oil-named services; repair only the frontend category default and retain each catalog row's independent price/commission contract.

**Potential Challenges and Mitigations:** Catalog ordering is not a product contract. The resolver must use an explicit preferred exact name with a safe fallback, and both static/ejs templates must stay in sync.

**Validation:** RED/GREEN mirrored-template contract, existing New Customer contract suite, lint, whitespace check, and authenticated live branch-43 browser verification for all three Oil durations.

**Completion Notes (2026-07-22):** The new Oil contract test failed RED before the resolver existed, then passed GREEN with `transaction.booking.present.test.js` and `transaction.walkin-refresh.present.test.js`: 5 suites / 38 tests passed. `npm run lint` and `git diff --check` passed. On deployed `testing3416` (`b1719e3`), a newly authenticated Top Thai 43 manager selected Oil in the live New Customer page: the hidden service resolved to exact `Oil massage`; 60/90/120 displayed respectively ฿599/฿899/฿1198, showed `ราคาโปรอัตโนมัติ`, and retained commissions ฿180/฿270/฿360.

### SPD-003c - Payment Button Intake

**Status:** DONE (2026-07-22)

**Goal:** Make payment selection as touch-friendly as service and duration selection without changing the established transaction submission contract.

**Dependencies:** `web-app/transaction.html`, `web-app/transaction.ejs`, `#payment` select, and active payment methods from `/api/services/payment-methods`.

**Action Items:**
- [x] Render active payment methods as a dedicated button grid while retaining hidden native `#payment`.
- [x] Keep correction/reset paths synchronized with the visible payment selection.
- [x] Add mirrored-template contract coverage and verify a live manager selection writes the submitted payment value.

**Expected Output/Deliverable:** Reception can select a payment method with a large button; legacy transaction submission continues to read the exact selected `#payment.value`.

**Technical Considerations:** Button labels use DOM text assignment and existing payment option values. This is presentation-only: no payment method, transaction endpoint, authorization, or database behavior changes.

**Potential Challenges and Mitigations:** Mirrored static/EJS templates can drift; the permanent contract asserts both. Correction and clear-form paths explicitly refresh active-button state.

**Validation:** `transaction.booking.present.test.js` verifies both templates; live Top Thai 43 manager browser smoke verifies payment buttons appear and Cash produces `#payment.value === 'Cash'` with selected styling.

**Completion Notes (2026-07-22):** Focused UI contracts passed as part of 5 suites / 38 tests; lint and whitespace checks passed. Deployed `testing3416` (`416c17f`) health returned OK. Live Top Thai 43 manager smoke loaded the New Customer page, showed all seven active payment methods as buttons, and tapping Cash set the hidden submitted value to `Cash` and activated the Cash button.
