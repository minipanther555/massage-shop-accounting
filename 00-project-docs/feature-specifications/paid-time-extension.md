# Paid Time Extension Feature Specification

> **Section map.** This spec was authored before the canonical `/spec-creation-new-feature` layout was applied to it. Sections 10–13 were added on 2026-07-23 to supply what the steps-file mapping requires, and are **appended rather than renumbered** because live cross-references to §5, §7 and §9 already exist in the steps file and status rollups. Canonical equivalents: §1–2 ≈ Executive Summary + Scope · §3 ≈ Functional Requirements (numbered `PTE-xxx`, not `FR-xxx`) · §4 ≈ Acceptance Criteria · §5 ≈ Data Model Changes · §6 ≈ Non-Goals · §7–9 ≈ Risks & Open Questions · **§10 ≈ Integration Architecture** · **§11 ≈ State Transitions** · **§12 ≈ Rollout Plan** · **§13 ≈ Testing Requirements**.

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

When the customer extends the same service from one duration to a longer duration, the amount due is **today's price for the longer duration, including any promotion active right now, minus the amount the customer actually paid** for the original transaction.

Example: paid ฿500 for 60 minutes, extends to 90 minutes, and 90 minutes costs ฿700 at this moment, so the amount due is ฿200.

The subtraction uses the **amount actually paid**, not the catalog price of the original duration. Those differ whenever the original sale carried a promotion or discount, and using catalog-minus-catalog would overcharge a customer who bought at a promotional price.

**Zero-floor rule.** Because time-window promotions can begin after a massage has started, today's price for the longer duration can occasionally be lower than what the customer already paid — for example a full-price 60-minute massage bought before a promotion window opens, extended after it opens. In that case the amount due is zero. The system must never generate a refund, and reception must be shown that the amount came out zero rather than the screen appearing broken.

### PTE-004: Additional Service After Existing Massage

When the customer adds a different service after the current massage, the amount due is that service and duration's price **as it stands right now, including any active promotion** — the same price the customer would pay walking in for it separately. Example: after a 90-minute massage, add a 60-minute foot massage and charge today's 60-minute foot massage price.

Nothing is subtracted here. The original service was fully delivered and fully paid; this is a second service alongside it, not a replacement for it.

### PTE-005: Staff Commission and Pay Visibility

The added time/service must calculate the correct masseuse commission from the configured service catalog and appear in staff pay/reporting as an add-on component. Booking credit remains separate and must not be duplicated unless the add-on itself has an explicitly governed credit rule.

Commission is never split. The add-on's `masseuse_fee` is paid in full to whichever staff member performs the add-on, whether that is the original masseuse or a different one. There is no proportional division between the original service and the add-on.

### PTE-006: Time Window and Availability

The add-time flow must extend the staff member's occupied window and keep Current Shop Status, booking availability, and walk-in selection from showing the staff member free too early. The 15-minute readiness buffer after the final end time still applies.

### PTE-007: Receipt and Report Clarity

Recent activity, Daily Summary, financial reports, and Payday Tracking must show that the customer paid an additional amount, not that the original transaction was silently edited. The UI should make the original service and add-on understandable without adding clutter.

### PTE-008: Correction Boundary

If reception made a mistake while entering the add-on, correction should reverse or correct the add-on record without rewriting the original paid transaction unless the operator explicitly chooses to correct the original transaction.

### PTE-009: Extend Mode Bypasses the Busy-Staff Guard

Adding time or a service is a third reception mode alongside Walk-in and Booking. Walk-in mode disables any staff member whose `current_state` is not `available`, which is correct for new customers but wrong here: the staff member being extended is by definition mid-massage and therefore busy.

Extend mode must be entered from a specific active transaction, with that transaction's masseuse pre-selected, and the walk-in availability guard must not apply to her. The 15-minute readiness buffer must not block the extension either, because the customer is already on the bed.

If the added service is performed by a *different* staff member, normal availability rules apply to that staff member, and the add-on occupies her window rather than the original masseuse's.

### PTE-010: Massage Count Semantics

A `DURATION_UPGRADE` add-on does not increment the performing staff member's daily massage count: extending one customer from 60 to 90 minutes is one massage, not two.

An `ADDITIONAL_SERVICE` add-on does increment it, because a second service is a second piece of work and must affect walk-in queue fairness accordingly.

This rule governs every surface that counts massages, including Daily Summary's `นวดวันนี้` figure, the Today Staff count, the walk-in workload ranking, and manager reports.

### PTE-011: Pending Payment, Modelled on Pending Bookings

An add-on may be recorded before the customer pays, because customers ask for extra time mid-massage and usually settle everything when they leave. The behaviour follows the existing pending-booking pattern that reception already understands: the item is visible and outstanding, it is not revenue yet, and reception performs an explicit action to accept payment, at which point it enters the books.

- The add-on row is created **immediately** with `payment_status = 'PENDING'`, because the staff member starts the extra work straight away and the occupied time window must reflect that at once.
- A pending add-on is **excluded from all revenue and staff-pay totals** until settled, exactly as a pending booking contributes no revenue.
- A pending add-on **is** included in Current Shop Status and in the occupied time window, because the work is being performed regardless of when the money arrives.
- Reception must see an outstanding-payment reminder for it, in the same spirit as the existing `ยังไม่ชำระ` treatment for unpaid booking rows, so an extension cannot be silently forgotten.
- Settling it is an explicit reception action that moves `payment_status` to `PAID` and records the payment method. Only then does it become revenue and payable commission.

There is deliberately **no no-show concept** for add-ons. Unlike a booking, the customer is physically present and has already received the service; the only open question is payment, never attendance.

### PTE-012: Cancelling an Add-On Restores the Original Time Window

Cancelling or reversing an add-on returns the staff member's occupied window to the original transaction's end time plus the standard 15-minute buffer, freeing her at the time she would have been free had the add-on never been recorded.

This applies whether the add-on was `PENDING` or already `PAID`. Cancellation never modifies the original transaction, per PTE-002 and PTE-008.

### PTE-013: Outstanding Payments Survive End-Day

The existing end-day action rolls the day's totals into `daily_summaries` and then **deletes** the day's transaction rows (`backend/routes/reports.js:444-490`). A `PENDING` add-on caught by that would be destroyed, and because the summary counts only `ACTIVE` rows with no notion of pending, the outstanding money would disappear leaving no record that anyone owed it. The linked parent row would be deleted with it, breaking `parent_transaction_id` and contradicting PTE-002's guarantee that the original sale stays queryable.

Required behaviour, in priority order:

1. **The data survives.** A `PENDING` add-on and its parent transaction must remain in the database through end-day. Preservation is the hard requirement; nothing else in this requirement matters if the rows are gone.
2. **Reception is prompted, not blocked.** End-day lists any outstanding add-ons and asks reception to either settle each one or record it as written off with a short reason. Reception must never be prevented from closing the day, because the customer may have left hours earlier.
3. **The manager is told, persistently.** While any outstanding add-on remains unresolved, a notice stays visible to the manager identifying the affected business day, and it persists across sessions until the item is settled or written off. A one-time toast is not sufficient — an unresolved payment must still be visible days later.

This requirement is deliberately scoped to add-ons. The wider correctness of the end-day deletion is tracked separately and is out of scope here.

## 4. Acceptance Criteria

- AC-PTE-001: A receptionist can start add-time/add-service from an existing active transaction without entering normal edit/correction mode.
- AC-PTE-002: A same-service duration upgrade charges today's price for the longer duration, including any currently active promotion, minus the amount the customer actually paid on the original transaction.
- AC-PTE-003: A different-service add-on charges that service and duration's current price including any active promotion, with nothing subtracted.
- AC-PTE-004: Original paid transaction remains queryable as the original sale and is linked to the add-on.
- AC-PTE-005: Staff pay/reporting includes the add-on commission without double-counting the original commission.
- AC-PTE-006: Current Shop Status and New Customer availability use the extended final end time plus the 15-minute buffer.
- AC-PTE-007: Booking credit is not duplicated by add-time unless a future spec explicitly says it should be.
- AC-PTE-008: Correcting or cancelling an add-on does not silently rewrite the original paid transaction.
- AC-PTE-009: Extend mode can be started from an active transaction whose masseuse is currently `busy`, and the walk-in availability guard does not block her.
- AC-PTE-010: A different staff member may perform an `ADDITIONAL_SERVICE` add-on; normal availability rules apply to her and the add-on occupies her window, not the original masseuse's.
- AC-PTE-011: A `DURATION_UPGRADE` add-on leaves the performing staff member's daily massage count unchanged.
- AC-PTE-012: An `ADDITIONAL_SERVICE` add-on increases the performing staff member's daily massage count by exactly one.
- AC-PTE-013: A same-service upgrade is priced by recalculating the final duration at today's active promotion and subtracting the amount already paid.
- AC-PTE-014: A `PENDING` add-on occupies the staff member's time window and appears in Current Shop Status, but contributes nothing to revenue, masseuse fees, or payable staff pay.
- AC-PTE-015: Settling a `PENDING` add-on records its payment method, moves it to `PAID`, and moves it into revenue and payable commission, without altering the original transaction or duplicating commission.
- AC-PTE-016: Reception can see that an add-on is awaiting payment from a surface they routinely look at, so an extension cannot be silently forgotten.
- AC-PTE-017: An add-on has no no-show state; the only outstanding question is payment.
- AC-PTE-018: Cancelling an add-on, whether `PENDING` or `PAID`, returns the staff member's free-at time to the original transaction's end plus the 15-minute buffer, and leaves the original transaction unmodified.
- AC-PTE-019: When today's recalculated upgrade price is below the amount already paid, the amount due is zero, no refund is generated, and reception is shown that the amount is zero.
- AC-PTE-020: Running end-day with a `PENDING` add-on present leaves that add-on and its parent transaction in the database, queryable and still linked.
- AC-PTE-021: End-day lists outstanding add-ons and offers settle or write-off per item, and never prevents the day from being closed.
- AC-PTE-022: While an outstanding add-on is unresolved, the manager sees a persistent notice naming the affected business day, and that notice survives logout and reload until the item is settled or written off.
- AC-PTE-023: Settling an add-on that is already `PAID` is rejected, and the money is booked exactly once no matter how many times the action is submitted.
- AC-PTE-024: Settling a `CANCELLED` add-on, and cancelling an already-`CANCELLED` add-on, are both rejected.
- AC-PTE-025: An add-on cannot be created against a parent that is not `ACTIVE`, and cannot be created against another add-on — `parent_transaction_id` always references an original sale.
- AC-PTE-026: No add-on operation modifies the parent row; the parent is byte-identical before and after create, settle, and cancel.

## 5. Data Contract — CONFIRMED (2026-07-23)

The operator confirmed **linked add-on transaction rows**. A dedicated add-on table was considered and rejected.

An add-on is an ordinary row in `transactions`, carrying its own masseuse, service, duration, price, commission, payment method, and canonical start/end datetimes, plus three additive columns:

| Column | Values | Purpose |
|---|---|---|
| `parent_transaction_id` | `transactions.transaction_id` of the original sale, or `NULL` | Links the add-on to the original. The original row is never modified. |
| `add_on_kind` | `DURATION_UPGRADE` \| `ADDITIONAL_SERVICE` \| `NULL` | Distinguishes a same-service extension from a second service. `NULL` means an ordinary transaction. |
| `payment_status` | `PAID` \| `PENDING` | Supports deferred settlement per PTE-011, mirroring the pending-booking pattern. Existing rows default to `PAID`. |

All three are additive columns on the existing table, added through `addMissingColumns()`. No new table, no destructive migration.

### Why linked rows rather than a separate table

Money aggregation and massage counting live in the *same* SQL statements throughout `backend/routes/reports.js`. Linked transaction rows make every revenue, commission, and staff-pay sum correct with no query change; only the count expressions need a qualifier. A separate add-on table would invert that cost, requiring a union or join in roughly a dozen aggregation sites and duplicating the payment, status, promotion, and datetime machinery that `transactions` already provides.

The pattern is also established: `corrected_from_id` already links a transaction row to another transaction row.

### Downstream implications

- **Massage counts** must count a row when `parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE'`, per PTE-010. This governs the Today Staff count projection, the walk-in workload ranking, and every report count.
- **Revenue** must sum only `payment_status = 'PAID'`, per PTE-011. This is the largest single change in the backend step.
- **Busy windows need no new logic.** The current-status query already selects the `ACTIVE` row with the latest end time per staff member, so an add-on row for the same masseuse extends her occupied window automatically, and the 15-minute buffer lands after the final end time.
- **Pricing must come from the server.** The existing quote path already returns catalog price and commission with promotions applied; the add-on amount is derived there and never trusted from the client.
- **Booking credit** is unaffected: an add-on never creates a second credit.

## 6. Non-Goals

- Do not replace the existing correction/edit flow.
- Do not silently mutate historical paid amounts.
- Do not guess promotion, loyalty, or discount stacking for add-ons; use the existing price/promotion contract only after CFEP confirms it applies.
- Do not change booking credit rules without a separate explicit requirement.

## 7. Resolved Questions (operator, 2026-07-23)

1. **Immediate payment or settle later?** — Settle-later is allowed, modelled on the existing pending-booking flow: the add-on exists immediately as `PENDING`, reception sees it as outstanding, and an explicit accept-payment action turns it into revenue. No no-show concept. See PTE-011 and AC-PTE-014 through AC-PTE-017.
2. **Promotions on a same-service upgrade?** — Recalculate on the final longer duration at today's active promotion, then subtract what was already paid, so the customer pays the correct promotional price for what they actually received. See AC-PTE-013.
3. **Can a different staff member perform the add-on?** — Yes, for `ADDITIONAL_SERVICE`. Commission is never split; it goes wholly to whoever performs the add-on. A `DURATION_UPGRADE` is always the same masseuse. See PTE-005 and PTE-009.
4. **Group the original and add-on visually, or separate rows?** — Separate linked rows sharing `parent_transaction_id`, following the confirmed data contract in §5. Presentation grouping is a UI concern for PTE-003 and does not change storage.

## 8. Resolved Questions (operator, second pass 2026-07-23)

5. **Does today's promotion apply to a different-service add-on?** — Yes. It is priced exactly as any sale made right now. See PTE-004 and AC-PTE-003.
6. **What if the recalculated upgrade price is below what was paid?** — Charge zero, never refund, and show reception the zero. This arises when a time-window promotion opens after the massage started. See AC-PTE-019.
7. **When does a pending add-on become revenue, and what if it is forgotten?** — On explicit settlement only. Reception gets an outstanding-payment reminder so it cannot silently disappear. See PTE-011, AC-PTE-015 and AC-PTE-016.
8. **What happens to occupied time when an add-on is cancelled?** — It reverts to the original transaction's end plus the 15-minute buffer. See PTE-012 and AC-PTE-018.

9. **Should end-day block on outstanding add-ons?** — No. Prompt per item with settle or write-off, never block, and keep a persistent manager notice until it is resolved. The overriding requirement is that the rows survive end-day at all. See PTE-013 and AC-PTE-020 through AC-PTE-022.

## 9. Remaining Open Questions

1. Exactly which surface carries the outstanding-payment reminder — Home Recent Activity, Daily Summary, the New Customer active-transaction list, or more than one. This is a PTE-003 placement decision and does not affect the data model.

## 10. Integration Architecture

### Upstream dependencies (what the add-on reads)

- **Service catalog + promotion configuration** — `services` rows and the branch time-window promotion, reached through `getTimeWindowQuote()` in `backend/services/time-window-promotion-service.js`. This is the sole source of price and commission; it is already server-authoritative and must not be duplicated.
- **The parent transaction row** — supplies `payment_amount` actually paid, `service_type`, `duration`, `masseuse_name`, and `end_datetime`. The add-on reads it and never writes it.
- **Today Staff / current business day** — determines which masseuse may perform an `ADDITIONAL_SERVICE` and supplies the business day the add-on belongs to.

### Downstream dependencies (what consumes the add-on)

- **Current Shop Status** (`GET /api/staff/current-status`) — consumes the add-on's `end_datetime` through the existing latest-end-time-per-staff selection. Requires no change; requires verification.
- **Massage counting** — the `today_massages` projection in `backend/routes/staff.js`, which feeds both the Daily Summary count and the walk-in workload ranking.
- **Financial aggregation** — the revenue, commission, and staff-pay sums in `backend/routes/reports.js`, plus the count subqueries in `backend/routes/admin.js`.
- **Reception and manager surfaces** — New Customer, Daily Summary, Home Recent Activity, Payday Tracking.
- **End-day** (`POST /api/reports/end-day`) — currently deletes the day's transaction rows; must preserve add-on and parent rows.

### Contracts introduced or changed

| Contract | Change |
|---|---|
| `transactions` schema | **Additive only** — `parent_transaction_id`, `add_on_kind`, `payment_status`. Shared contract; gates everything downstream. |
| Add-on create / settle / cancel | New server actions on the transaction route. |
| `GET /api/staff/current-status` payload | **Unchanged.** Add-ons flow through the existing latest-end-time rule. |
| Report and count queries | Predicates change; response shapes do not. |
| End-day | Deletion predicate narrows to preserve linked rows. |

### Resulting dependency order (this determines phase ordering)

```
schema contract
  → add-on write path (create / settle / cancel)
    → aggregation correctness (counts, revenue, staff pay)
      → reception UI
        → end-day safety
          → verification & hardening
            → deploy & live-verify
```

Each stage depends on every stage above it. Aggregation is placed before UI deliberately: it is the highest-regression-risk work and must be provably correct before anything visible is layered on top of it.

## 11. State Transitions

An add-on row carries **two orthogonal state axes**. Conflating them is the primary correctness risk in this feature.

- **`status`** — the row lifecycle, shared with every other transaction: `ACTIVE`, `CANCELLED`.
- **`payment_status`** — whether the money has arrived: `PENDING`, `PAID`.

A row can be `ACTIVE` + `PENDING` (work happening, money owed), `ACTIVE` + `PAID` (normal), or `CANCELLED` at either payment state.

### Valid transitions

| From | To | Trigger | Effect |
|---|---|---|---|
| — | `ACTIVE` + `PAID` | create, paid immediately | occupies time; counts as revenue at once |
| — | `ACTIVE` + `PENDING` | create, settle later | occupies time; **no** revenue, **no** payable commission |
| `ACTIVE` + `PENDING` | `ACTIVE` + `PAID` | settle | records payment method; enters revenue and payable commission exactly once |
| `ACTIVE` + `PENDING` | `CANCELLED` | cancel | restores the parent's occupied window; no money moves |
| `ACTIVE` + `PAID` | `CANCELLED` | cancel | restores the parent's occupied window; removes its revenue and commission |

### Invalid transitions — each must be rejected, not silently absorbed

- **Settling an already-`PAID` add-on** — a double submit would book the same money twice. This is the single most likely production failure in this feature.
- **Settling a `CANCELLED` add-on.**
- **Cancelling an already-`CANCELLED` add-on.**
- **Creating an add-on whose parent is not `ACTIVE`** — a corrected, edited, or cancelled parent cannot take an extension.
- **Creating an add-on whose parent is itself an add-on** — add-ons do not nest; `parent_transaction_id` always points at an original sale.
- **Any transition that modifies the parent row.** The parent is immutable from this feature's perspective.

### Recovery behaviour

Cancellation returns the performing staff member's occupied window to the parent transaction's `end_datetime` plus the 15-minute buffer, per PTE-012. Where an `ADDITIONAL_SERVICE` was performed by a different masseuse, cancellation frees *her* window and leaves the original masseuse untouched.

## 12. Rollout Plan

### Migration strategy

Three additive `ALTER TABLE ADD COLUMN` statements, added as entries in the existing idempotent `addMissingColumns()` routine in `backend/models/database.js`, which runs at server start. No data migration, no backfill, no destructive operation. SQLite applies `ADD COLUMN` as a metadata-only change.

Defaults preserve all existing behaviour exactly: existing rows get `parent_transaction_id = NULL` and `add_on_kind = NULL`, so every historical transaction continues to count as one massage; and `payment_status` defaults to `PAID`, so no historical revenue is reclassified.

Governed by `/db-ops-regular` at **Mode B** (`DB_VALUE = VALUABLE` — real shop data). That protocol is written for Alembic on Postgres; this project has neither. The inapplicable laws must be **declared inapplicable with a stated reason, never silently skipped**: the revision-graph and single-stamp laws, the deterministic `alembic --sql` artifact law, artifact hashing, `StampDiscipline`, and the revision assertions inside `PostDeployVerifyGate`. What applies and must be honoured: the Prime Directive, the Artifact Law, `ConsumerCompatGate` (a vacuous PASS — purely additive, nothing renamed or dropped), `SchemaAssertionGate` Light, the Security Gate, the Perf Gate, and the Permanent Guardrails Law into `tests/otdd/`.

### Deployment strategy

Two deploys, per the shipping doctrine. **Deploy #1** is a mid-steps verify-push of the session's working branch with **no number minted**, so the reception iPad can be used for live-verify. **Deploy #2** happens at `/push`, moving the server onto the newly minted number.

This application runs reads and writes in a single Node process, so there is no reader/writer split: **every deploy here restarts the write path and therefore requires the operator's explicit OK.**

### Rollback conditions and posture

Roll back if add-on creation errors, if any report figure moves unexpectedly against known-good values, or if a staff member's availability is wrong after an extension.

Rollback is **code-only**: switch the server to the previous `testingNN` and restart. The three columns stay in place and are harmless, because the prior code never selects them and the defaults make every row read exactly as it did before. There is no down-migration and none is needed.

### Backward compatibility

Old rows are indistinguishable from pre-feature behaviour by construction. Old clients are unaffected: the `current-status` payload is unchanged, and report response shapes are unchanged — only their predicates narrow.

### Feature flag

None. The feature is inert until reception uses the Extend action, so a flag would add a failure mode without reducing risk.

## 13. Testing Requirements

### Unit

Pricing derivation for both add-on kinds, including a promotional parent (proving amount-paid is used rather than catalog price) and the zero-floor case. Count-rule predicate. Revenue-filter predicate.

### Integration

Create, settle, and cancel through the real route boundary against a real test database: both operator scenarios (60→90 upgrade; 90-minute massage plus a 60-minute foot massage), an `ADDITIONAL_SERVICE` performed by a different masseuse, and a `PENDING` add-on that occupies the staff window while contributing nothing to revenue.

### End-to-end

Browser-driven on the reception surface: Extend entered against a masseuse the system reports as `busy`, amount due displayed, saved as pending, then settled — with mirrored `transaction.html` / `transaction.ejs` verified in step.

### Failure

Every invalid transition in §11 rejected: double settlement, settle-after-cancel, cancel-after-cancel, non-`ACTIVE` parent, nested add-on, and any attempt to modify the parent row. Client-supplied price, commission, or discount must be ignored outright rather than validated.

### Regression

A fixed-seed before/after comparison of every affected report figure, asserting that only the intended figures move. Add-on and parent rows survive end-day. Existing transactions with `NULL` add-on columns continue to count and aggregate exactly as before.
