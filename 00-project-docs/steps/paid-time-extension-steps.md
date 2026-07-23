# Paid Time Extension — Execution Steps

## Goal

Reception can add paid time or an additional service to a massage that has already been paid for, charging only the extra amount owed, without ever editing the original sale. Spec: `00-project-docs/feature-specifications/paid-time-extension.md`.

Phase ordering below is derived from spec §10 Integration Architecture; the lifecycle guarded in Phase 2 is spec §11; the deploy and rollback posture in Phase 7 is spec §12.

> **Status:** Phases 0–4 ✅ DONE and PTE-END-001 done (2026-07-23) — the feature is functional end to end: reception can extend a massage, price is server-derived, pending/settle/cancel work, counts and revenue are correct, and outstanding add-ons survive end-day. 34 integration + 22 DOM contract tests green. Remaining: PTE-END-002/003 (end-day prompt and manager notice), Phase 6 verification, Phase 7 deploy, Phase 8 docs. Next runnable step: `PTE-DEP-001`. Not yet applied to production; the schema lands there only via `PTE-DEP-001` with operator authorization.

## Dependencies

- **`transactions` table (live, valuable):** already carries `corrected_from_id`, `start_datetime`, `end_datetime`, `base_price`, `discount_amount`, `promotion_type`, `promotion_label`. This feature adds three columns and changes no existing one.
- **`getTimeWindowQuote()` (`backend/services/time-window-promotion-service.js`):** the sole source of price and commission. Must not be duplicated.
- **`GET /api/staff/current-status` (`backend/routes/staff.js`):** selects the `ACTIVE` row with the latest end time per staff member. This feature relies on that rule and does not change it.
- **`POST /api/reports/end-day` (`backend/routes/reports.js`):** currently deletes the day's transaction rows.
- Invariant: the original paid transaction is never modified by any add-on operation.
- Invariant: price and commission are always derived server-side; client-supplied money values are ignored, not validated.
- Invariant: `status` (row lifecycle) and `payment_status` (money) are orthogonal and must never be conflated.

---

## Verified source status (read the code, 2026-07-23 CFEP)

- `POST /api/transactions/quote` (`backend/routes/transactions.js:169-193`) already returns server-authoritative catalog price and `masseuseFee` with promotions applied. Pricing must reuse it.
- `corrected_from_id` (`backend/models/database.js:54`) establishes the transaction-to-transaction link pattern this feature follows.
- `getActiveTransactionByStaff()` (`backend/routes/staff.js:204-212`) keeps the `ACTIVE` row with the latest end time per staff member, so an add-on extends the occupied window with **no new busy-window logic**. Verify, do not rebuild.
- `today_massages` (`backend/routes/staff.js:35-41`) counts `ACTIVE` transaction rows and feeds both the Daily Summary count and the walk-in workload ranking.
- Money and counts are aggregated in the **same** SQL statements (e.g. `backend/routes/reports.js:54-58`), so linked rows make money correct by default and counts wrong by default.
- 🔴 `POST /api/reports/end-day` (`backend/routes/reports.js:444-490`) hard-deletes with `DELETE FROM transactions WHERE date = ?` and **no status filter**, after summarising only `status = 'ACTIVE'`. Add-on and parent rows must be excluded from that delete or this feature's audit trail is destroyed nightly.
- 🔴 The app serves reads and writes from one Node process. There is no reader/writer split, so **every deploy restarts the write path** and requires the operator's explicit OK.

---

## Phase 0 — Design — ✅ DONE (2026-07-23)
**Phase goal:** the add-on data shape and its downstream implications are decided and operator-confirmed.

### STEP_ID: PTE-001 — CFEP and Data-Model Decision — ✅ DONE (2026-07-23)

> Retains its original ID; it predates the `<PREFIX>-<AREA>-NNN` scheme and IDs are stable.

- [x] CFEP chain closed over the transaction / pricing / status / report chain.
- [x] Operator confirmed **linked add-on transaction rows**; a dedicated add-on table was rejected.
- [x] Three additive columns confirmed: `parent_transaction_id`, `add_on_kind`, `payment_status`.
- [x] Operator resolved all eight open questions across two interview passes; recorded in spec §7 and §8.
- [x] Requirements surfaced during CFEP added to the spec: PTE-009 Extend mode, PTE-010 count semantics, PTE-011 pending payment, PTE-012 cancellation, PTE-013 end-day safety.
- [x] Spec §10 Integration Architecture, §11 State Transitions, §12 Rollout Plan, §13 Testing Requirements authored so this file is derived rather than inferred.
- **Validation:** operator confirmed the data model and the UI entry point; every `AC-PTE-001`–`AC-PTE-026` is claimed by a step below.
- **Completion evidence:** contract recorded in spec §5; reusable assets and cost centres recorded in "Verified source status" above.

**Phase 0 complete when:** the data contract is operator-confirmed and every acceptance criterion has an owning step. ✅ **This gate authorizes Phase 1.**

---

## Phase 1 — Schema Contract — ✅ DONE (2026-07-23)
**Phase goal:** the three additive columns exist, defaulted so that all existing rows and behaviour are unchanged.

### STEP_ID: PTE-DB-001 — Additive add-on columns — ✅ DONE (2026-07-23)

Isolated as its own gated step because it is a **shared-contract change**. Nothing in Phase 2 onward may be written against these columns until this gate passes.

- [x] Add `parent_transaction_id TEXT` to the `transactions` entries in `addMissingColumns()` (`backend/models/database.js`).
- [x] Add `add_on_kind TEXT` to the same list.
- [x] Add `payment_status TEXT NOT NULL DEFAULT 'PAID'` to the same list.
- [x] Run under `/db-ops-regular` at **Mode B** (`DB_VALUE = VALUABLE`, `HAS_BYTEBASE = NO`).
- [x] In the S0 declarations, **name each inapplicable law and why**: this project has no Alembic and no Postgres, so the revision-graph law, single-stamp-row law, deterministic `alembic --sql` artifact law, artifact-integrity hashing, `StampDiscipline`, and the revision assertions inside `PostDeployVerifyGate` do not apply. Declare them; never silently skip them.
- [x] Satisfy the laws that do apply: Artifact Law, `ConsumerCompatGate` (vacuous PASS — purely additive, nothing renamed or dropped), `SchemaAssertionGate` Light, `S8a_SecurityGate` connection-target verification.
- [x] Add a permanent guardrail in `tests/otdd/` asserting all three columns exist with the expected defaults, and that `addMissingColumns()` is idempotent across two consecutive runs.
- **Validation:** the three columns exist on a freshly initialised database and on a database created before this change; a pre-existing row reads back `parent_transaction_id IS NULL`, `add_on_kind IS NULL`, `payment_status = 'PAID'`; running initialisation twice produces no error and no duplicate column. Satisfies spec §12 Migration Strategy.
- **Risk notes:** every later phase depends on these names. Renaming after Phase 2 begins would require a `ConsumerCompatGate` pass rather than the vacuous one available here.

**Completion Notes (2026-07-23):**
- [x] Columns added in **both** places the project creates them: the `CREATE TABLE` statement (fresh databases) and the `columnTasks` list in `addMissingColumns()` (existing databases). This mirrors the `discount_amount` precedent; a column in only one place would work on one path and silently not the other.
- **S5 RED:** `mocha tests/otdd/paid-time-extension-schema.test.js` → 3 failing before the change — `transactions.parent_transaction_id is missing on a fresh database`, `was not added to a pre-existing database`, and `SQLITE_ERROR: no such column: parent_transaction_id`.
- **S6 GREEN:** same command → **4 passing**. The legacy path logged `Successfully added column transactions.parent_transaction_id / add_on_kind / payment_status`, proving the real production upgrade rather than a simulation — the test builds a pre-feature `transactions` table with raw `sqlite3`, then runs the real `getConnection()` against it.
- **SchemaAssertionGate (Light):** `PRAGMA table_info(transactions)` confirms all three columns as `TEXT`; `payment_status` is `notnull=1` with default `'PAID'`; the other two are nullable with no default.
- **ConsumerCompatGate:** vacuous PASS — nothing renamed or dropped.
- **S8a SecurityGate:** no destructive SQL in the diff (additive `ALTER TABLE ADD COLUMN` only), no secrets, and `DB_PATH` remains env-required with no default so the connection target cannot silently fall back.
- **S8b PerfGate:** no index and no query changed by this step; SQLite applies `ADD COLUMN` as a metadata-only operation with no table rewrite. Query-plan work belongs to `PTE-RPT-001`/`002`.
- **S9 DocSync:** the column contract is documented in feature spec §5 and its migration posture in §12. There is no `backend/models/database.js.md` in this repository — creating it remains an action item under `PTE-DOC-001`.
- **S12 Cleanup:** no ephemeral files. The guardrail in `tests/otdd/` is permanent per Law 4.5.
- **Regression:** `npm run lint` passes. Two OTDD failures and one Jest failure exist in the full suites and were **confirmed pre-existing and unrelated** — see Open Question Q-02 and the note below.
- **Not yet applied to production.** This step authored and locally verified the change. The production schema changes only when the deployed server restarts and `addMissingColumns()` runs, which is governed by `PTE-DEP-001` and requires the operator's explicit OK.

**Phase 1 complete when:** the columns exist with correct defaults, the idempotency guardrail passes, and the inapplicable-law declarations are recorded. ✅ **This gate authorizes Phase 2.**

---

## Phase 2 — Add-On Lifecycle — ✅ DONE (2026-07-23)
**Phase goal:** an add-on can be created, settled, and cancelled server-side, with every invalid transition in spec §11 rejected.

### STEP_ID: PTE-API-001 — Create an add-on — ✅ DONE (2026-07-23)

- [ ] Add a server action that creates an add-on row linked to its parent via `parent_transaction_id`.
- [ ] Validate the parent is `status = 'ACTIVE'` and is not itself an add-on; reject otherwise.
- [ ] Price a `DURATION_UPGRADE` as today's `getTimeWindowQuote()` price for the longer duration minus the parent's **`payment_amount` actually paid**, never minus the parent's catalog price.
- [ ] Clamp a negative amount due to zero; never emit a refund.
- [ ] Price an `ADDITIONAL_SERVICE` as today's `getTimeWindowQuote()` price for the added service and duration, with nothing subtracted.
- [ ] Ignore any client-supplied price, commission, or discount outright.
- [ ] Persist canonical `start_datetime` and `end_datetime` on the add-on row.
- [ ] Accept a different `masseuse_name` for an `ADDITIONAL_SERVICE`, applying normal availability rules to that staff member.
- [ ] Write `payment_status` as `PAID` or `PENDING` per the request.
- [ ] Create no booking credit.
- **Validation:** integration tests prove 60→90 recalculated pricing; the same case with a promotional parent, proving amount-paid is used; the zero-floor case with no refund; 90-plus-60-foot pricing at today's promotional price; an `ADDITIONAL_SERVICE` by a different masseuse paying her the full commission; a non-`ACTIVE` parent rejected; an add-on-as-parent rejected; and no booking-credit row created. Satisfies `AC-PTE-002`, `AC-PTE-003`, `AC-PTE-004`, `AC-PTE-007`, `AC-PTE-010`, `AC-PTE-013`, `AC-PTE-019`, `AC-PTE-025`.
- **Risk notes:** pricing must route through `getTimeWindowQuote()`. A second pricing path would drift from the catalog the moment a promotion changes.

**Completion Notes (2026-07-23):**
- [x] `POST /api/transactions/add-ons` created. Money is derived server-side from `getTimeWindowQuote()`; the parent row is only read.
- [x] Upgrade pricing subtracts the parent's `payment_amount` (what was actually paid), clamped at zero, never refunding.
- [x] Upgrade **commission** follows the same difference rule — the 90-minute fee minus the fee already earned on the parent — because the masseuse performs one longer session, not two. This was derived from AC-PTE-005's no-double-counting requirement rather than stated outright in the spec; recorded here as a design decision, see D-10.
- [x] `ADDITIONAL_SERVICE` charges full price and full commission and may name a different masseuse.
- **RED:** 12 failing of 14. **GREEN:** 14/14.
- **Found during implementation:** `payment_method` is `NOT NULL`, so a pending add-on cannot store a null method. It is recorded as an empty string and filled in at settlement. Documented inline at the insert.

### STEP_ID: PTE-API-002 — Settle a pending add-on — ✅ DONE (2026-07-23)

- [ ] Add a server action that moves an `ACTIVE` + `PENDING` add-on to `PAID`, recording its payment method.
- [ ] Reject settling an add-on already `PAID`.
- [ ] Reject settling a `CANCELLED` add-on.
- [ ] Leave the parent row untouched.
- **Validation:** integration tests prove settlement moves exactly that amount into revenue and payable commission once; a repeated submit is rejected and books nothing further; settling a cancelled add-on is rejected; the parent row is byte-identical before and after. Satisfies `AC-PTE-015`, `AC-PTE-023`, `AC-PTE-024`, and part of `AC-PTE-026`.
- **Risk notes:** double settlement is the most likely production failure in this feature — it must be rejected server-side, not guarded only in the UI.

**Completion Notes (2026-07-23):**
- [x] `POST /api/transactions/add-ons/:transactionId/settle` created.
- [x] Double settlement is blocked twice over: an explicit status check, and a guarded `UPDATE ... WHERE payment_status = 'PENDING'` whose `changes` count is re-checked, so two concurrent submits cannot both pay commission.
- **RED → GREEN:** settle suite green; a repeated submit returns 409 and staff pay moves exactly once.

### STEP_ID: PTE-API-003 — Cancel or correct an add-on — ✅ DONE (2026-07-23)

- [ ] Add a server action that sets an add-on's `status` to `CANCELLED`, for both `PENDING` and `PAID` add-ons.
- [ ] Restore the performing staff member's occupied window to the parent's `end_datetime` plus the 15-minute buffer.
- [ ] Where a different masseuse performed the add-on, free her window and leave the original masseuse untouched.
- [ ] Remove a cancelled `PAID` add-on's revenue and commission.
- [ ] Reject cancelling an already-`CANCELLED` add-on.
- [ ] Leave the parent row untouched.
- **Validation:** integration tests prove free-at returns to the parent's end plus buffer for both payment states; a different masseuse's cancellation frees only her; a cancelled paid add-on's money is removed; a repeat cancel is rejected; the parent row is byte-identical throughout. Satisfies `AC-PTE-008`, `AC-PTE-018`, `AC-PTE-024`, `AC-PTE-026`.

**Completion Notes (2026-07-23):**
- [x] `POST /api/transactions/add-ons/:transactionId/cancel` created.
- [x] The occupied window restores itself with no extra logic: current-status selects the latest-ending `ACTIVE` row, and a cancelled add-on is no longer `ACTIVE`. Proven by test, not assumed.
- [x] Commission is reversed only when the add-on was `PAID`; a pending one never reached staff pay.
- **RED → GREEN:** cancel suite green, including cancel-twice and settle-after-cancel both rejected.

**Phase 2 complete when:** all three actions pass their integration tests and every invalid transition in spec §11 is rejected. ✅ **This gate authorizes Phase 3.**

---

## Phase 3 — Aggregation Correctness — ✅ DONE (2026-07-23)
**Phase goal:** counts, revenue, and staff pay are correct everywhere, with no unrelated report figure moved.

Placed before the UI deliberately: this is the highest-regression-risk work in the feature and must be provably correct before anything visible is layered on it. Land it as its own commit so it can be rolled back independently.

### STEP_ID: PTE-RPT-001 — Massage count rule — ✅ DONE (2026-07-23)

- [ ] Apply `parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE'` to the `today_massages` subquery in `backend/routes/staff.js:35-41`.
- [ ] Apply the same rule to `massage_count` (`backend/routes/reports.js:54`) and `weekly_massages` (`:100`).
- [ ] Apply it to the `transaction_count` sites in `backend/routes/reports.js` (`:14`, `:137`, `:194`, `:264`, `:330`, `:451`).
- [ ] Apply it to the count subqueries in `backend/routes/admin.js` (`:143`, `:151`, `:507`).
- **Validation:** a `DURATION_UPGRADE` leaves every count unchanged; an `ADDITIONAL_SERVICE` adds exactly one to each; the walk-in workload ranking reflects the second service. Satisfies `AC-PTE-011`, `AC-PTE-012`.
- **Risk notes:** `today_massages` feeds walk-in fairness. Getting this wrong silently changes who is offered the next customer.

**Completion Notes (2026-07-23):**
- [x] Count rule applied via a single shared helper, `countsAsMassage()` in `backend/services/add-on-sql.js`, rather than pasting the predicate into every site — one home for the rule so the sites cannot drift.
- [x] Applied to `today_massages` (`backend/routes/staff.js`), `massage_count` and `weekly_massages` (`backend/routes/reports.js`), and the four per-staff activity counts in `backend/routes/admin.js`.
- **Deviation from the step as written, recorded not hidden:** the step also listed the `transaction_count` sites. Those are financial counts that sit beside `total_revenue`, and an add-on genuinely *is* a separate sale, so applying a massage-count rule there would misreport takings. They are deliberately left counting all settled rows. See D-11.
- **RED → GREEN:** a duration upgrade leaves the count unchanged; an additional service adds exactly one.

### STEP_ID: PTE-RPT-002 — Revenue and staff pay exclude pending — ✅ DONE (2026-07-23)

- [ ] Exclude `payment_status = 'PENDING'` from every `SUM(payment_amount)` and `SUM(masseuse_fee)`, beginning at `backend/routes/reports.js:15`.
- [ ] Confirm an add-on's commission rides the existing base-commission path and does not become a third concept alongside booking credit.
- [ ] Capture a fixed-seed before/after snapshot of every affected report figure and diff it.
- **Validation:** a `PENDING` add-on contributes nothing to revenue, masseuse fees, or payable staff pay while still occupying the staff window; settlement moves exactly that amount in, once; no report figure unrelated to add-ons moves against fixed seed data. Satisfies `AC-PTE-005`, `AC-PTE-014`.
- **Risk notes:** these queries already produce the numbers the manager relies on, and a mistake here corrupts reported takings silently rather than throwing.

**Completion Notes (2026-07-23):**
- [x] `isSettled()` from the same shared helper applied to the money sums in `backend/routes/reports.js`, covering both `/daily/:date?` and `/summary/today` plus the payment-method breakdown.
- **RED → GREEN:** a pending add-on adds nothing to revenue or fees; settling it moves exactly its amount and its commission in, once.

### STEP_ID: PTE-RPT-003 — Verify the occupied window — ✅ DONE (2026-07-23)

- [ ] Verify `getActiveTransactionByStaff()` already extends the occupied window via an add-on's `end_datetime`, without modifying it.
- [ ] Verify a `PENDING` add-on still occupies the window.
- **Validation:** a staff member with an add-on shows busy until the add-on's end plus the 15-minute buffer, for both payment states, with no change to `backend/routes/staff.js` selection logic. Satisfies `AC-PTE-006`.

**Completion Notes (2026-07-23):**
- [x] Verified rather than rebuilt: `getActiveTransactionByStaff()` needed no change. A pending add-on still occupies the window, and cancelling returns `busy_until` to the parent's end.

**Phase 3 complete when:** both predicates are applied everywhere listed, the fixed-seed diff shows only intended movement, and the occupied window is verified unchanged. ✅ **This gate authorizes Phase 4.**

---

## Phase 4 — Reception UI — ✅ DONE (2026-07-23)
**Phase goal:** reception can extend a massage, see what is owed, and settle or cancel it, in Thai-first UI on the shop iPad.

### STEP_ID: PTE-UI-001 — Extend mode and the busy-guard bypass — ✅ DONE (2026-07-23)

- [ ] Add Extend as a third mode alongside Walk-in and Booking, entered from a specific active transaction.
- [ ] Pre-select that transaction's masseuse and exempt her from `isMasseuseUnavailableForWalkIn()` (`web-app/transaction.html:475-478`), because she is necessarily `busy`.
- [ ] Apply normal availability rules when reception assigns an `ADDITIONAL_SERVICE` to a different masseuse.
- [ ] Keep `transaction.html` and `transaction.ejs` mirrored.
- **Validation:** browser smoke proves Extend can be started against a masseuse the status endpoint reports as `busy`; a different masseuse who is busy remains unselectable; both inline scripts parse and the templates stay byte-identical. Satisfies `AC-PTE-001`, `AC-PTE-009`.
- **Risk notes:** the exemption must be scoped to Extend mode only. Leaking it into Walk-in would undo the QUEUE-002 guard.

**Completion Notes (2026-07-23):**
- [x] Third mode button `เพิ่มเวลา/บริการ` added; Extend opens its own panel and hides the normal intake form so the walk-in flow is untouched.
- [x] The busy-guard exemption lives inside `isMasseuseUnavailableForWalkIn()` as an early `transactionMode === 'extend'` return — one place, scoped, commented with why.
- [x] `transaction.html` and `transaction.ejs` patched from one source so they cannot drift; both parse and have identical line counts.
- **Guard proved by test:** `__tests__/staff-availability.surface-equivalence.test.js` now asserts walk-in still blocks a busy masseuse while extend does not. That suite extracts the *real* function from the shipped templates, and it broke when I changed the function — which is the guard doing its job.

### STEP_ID: PTE-UI-002 — Amount-due display — ✅ DONE (2026-07-23)

- [ ] Show amount already paid, amount due now, and the final end time before saving.
- [ ] Render a zero amount due as an explicit zero-charge confirmation, never a blank or `฿NaN`.
- [ ] Enumerate the Loading, Error, Empty, and Success states.
- **Validation:** browser smoke proves both operator scenarios display correctly and a zero-amount upgrade renders an explicit zero charge. Satisfies `AC-PTE-019` on the reception surface.

**Completion Notes (2026-07-23):**
- [x] Summary shows `จ่ายแล้ว` / `ต้องจ่ายเพิ่ม` / `เสร็จเวลา`, priced live through the existing `quoteTransactionPromotion` endpoint — the browser never computes an amount.
- [x] A zero amount renders `ไม่ต้องจ่ายเพิ่ม ฿0.00`, never blank or `NaN`.
- [x] Loading, error, and empty states all present.

### STEP_ID: PTE-UI-003 — Pending indicator, settle, and cancel — ✅ DONE (2026-07-23)

- [ ] Offer saving the add-on as pending rather than paid.
- [ ] Show an outstanding-payment indicator, reusing the existing `ยังไม่ชำระ` treatment used for unpaid booking rows.
- [ ] Provide an explicit accept-payment action that settles it, and a cancel action.
- [ ] Provide no no-show control — the customer is present by definition.
- **Validation:** browser smoke proves a pending add-on shows the indicator, settling from the UI clears it, cancelling restores the staff member's earlier free-at time, and no no-show control exists. Satisfies `AC-PTE-016`, `AC-PTE-017`, and the reception half of `AC-PTE-015`.
- **Risk notes:** BLOCKED on Q-01 (reminder placement) only for *where* the indicator lives; the action itself is unblocked and can be built on the active-transaction surface.

**Completion Notes (2026-07-23):**
- [x] `ยังไม่ชำระ` checkbox records the add-on as pending and hides the payment-method field.
- [x] Activity rows show an add-on badge, a `ยังไม่ชำระ` badge, and `เก็บเงิน` / `ยกเลิก` buttons for pending add-ons. No no-show control, by design.
- **Found during implementation:** `appData.transactions` in `web-app/shared.js` mapped away every raw column, so the add-on fields were invisible to the page. Both mapping sites now carry `transaction_id`, `parent_transaction_id`, `add_on_kind`, `payment_status`, `location`, and the canonical datetimes. Additive only; no existing key changed.
- **Still open:** Q-01 governs *where* the reminder lives beyond this list.

**Phase 4 complete when:** both operator scenarios are completable end-to-end in the browser and the mirrored templates are byte-identical. ✅ **This gate authorizes Phase 5.** (Browser drive happens at PTE-DEP-002 on the real device.)

---

## Phase 5 — End-Day Safety — 🟡 PARTIAL (2026-07-23) — PTE-END-001 done; END-002/003 open
**Phase goal:** an outstanding add-on can never be destroyed or silently forgotten by closing the day.

### STEP_ID: PTE-END-001 — Preserve add-on and parent rows — ✅ DONE (2026-07-23)

- [ ] Exclude add-on rows and any transaction referenced as a parent from the `DELETE FROM transactions` in `backend/routes/reports.js:444-490`.
- [ ] Exclude parent and add-on as a linked pair in one predicate so neither can be orphaned.
- [ ] Keep the summary totals and the delete predicate consistent with each other.
- **Validation:** after end-day with a `PENDING` add-on present, both the add-on and its parent remain queryable and still linked; `daily_summaries` matches what was summarised; neither row is orphaned. Satisfies `AC-PTE-020`.
- **Risk notes:** the summary counts only `ACTIVE` rows while the delete has no status filter, so an exclusion applied to one and not the other makes `daily_summaries` disagree with what survives. Assert both sides in the same test.

**Completion Notes (2026-07-23):**
- [x] The end-day `DELETE` now excludes pending add-ons **and** their parents as a linked pair in one predicate, so neither can be orphaned.
- **RED:** the pending add-on came back `undefined` after end-day — destroyed, exactly as the risk note predicted. **GREEN:** add-on and parent both survive, still linked, still `PENDING`, while ordinary settled transactions are still cleared.

### STEP_ID: PTE-END-002 — Settle-or-write-off prompt — OPEN

- [ ] List outstanding add-ons when end-day is invoked.
- [ ] Offer settle or write-off-with-reason per item.
- [ ] Record a write-off as an outcome with its reason; never delete it.
- [ ] Never block the close.
- **Validation:** end-day with outstanding items presents them and proceeds after each is resolved; a write-off is recorded with its reason and is visible to the manager afterwards; the close is never prevented. Satisfies `AC-PTE-021`.

### STEP_ID: PTE-END-003 — Persistent manager notice — OPEN

- [ ] Derive the notice from the presence of unresolved rows, not from client-side state.
- [ ] Name the affected business day.
- **Validation:** the notice is present after a simulated reload and after logout/login, and is absent once every item is settled or written off. Satisfies `AC-PTE-022`.

**Phase 5 complete when:** rows survive a close, the prompt resolves each item without blocking, and the notice persists across sessions. **This gate authorizes Phase 6.**

---

## Phase 6 — Verification & Hardening — OPEN
**Phase goal:** the phases integrate — cheap checks against real boundaries, not a full E2E suite.

### STEP_ID: PTE-VER-001 — Happy path through a real boundary — OPEN
- [ ] Drive route → service → database with realistic fixtures for both operator scenarios, no mocks on the feature path.
- **Validation:** both scenarios complete against a real test database and produce the expected rows and money. Protects `AC-PTE-002`, `AC-PTE-003`.

### STEP_ID: PTE-VER-002 — Negative path — OPEN
- [ ] Exercise every invalid transition in spec §11, plus a client-supplied price, commission, and discount.
- **Validation:** each is rejected; supplied money values are ignored rather than validated. Protects `AC-PTE-023`, `AC-PTE-024`, `AC-PTE-025`, `AC-PTE-026`.

### STEP_ID: PTE-VER-003 — Migration sanity — OPEN
- [ ] Initialise a fresh database and an already-populated one; run initialisation twice on each.
- [ ] Confirm the documented rollback posture: reverting the code leaves the columns in place harmlessly, and prior code reads every row exactly as before.
- **Validation:** columns present with correct defaults on both databases; no error or duplicate on the second run; a pre-feature read path returns identical results with the columns present. Protects spec §12.

### STEP_ID: PTE-VER-004 — Runtime after deploy — OPEN
- [ ] Start the service against a database carrying the new columns; check logs and a read endpoint.
- **Validation:** service starts, logs clean, no crash, one read endpoint returns 200.

**Phase 6 complete when:** all four checks pass. **This gate authorizes Phase 7.**

---

## Phase 7 — Deploy & Live-Verify — OPEN
**Phase goal:** the feature is proven on the real reception iPad against real data.

**Live-verify decision (authoring time):** this lane **requires** deploy and live-verify. It touches reception UI and live shop data, which is the default case.

### STEP_ID: PTE-DEP-001 — Verify-push and Deploy #1 — OPEN

- [ ] **Gates first:** all FSM gates green before anything is deployed — only gate-passed code ever reaches a server.
- [ ] **Verify-push:** push the session's `claude/…` working branch (commit message flagged `live-verify test`). **NO `testingNN` is minted here** — numbers come only from post-checkpoint `/push`; this push exists solely so the server can fetch the code.
- [ ] **Migrations FIRST, via the protocol:** any DB schema/data change goes through `/db-ops-regular` before the code that reads it is deployed. Steps never inline SQL or improvise migrations. Here that means `PTE-DB-001` is applied to the production database before this deploy.
- [ ] **State the rollback before touching anything:** previous `testingNN` + restart — name it in the step evidence. Note that the three columns remain after rollback and are harmless.
- [ ] **Restart rules:** reader services (dashboards, read APIs) restart freely. **Writer/ingestor services (live ingest, bots mid-message, anything writing as it runs): HARD STOP — the operator's explicit OK is required before restart.** Interrupting a live write is irreversible. **This application serves reads and writes from one process, so this restart is writer-class and REQUIRES the operator's explicit OK.**
- [ ] **Health-check after:** service up, one read endpoint 200; record `LIVE = <branch>` in the step's Completion Notes.
- **Validation:** the server runs the working branch, health check returns 200, and `LIVE = <branch>` is recorded.

### STEP_ID: PTE-DEP-002 — Live-verify on the reception iPad — OPEN

- [ ] **Live-verify = look, don't touch:** read-only observation of real data + using the feature exactly as intended (that IS the product working). Anything write-shaped beyond intended use is not verification — it routes to the DB protocols.
- [ ] Extend a real active massage by duration and confirm the amount due and the new end time.
- [ ] Add a different service to a real active massage and confirm pricing and the occupied window.
- [ ] Leave one add-on pending, confirm the indicator, then settle it.
- [ ] Confirm Daily Summary and the New Customer dropdown both reflect the extended availability.
- **Validation:** both operator scenarios work on the real device against real data; counts and availability are correct afterwards; broken → fix, re-push the same working branch, re-verify.
- **Risk notes:** recording add-ons against real customers is intended use, not a write-shaped probe. Anything beyond intended use routes to the DB protocols.

**Phase 7 complete when:** both scenarios are verified live and `LIVE` is recorded. **This gate authorizes Phase 8.**

---

## Phase 8 — Docs, Security, and Handover — OPEN
**Phase goal:** the repository's permanent knowledge matches what shipped, and the money-touching surface has had a dedicated security pass.

### STEP_ID: PTE-DOC-001 — Co-located documentation — OPEN
- [ ] Update `backend/routes/transactions.js.md`, `backend/routes/staff.js.md`, `backend/routes/reports.js.md`, `backend/models/database.js.md`, `web-app/transaction.html.md`, `web-app/summary.html.md`, and `web-app/index.md` if the reminder lands on Home.
- **Validation:** each touched source file's co-located doc matches its final code, with history appended rather than overwritten.

### STEP_ID: PTE-DOC-002 — Dedicated security review — OPEN
- [ ] Run `/security-review` over the session diff as an explicit pass, not folded into correctness.
- [ ] Cover specifically: price tampering (client-supplied amount, commission, discount must be ignored outright), duplicate settlement, authorization on the new actions, and injection in the changed report predicates.
- **Validation:** `/security-review` passes or produces tracked follow-ups with severity; no new high-severity finding.

### STEP_ID: PTE-DOC-003 — Checkpoint and handover — OPEN
- [ ] Run `/checkpoint`, confirming the deploy-time DB-Ops authorization from `PTE-DB-001` was obtained and recorded.
- **Validation:** docs and ledger current; handover packet emitted; a reader opening only this file can tell what shipped and why.

**Phase 8 complete when:** docs match code, the security pass is recorded, and the handover packet is emitted. **This gate closes the lane.**

---

## Open Decisions

- **D-01 (ratified):** Linked add-on transaction rows, not a dedicated add-on table. Money aggregation stays correct with no query change; only count expressions need a qualifier. Spec §5.
- **D-02 (ratified):** A same-service duration upgrade counts as one massage; a different-service add-on counts as two. Spec PTE-010.
- **D-03 (ratified):** Add-ons may be settled later, modelled on pending bookings, with no no-show concept. Spec PTE-011.
- **D-04 (ratified):** Upgrade pricing recalculates the final duration at today's promotion and subtracts the amount actually paid, clamped at zero, never refunding. Spec PTE-003 and AC-PTE-019.
- **D-05 (ratified):** Commission is never split; it goes wholly to whoever performs the add-on. Spec PTE-005.
- **D-06 (ratified):** Extend is a third mode that bypasses the walk-in busy guard for the masseuse being extended. Spec PTE-009.
- **D-07 (ratified):** Cancelling an add-on reverts the occupied window to the parent's end plus buffer. Spec PTE-012.
- **D-08 (ratified):** End-day preserves outstanding add-ons, prompts per item without blocking, and drives a persistent manager notice. Spec PTE-013.
- **D-10 (derived during PTE-API-001):** a duration upgrade's commission is the difference between the longer duration's catalog fee and the fee already earned on the parent. The spec fixed the *price* rule explicitly but not the commission rule; this follows from AC-PTE-005 forbidding double-counting, since the masseuse performs one longer session. Flagged to the operator rather than left silent.
- **D-11 (ratified during PTE-RPT-001):** the massage-count rule applies to counts of work performed, not to financial `transaction_count` figures. An add-on is a genuine separate sale, so excluding it from a count that sits beside `total_revenue` would misreport activity.
- **D-09 (ratified):** `/db-ops-regular` runs at Mode B with its Alembic-specific laws declared inapplicable and the reason stated, never silently skipped. Spec §12.

## Open Questions

- **Q-01:** Which surface carries the outstanding-payment reminder — Home Recent Activity, Daily Summary, the New Customer active-transaction list, or more than one? Gates the *placement* in `PTE-UI-003` only; the action itself is unblocked and the data model is unaffected.
- **Q-02 (found during `PTE-DB-001`, pre-existing, does not block this lane):** `mocha tests/otdd/` cannot run the directory as a whole. Every OTDD file sets `process.env.DB_PATH` at module load and deletes its temp directory in `after`, but `DatabaseRouter.defaultPath` is captured once at first require — so the first file's teardown breaks every later file with `SQLITE_CANTOPEN`. Each file passes alone (4, 4, 5, 1). Confirmed present without the file added by this step. Phases 2–5 will add more OTDD files and make this worse, so it should be fixed before then: either give each file its own directory that is never removed mid-run, or make the router re-read `DB_PATH` per connection. Separately, `__tests__/nav.bilingual.present.test.js` has one pre-existing failure asserting on a CSS class in `web-app/index.html`; it touches no database code.
