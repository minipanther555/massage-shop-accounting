# Paid Time Extension Feature Specification

## 1. Purpose

Reception needs a governed way to add paid time or an additional service after a customer has already paid and started a massage. The action is similar to editing because it changes the customer's final service window, but it must not overwrite the original paid transaction. The system must preserve the original payment record, create an auditable add-on record, calculate only the additional amount still owed, and keep staff availability/status accurate after the added time.

## 2. Current Evidence and Scope

- New Customer currently creates one paid transaction with selected staff, service, duration, price, commission, start time, and end time.
- Correction/edit flows are for fixing mistakes, not for selling extra time after payment.
- Current Shop Status derives busy windows from transaction start/end datetimes, so extension work must update the status source of truth without hiding the original paid sale.
- The operator gave two real target cases:
  - a customer paid for 60 minutes, then wants 90 minutes instead;
  - a customer booked or received a 90-minute massage, then wants an additional 60-minute foot massage afterward.

## 3. Functional Requirements

### PTE-001: Separate Add-Time Action

The UI must expose an explicit add-time/add-service action from an existing active transaction or active massage. Reception must not use normal correction/edit as the primary path for this scenario.

### PTE-002: Preserve Original Paid Transaction

The original transaction remains intact as the record of what was already paid. The add-time action creates a linked add-on record or linked transaction that references the original transaction.

### PTE-003: Price Difference for Same-Service Duration Upgrade

When the customer extends the same service from one duration to a longer duration, the amount due is the configured price of the longer service/duration minus the amount already paid for the original service/duration. Example: paid 60 minutes, extends to 90 minutes, charge only the 90-minute price minus the 60-minute price.

### PTE-004: Additional Service After Existing Massage

When the customer adds a different service after the current massage, the amount due is the configured price of the added service/duration. Example: after a 90-minute massage, add a 60-minute foot massage and charge the 60-minute foot massage price.

### PTE-005: Staff Commission and Pay Visibility

The added time/service must calculate the correct masseuse commission from the configured service catalog and appear in staff pay/reporting as an add-on component. Booking credit remains separate and must not be duplicated unless the add-on itself has an explicitly governed credit rule.

### PTE-006: Time Window and Availability

The add-time flow must extend the staff member's occupied window and keep Current Shop Status, booking availability, and walk-in selection from showing the staff member free too early. The 15-minute readiness buffer after the final end time still applies.

### PTE-007: Receipt and Report Clarity

Recent activity, Daily Summary, financial reports, and Payday Tracking must show that the customer paid an additional amount, not that the original transaction was silently edited. The UI should make the original service and add-on understandable without adding clutter.

### PTE-008: Correction Boundary

If reception made a mistake while entering the add-on, correction should reverse or correct the add-on record without rewriting the original paid transaction unless the operator explicitly chooses to correct the original transaction.

## 4. Acceptance Criteria

- AC-PTE-001: A receptionist can start add-time/add-service from an existing active transaction without entering normal edit/correction mode.
- AC-PTE-002: Same-service duration upgrade charges only the configured price difference.
- AC-PTE-003: Different-service add-on charges the full configured price for the added service/duration.
- AC-PTE-004: Original paid transaction remains queryable as the original sale and is linked to the add-on.
- AC-PTE-005: Staff pay/reporting includes the add-on commission without double-counting the original commission.
- AC-PTE-006: Current Shop Status and New Customer availability use the extended final end time plus the 15-minute buffer.
- AC-PTE-007: Booking credit is not duplicated by add-time unless a future spec explicitly says it should be.
- AC-PTE-008: Correcting or cancelling an add-on does not silently rewrite the original paid transaction.

## 5. Data Contract Draft

The implementation must choose and document one of these shapes during CFEP:

1. A linked add-on transaction row, for example `transaction_type = 'ADD_TIME'` or equivalent, with `parent_transaction_id`.
2. A dedicated add-on table linked to `transactions.transaction_id`.

Either shape must preserve:
- original transaction id;
- add-on service type, duration, price charged, commission, payment method, start/end datetimes;
- whether the add-on is same-service extension or different-service addition;
- active/corrected/cancelled status.

## 6. Non-Goals

- Do not replace the existing correction/edit flow.
- Do not silently mutate historical paid amounts.
- Do not guess promotion, loyalty, or discount stacking for add-ons; use the existing price/promotion contract only after CFEP confirms it applies.
- Do not change booking credit rules without a separate explicit requirement.

## 7. Open Questions

1. Should an add-on be paid immediately through the same payment method options, or can it be unpaid/settled later?
2. For a same-service duration upgrade, should promotions be recalculated on the final longer duration or only on the added difference?
3. If the additional service is performed by a different staff member, should the UI support splitting the add-on to another masseuse in the first version?
4. Should receipts/reports group the original and add-on together visually, or show separate rows with a shared parent id?
