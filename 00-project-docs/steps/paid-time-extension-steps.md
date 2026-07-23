# Paid Time Extension Steps

> **Status:** SPEC CREATED ONLY (2026-07-23); implementation not started
> **Feature Specification:** `00-project-docs/feature-specifications/paid-time-extension.md`

## PTE-001 - CFEP and Data-Model Decision

**Status:** OPEN

**Goal:** Build the full model for how current paid transactions, correction/reversal, booking arrivals, staff pay, Current Shop Status, and reports represent original paid services before choosing the add-on data shape.

**Dependencies:** `00-project-docs/feature-specifications/paid-time-extension.md`, `web-app/transaction.html`, `web-app/transaction.html.md`, `backend/routes/transactions.js`, `backend/routes/transactions.js.md`, `backend/models/database.js`, booking-credit docs, report/payday docs, Daily Summary current status docs.

**Expected Output/Deliverable:** A confirmed design decision choosing either linked add-on transaction rows or a dedicated add-on table, with the exact downstream reporting/status implications documented before implementation.

**Technical Considerations:** Original paid transactions must remain intact. Avoid using correction/edit as the add-time mechanism. Preserve current booking-credit separation and Today Staff ranking rules.

**Potential Challenges and Mitigations:** Add-time touches payment, staff pay, status timing, and reports. Mitigate by reading all affected co-located docs and adding RED tests for both same-service duration upgrade and different-service add-on before writing code.

**Validation:** CFEP chain is closed and the operator confirms the data model and UI entry point.

## PTE-002 - Backend Add-Time Contract

**Status:** OPEN

**Goal:** Add the server contract for creating a paid add-time/add-service record linked to the original transaction.

**Dependencies:** PTE-001, transaction route/model, service catalog pricing, promotion/discount service if applicable, staff pay/report query paths.

**Expected Output/Deliverable:** Backend endpoint or transaction route branch that validates original transaction state, calculates amount due, persists add-on data, and returns the linked original/add-on result.

**Technical Considerations:** Same-service longer-duration upgrades charge only the configured price difference. Different-service add-ons charge the configured added service/duration price. Persist canonical add-on start/end datetimes so availability does not drift.

**Potential Challenges and Mitigations:** Price/promotion stacking may be ambiguous. Keep unclear discount behavior blocked until operator answers the open questions.

**Validation:** Integration tests prove 60-to-90 same-service difference pricing, 90-plus-60-foot added-service pricing, invalid original transaction handling, and no booking-credit duplication.

## PTE-003 - Reception UI Flow

**Status:** OPEN

**Goal:** Add a Thai-first add-time/add-service action for an active transaction without sending reception through normal correction/edit.

**Dependencies:** PTE-002, New Customer recent transaction/correction UI, current service/duration button contracts, payment method controls.

**Expected Output/Deliverable:** Reception can choose an active massage, select same-service extension or additional service/duration, see amount already paid, amount due now, final end time, and save the add-on.

**Technical Considerations:** Preserve existing hidden select contracts and mirrored `transaction.html` / `transaction.ejs` behavior. The UI must communicate that this is an extra charge, not a correction.

**Potential Challenges and Mitigations:** Avoid cluttering the New Customer first viewport. Use an inline detail/action surface from the clicked recent/active transaction rather than a separate always-visible table.

**Validation:** Frontend contract tests and browser smoke prove both target scenarios are visible, understandable, and produce the expected payload.

## PTE-004 - Status, Reports, and Payday Visibility

**Status:** OPEN

**Goal:** Make add-time records visible in Current Shop Status, Daily Summary, Home Recent Activity, Financial Reports, and Payday Tracking without double-counting original payment or commission.

**Dependencies:** PTE-002/PTE-003, `GET /api/staff/current-status`, report routes, shared staff-pay mapping, Home/Daily Summary/Payday renderers.

**Expected Output/Deliverable:** Extended final end time drives availability; reports show original and add-on money clearly; staff pay includes add-on commission once.

**Technical Considerations:** Current Shop Status must use the final occupied window plus the 15-minute buffer. If add-ons are separate transaction rows, report queries must group or label them clearly enough for manager review.

**Potential Challenges and Mitigations:** Existing reports already separate base commission and booking credit. Add-time should become a third explicit concept only if required; otherwise keep it as a normal paid transaction linked to the original.

**Validation:** Report/status regression tests and browser smokes prove no double-counting and no early-free staff state.

## PTE-005 - Docs, Security, and Handover

**Status:** OPEN

**Goal:** Synchronize co-located docs, governed ledgers, security review, and handover after implementation.

**Dependencies:** PTE-001 through PTE-004.

**Expected Output/Deliverable:** Updated module specs, current steps/status rollups, verification receipts, and a checkpoint handover packet.

**Technical Considerations:** This feature touches money and staff pay, so security/correctness review must cover input validation, authorization, price tampering, duplicate submits, and report double-counting.

**Potential Challenges and Mitigations:** Treat client-sent price/commission as display-only; server must calculate charge and staff pay from trusted catalog data.

**Validation:** Lint, focused tests, browser smoke, `git diff --check`, and explicit security review pass or produce tracked blockers.
