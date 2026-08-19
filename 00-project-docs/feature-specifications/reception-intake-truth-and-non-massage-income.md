# Feature Specification

## 1. Executive Summary

### Feature Name
Reception Intake Truth and Non-Massage Income

### Goal

**Ratified by the operator, 2026-08-18, verbatim:**

> Reception must be able to trust the screen without checking anything by hand — it should always show
> who is genuinely free, whose turn is next, and what the day has actually taken — and the book must be
> able to record money that passes through the shop to someone else, or arrives without a massage,
> without either distorting a masseuse's queue position or her payday.

This goal spans **two capabilities**, ratified as one goal:

- **Capability A — the screen tells the truth.** Covers the three reported bugs: an edited transaction
  leaving a masseuse at the top of the queue, nothing refreshing after submit, and yesterday's roster
  appearing overnight.
- **Capability B — the book holds money that is not massage revenue.** Covers the two feature requests:
  non-cash tips and miscellaneous income.

The operator's ruling on ordering, verbatim: *"The goal is to get all of them done. What does it matter
what the order is? We're getting them all done and shipping them all... I want to get it into a
situation where I can run ship epic."* Ordering is therefore encoded as the steps file's dependency
graph, not raised as a question.

### Success Criteria

**Ratified verbatim at the goal-alignment gate, before any requirement existed.**

- **SC-1** *(machine)* — After an edit, the masseuse's replacement counts **exactly once** in all five
  places at once: her busy state, her massage count, her queue position, the day's revenue, and the
  day's customer count.
- **SC-2** *(machine)* — When any refresh call fails, the receptionist sees an explicit stale marker on
  the staff area of the intake page.
- **SC-3** *(machine)* — With today's Today Staff list empty, the staff dropdown offers **nobody** and
  says why. It never shows a name list captured at page load.
- **SC-4** *(machine)* — A ฿100 tip on a ฿700 massage yields ฿800 income, ฿100 expense, attribution to
  that masseuse, and **no change** to her payday balance.
- **SC-5** *(machine)* — A miscellaneous income entry raises neither any masseuse's massage count nor
  her queue position.
- **SC-6** *(judgment — operator)* — The operator works one real shift on the branch server (new
  customer, an edit, and past 2am) without reloading by hand and without the screen ever disagreeing
  with the ledger.

Today's system fails SC-1 through SC-5; each was reproduced or confirmed during diagnosis. No criterion
forbids what another requires (checked pairwise).

### Chain Pointers

- **Planning map:** none — the one-session-versus-map test was run against all five reported items and
  returned no fog.
- **Steps file:** `00-project-docs/steps/reception-intake-truth-and-non-massage-income-steps.md`
- **Co-located docs:** `backend/routes/staff.js.md` · `backend/routes/transactions.js.md` ·
  `backend/routes/reports.js.md` · `backend/services/add-on-sql.js.md` · `web-app/transaction.html.md` ·
  `web-app/transaction.ejs.md`

### Requirement Sources

- **The operator's reported batch**, verbatim: `00-project-docs/reported-issues/2026-08-18-operator-reported-batch.md`
  (five items — three bugs, two feature requests — plus the ratified interview answers).
- **Diagnosis results**, each reproduced against running code:
  - The edited-transaction bug: the replacement row carries status `CORRECTED`, and the busy lookup
    accepts only `ACTIVE` (`backend/routes/staff.js:201-202`). Confirmed against real rows in
    `/opt/massage-shop/KEEP/backend/data/massage_shop.branch-43.db`.
  - The submit bug: the dropdown redraw sits inside the same `try` block as the two fetches
    (`web-app/transaction.html:1502-1519`), so one failed fetch skips the redraw and the `catch` writes
    only to the browser console. Reproduced in a real browser.
  - The overnight bug: the dropdown falls back to a name list assigned once at `web-app/shared.js:251`
    inside `loadData()`, which the page calls once at startup (`web-app/transaction.html:332`); the
    fallback is taken at `web-app/transaction.html:1804`. Reproduced headlessly.
- **Governing spec — Today Staff and the business day**,
  `00-project-docs/feature-specifications/today-staff-roster-business-day-helper.md` (822 lines).
- **Governing spec — transaction correction**,
  `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md` (119 lines).
- **AMENDMENT to the Today Staff spec, recorded here as a requirement source.** That spec's FR-009
  processing logic at line 426 says the massage count is of *"completed `ACTIVE` transaction ledger
  rows"*. That wording excludes a correction replacement, which is a real completed massage. The
  operator settled it, verbatim: *"She's taken. She should now be mid-massage."* **FR-001 below
  supersedes that wording**; the Today Staff spec's line 426 is amended to read `ACTIVE` or `CORRECTED`.
  This is recorded rather than carried as a live contradiction, because a spec is a ledger of decisions
  already made.

---

## 2. Scope Definition

### In Scope

- One shared definition of "this transaction is live work", used by every reader.
- Today's money keyed to the Bangkok business day rather than the UTC calendar date.
- An explicit stale state on the intake page when a refresh fails.
- Removal of the stale-name fallback in the staff dropdown.
- Recording a tip as paired income and expense, attributed to a masseuse.
- Recording miscellaneous income (extra charges such as tiger balm).
- The schema change the two above require, applied through the database protocol.

### Out of Scope

- **Till tracking.** Operator, verbatim: *"they don't really want to track that as much, but they do
  want to track it as income and expenses."*
- **Point-of-sale integration.** Operator: *"we could hypothetically connect to POS"* — speculative.
- **The daily-summary versus monthly-report divergence.** Operator: *"it's kind of like orthogonal
  issues. Can we get the first thing working?"*
- **Adding auto-refresh.** It already exists and works; verified by driving the real page. The defects
  are the swallowed failure and the split definitions, not missing refresh.
- **Changing Today Staff queue order.** Prohibited by the correction spec at line 32: *"Changing Today
  Staff order... it does not rotate or rewrite the queue."*
- **`backend/routes/admin.js` read paths**, beyond the mechanical consequence of the shared predicate
  changing under them.

### Non-Goals

- No redesign of the intake page. Every change is surgical: each changed line traces to one of the five
  reported items.
- No new queue algorithm. Walk-in priority stays lowest-workload-then-position.
- No deletion or rewriting of any historical transaction. Prohibited by the Today Staff spec, FR-008.

---

## 3. Existing System Impact Analysis

### Existing Components Affected

#### `backend/services/add-on-sql.js`
- **Purpose:** the single home for the add-on counting and settlement rules. Its own header at lines 7-8:
  *"These helpers are the single home for both rules so the ~20 aggregation sites cannot drift apart."*
- **Impact:** `countsAsMassage()` at line 23 currently reads
  `(parent_transaction_id IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')`. A parentless row therefore
  counts as a massage, which would make a miscellaneous-income row inflate a masseuse's workload.
- **Required modification:** the predicate becomes kind-driven rather than parent-driven, so a tip or a
  miscellaneous-income row never counts as a massage whether or not it has a parent.
- **Blast radius:** eight call sites — `backend/routes/staff.js:42`, `backend/routes/reports.js:55` and
  `:101`, `backend/routes/admin.js:144`, `:152`, `:479`, `:505`, `:508`. **Both capabilities depend on
  this one change**, which is why it is isolated into its own gated step ahead of both.

#### `backend/routes/staff.js`
- **Purpose:** Today Staff roster, availability, walk-in priority.
- **Impact:** the busy lookup at `:201-202` and the massage count at `:38-44` each filter on
  `status = 'ACTIVE'` independently, so a correction replacement is invisible to both.
- **Required modification:** both use the shared live-work predicate.

#### `backend/routes/reports.js`
- **Purpose:** today's money, date-range reports, the day's summary.
- **Impact:** two defects. Today's figures filter `status = 'ACTIVE'` only (`:24`, `:63`, `:204`), and
  the date they filter on is the **UTC calendar date** (`:10` —
  `new Date().toISOString().split('T')[0]`), not the business day. Between 02:00 and 07:00 Bangkok the
  money panel and the staff panel are keyed to two different days. Date-range reports at `:108`, `:147`
  and `:239` already accept `ACTIVE` and `CORRECTED` and are correct.
- **Required modification:** today's figures use the shared live-work predicate and the Bangkok business
  day.

#### `backend/routes/transactions.js`
- **Purpose:** creates, edits and corrects transactions; validates add-on rows.
- **Impact:** `:268` rejects any `add_on_kind` other than `DURATION_UPGRADE` or `ADDITIONAL_SERVICE`, so
  a tip or miscellaneous-income row cannot be created. Today's money at `:935` and `:946` filters
  `ACTIVE` only.
- **Required modification:** accept the two new kinds; use the shared live-work predicate.

#### `web-app/transaction.html` and its `.ejs` mirror
- **Purpose:** the receptionist New Customer page.
- **Impact:** three defects. The dropdown redraw is inside the fetches' `try` block (`:1502-1519`); the
  redraw is skipped whenever either fetch fails and the error goes only to the browser console
  (`:1516-1518`). The dropdown falls back to a page-load name list (`:1804`). The next-in-queue function
  (`:419`) and the busy guard (`:539`) each decide availability separately.
- **Required modification:** surface the failure, drop the fallback, and read availability from one place.
- **Parity:** the `.ejs` mirror is byte-identical and enforced by a contract test. Every change lands in
  both.

#### `web-app/shared.js`
- **Purpose:** loads services, payment methods and the roster once at page start.
- **Impact:** `:250-253` derives the masseuse name list inside `loadData()`, which runs once. That list
  is the stale fallback.
- **Required modification:** the list is no longer used as a staff-availability fallback.

#### `backend/models/database.js`
- **Purpose:** schema initialisation.
- **Impact:** the `expenses` table (`:102-109`) holds only `id`, `date`, `description`, `amount`,
  `timestamp`, `created_at`. It has **no masseuse column and no business day**, so the operator's
  requirement to *"track who it was that got the tip"* cannot be met as it stands.
- **Required modification:** add a masseuse reference and a business day. This is a schema change and
  routes to `/db-ops-regular`.

### Components Explicitly Unaffected

- Authentication, sessions and CSRF.
- Service pricing, promotions and the booking/requested-staff credit rules.
- The payday balance path — `staff.total_fees_earned` / `total_fees_paid` and `staff_payments`. The
  operator excluded it for tips explicitly: *"the tips get handed to the masseuses immediately they
  dont get added to their payday balance."*
- The legacy `staff_roster` table. It holds zero rows on the live branch database and on a freshly
  initialised one; nothing the intake page reads consults it.
- Today Staff ordering, per the correction spec's prohibition at line 32.

### Regression Risks

#### Risk: the shared counting predicate changes under eight call sites at once
- **Cause:** `countsAsMassage()` is consumed by the staff, reports and admin routes.
- **Impact:** a wrong edit silently changes every massage count and payday figure in the app.
- **Mitigation:** the change is its own gated step, ahead of every dependent, with a test asserting the
  old behaviour for ordinary massages, additional services and duration upgrades is unchanged, and the
  new behaviour only for the two new kinds.

#### Risk: moving today's money from the UTC date to the business day shifts historical figures
- **Cause:** rows created between 02:00 and 07:00 Bangkok carry a `date` and a `business_day` that
  disagree.
- **Impact:** a day's total can change for past days after deployment.
- **Mitigation:** the Today Staff spec already prescribes this direction (Regression Risks, lines
  134-137: *"Mitigation: Store/derive `business_day` explicitly"*). Only **today's** figures move;
  date-range reports keep their existing behaviour, so no historical report changes.

#### Risk: surfacing refresh failures makes the page look broken on a flaky link
- **Cause:** the stale marker fires on any failed fetch.
- **Impact:** reception may distrust a working page.
- **Mitigation:** the marker names what is stale and clears itself on the next successful refresh; the
  30-second poll already provides that.

#### Risk: removing the dropdown fallback leaves reception unable to take a customer
- **Cause:** with Today Staff empty, no name is offered.
- **Impact:** reception is blocked at the start of the day.
- **Mitigation:** this is the correct state per the Today Staff spec (FR-007 Outputs, line 385:
  *"Morning receptionist sees empty Today Staff"*). The empty state tells reception to build the day's
  roster first and links to the Today Staff page.

---

## 4. Integration Architecture

### Upstream Dependencies

- The Bangkok business-day helper, `backend/utils/business-day.js` — 2am reset boundary.
- The Today Staff list, which reception builds at the start of each business day.
- The correction/edit workflow, which produces the `EDITED` original and the `CORRECTED` replacement.

### Downstream Dependencies

- The manager reports and payday pages, through the shared counting predicate.
- The daily summary and current-shop-status surfaces.

### Contracts

#### Contract: live work (NEW — the shared definition, and the sequencing constraint)

A single SQL predicate answering *"does this transaction represent work that is happening or has
happened, right now, on this business day?"*

- **True for:** status `ACTIVE` (an ordinary live row) and status `CORRECTED` (the replacement created
  by an edit).
- **False for:** status `EDITED (Corrected by …)` — the superseded original — and any cancelled status.
- **Home:** `backend/services/transaction-status-sql.js`, a sibling of the existing add-on predicates
  and following the same single-home convention.
- **Consumers:** the busy lookup, the massage count, the walk-in priority pick, today's money, and the
  day's customer count.

**This contract is the reason the work has an order.** Both capabilities write to the counting rule, so
it is isolated into its own step, gated before every dependent step in either capability. It is not a
lane boundary and not an operator decision; it is one edge in the dependency graph.

#### Contract: countable massage (AMENDED)

`countsAsMassage()` in `backend/services/add-on-sql.js` becomes kind-driven:

```
(add_on_kind IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')
```

Behaviour preserved for every existing row shape: an ordinary massage has no kind and still counts; a
`DURATION_UPGRADE` still does not; an `ADDITIONAL_SERVICE` still does. The parent test is dropped
because it is what makes a parentless tip or miscellaneous-income row count as a massage.

#### Contract: add-on kinds (EXTENDED)

`add_on_kind` gains `TIP` and `MISC_INCOME`. The validator at `backend/routes/transactions.js:268` is
widened to four values. The column is already free `TEXT`, so no column change is needed — but the
validator change **is** required, and an earlier belief that new kinds need no code change was wrong.

#### Contract: expenses (EXTENDED — schema change)

The `expenses` table gains `masseuse_name TEXT NULL` and `business_day DATE NULL`, so a tip's expense
side can be attributed and reported on the correct day. Applied through `/db-ops-regular`.

---

## 5. Functional Requirements

### FR-001: One shared definition of live work

#### Description
Every reader that asks whether a transaction is live work uses one shared predicate accepting `ACTIVE`
and `CORRECTED`. No reader tests transaction status inline.

#### Trigger
Any read of masseuse availability, workload, walk-in priority, today's revenue, or today's customer count.

#### Processing Logic
1. The predicate lives in `backend/services/transaction-status-sql.js` and takes a table alias.
2. The busy lookup, the massage count, the priority pick, today's revenue and today's customer count
   each call it instead of testing status inline.
3. The superseded original of an edit is excluded, so a chain of any length yields exactly one live row.

#### Outputs
A masseuse whose live massage arrived by correction reads busy, carries a workload of one, and is not
offered as next in queue.

#### Failure Modes
If the predicate is applied to a query lacking a status column, that query fails loudly at test time
rather than silently returning everything.

#### Edge Cases
- Two consecutive edits: original `EDITED`, first replacement `EDITED`, second replacement `CORRECTED`
  — exactly one live row. Confirmed against real rows on the branch database.
- A cancelled transaction is not live work, per the correction spec's FR-008.

### FR-002: Today's figures are keyed to the Bangkok business day

#### Description
Today's revenue, customer count, payment breakdown and masseuse performance are computed over the
current Bangkok business day, not the UTC calendar date.

#### Trigger
The intake page's day summary, and any today-scoped report.

#### Processing Logic
1. Derive the current business day from `backend/utils/business-day.js`.
2. Filter today's queries on `transactions.business_day`, not `transactions.date`.
3. Date-range reports are unchanged.

#### Outputs
Between 02:00 and 07:00 Bangkok the money panel and the staff panel show the same day.

#### Failure Modes
A row with a null `business_day` is excluded from today's figures and surfaces in a data-integrity test.

#### Edge Cases
A massage started at 01:50 belongs to the previous business day and leaves today's figures at the 2am
boundary, while remaining live work until it ends.

### FR-003: The page states when it is showing stale data

#### Description
When any refresh of roster or live status fails, the intake page displays an explicit marker on the
staff area saying the staff information may be out of date, instead of silently keeping the old view.

#### Trigger
Any failed fetch inside the post-submit refresh or the 30-second poll.

#### Processing Logic
1. The redraw is moved out of the fetches' error path, so data that did arrive is still rendered.
2. A failed fetch sets a visible stale marker naming what could not be refreshed.
3. The next successful refresh clears the marker.

#### Outputs
Reception can tell a frozen staff list from a current one without reloading.

#### Failure Modes
If both fetches fail, the marker is shown and the previous view is retained rather than blanked.

#### Edge Cases
A submit whose transaction saved but whose refresh failed still confirms the save, and shows the stale
marker alongside it.

### FR-004: The staff dropdown never shows a stale name list

#### Description
The dropdown is built only from the current Today Staff list. When that list is empty the dropdown
offers nobody and explains why.

#### Trigger
Every render of the staff dropdown on the intake page.

#### Processing Logic
1. The page-load name list is no longer used as a fallback for staff availability.
2. With an empty Today Staff list, the dropdown contains only the placeholder and an empty-state message
   telling reception to build today's roster.
3. Next-in-queue and the busy guard read the same live status, so a busy masseuse is never labelled next.

#### Outputs
After the 2am reset, reception sees an empty roster and a message, not yesterday's names.

#### Failure Modes
If live status cannot be fetched, FR-003's stale marker applies and the previous list is retained.

#### Edge Cases
A masseuse added to Today Staff mid-shift appears at the next refresh without a reload.

### FR-005: A tip is recorded as paired income and expense, attributed, and never paid twice

#### Description
Reception records a tip against a transaction. It appears as income and as a matching expense, is
attributed to the masseuse, and does not change her payday balance.

#### Trigger
Reception enters a tip amount on the intake page against a saved transaction.

#### Processing Logic
1. Create a transaction row with `add_on_kind = 'TIP'` linked by `parent_transaction_id`, carrying the
   tip amount and the parent's masseuse and business day, with `masseuse_fee` of zero.
2. Create a matching `expenses` row of the same amount, carrying the masseuse name and business day.
3. Do not touch `staff.total_fees_earned` or `staff_payments`.

#### Outputs
A ฿700 massage with a ฿100 tip yields ฿800 income and ฿100 expense on the day, both attributable to the
masseuse. Operator, verbatim: *"It's a net neutral book, but we are able to track what happened."*

#### Failure Modes
Both rows are written in one database transaction; a failure writes neither.

#### Edge Cases
- A tip on a transaction later edited follows the parent's correction chain and is counted once.
- A tip does not count as a massage — FR-007.

### FR-006: Miscellaneous income is recorded as income only

#### Description
Reception records an extra charge — the operator's example is tiger balm at ฿50 — as income with no
expense side.

#### Trigger
Reception enters a miscellaneous income amount and a description.

#### Processing Logic
1. Create a transaction row with `add_on_kind = 'MISC_INCOME'`, carrying the amount, description,
   business day, and `masseuse_fee` of zero.
2. Where it relates to a massage, link it by `parent_transaction_id`; where it does not, leave the
   parent null.
3. Create no expense row.

#### Outputs
The day's income rises by the amount; no expense is recorded; no masseuse is paid for it.

#### Failure Modes
An entry with no amount or no description is rejected before any write.

#### Edge Cases
A miscellaneous income row with no parent does not count as a massage — FR-007 is what guarantees this.

### FR-007: Non-massage money never affects a masseuse's workload or queue position

#### Description
Neither a tip nor a miscellaneous income row raises any masseuse's massage count, changes her walk-in
priority, or moves her Today Staff position.

#### Trigger
Any workload, priority or count computation.

#### Processing Logic
1. `countsAsMassage()` becomes `(add_on_kind IS NULL OR add_on_kind = 'ADDITIONAL_SERVICE')`.
2. All eight consumers inherit it unchanged.

#### Outputs
Recording a ฿50 tiger balm charge leaves the queue exactly as it was.

#### Failure Modes
None — the predicate is evaluated in SQL and has no failure path of its own.

#### Edge Cases
An `ADDITIONAL_SERVICE` add-on still counts as a massage; a `DURATION_UPGRADE` still does not. Both
behaviours are preserved and tested.

---

## 6. Data Model Changes

### Entity: Expenses

#### Ownership
The transaction and tip workflows create rows; manager reporting reads them.

#### Fields
Existing: `id`, `date`, `description`, `amount`, `timestamp`, `created_at`.
**Added:** `masseuse_name TEXT NULL` · `business_day DATE NULL`.

#### Constraints
Both new columns are nullable so existing rows remain valid with no backfill.

#### Relationships
`masseuse_name` matches `staff.name`, the same soft reference the transactions table already uses.

#### Lifecycle
Created alongside a tip; never mutated by roster actions.

#### Migration Requirements
Additive `ALTER TABLE`. No backfill. Routed to `/db-ops-regular`; never inlined in a feature step.

#### Indexing Considerations
Index on `(business_day)` for day-scoped expense totals.

### Entity: Transaction Ledger

#### Ownership
Unchanged.

#### Fields Relevant to This Feature
`add_on_kind` gains two permitted values, `TIP` and `MISC_INCOME`. The column is already free `TEXT`;
only the route validator changes.

#### Constraints
A `TIP` row carries a parent. A `MISC_INCOME` row may or may not.

#### Relationships
Unchanged — `parent_transaction_id` links to the originating sale.

#### Lifecycle
Created with the sale or after it; corrected through the existing correction workflow.

#### Migration Requirements
None. No column change.

#### Indexing Considerations
None beyond the existing `(business_day, masseuse_name, status)` access pattern.

---

## 7. State Transitions

### Transaction liveness

#### States
`ACTIVE` · `CORRECTED` · `EDITED (Corrected by <id>)` · cancelled.

#### Valid Transitions
- `ACTIVE` → `EDITED (Corrected by <id>)`, creating one `CORRECTED` replacement.
- `CORRECTED` → `EDITED (Corrected by <id>)` on a second edit, creating one further `CORRECTED` row.

#### Invalid Transitions
- Any transition that deletes a row. Prohibited by the correction spec, Out of Scope line 34.
- Re-correcting an already-`EDITED` original. Prohibited by the correction spec, §6.

#### Recovery Behavior
An edit is one database transaction; a failure leaves the original untouched.

---

## 8. Operational Considerations

### Logging
Log each failed refresh server-side as well as client-side, so a stale page has a trail.

### Metrics
Count refresh failures per day; count tips and miscellaneous income entries per business day.

### Monitoring
None beyond existing service health.

### Alerting
None. Single-shop deployment.

### Performance Considerations
The shared predicate adds one status comparison to queries already filtered by business day; the tables
are small.

### Security Considerations
No new surface. Tips and miscellaneous income use existing authenticated transaction routes.

### Permission Changes
None. Reception already creates transactions and expenses.

---

## 9. Rollout Plan

### Deployment Strategy
The schema change first, through `/db-ops-regular`. Then the code, deployed to the branch server for
the operator's live-verify.

### Migration Strategy
Additive columns only, no backfill, no destructive change.

### Feature Flag Strategy
None. Single shop.

### Rollback Conditions
- The intake page cannot create a transaction.
- A masseuse's massage count changes for a day with no tips or miscellaneous income.
- Today's revenue disagrees with the sum of the day's live rows.

### Backward Compatibility Requirements
Existing rows keep their meaning. Date-range reports are unchanged.

---

## 10. Testing Requirements

### Unit Tests
- The live-work predicate accepts `ACTIVE` and `CORRECTED` and rejects `EDITED (Corrected by …)`.
- `countsAsMassage()` preserves its verdict for an ordinary massage, an `ADDITIONAL_SERVICE` and a
  `DURATION_UPGRADE`, and returns false for `TIP` and `MISC_INCOME`.
- The business-day helper maps 01:50 to the previous day and 10:00 to the current day.

### Integration Tests
- After an edit, all five counts move together — SC-1.
- Today's figures at 02:33 Bangkok match the staff panel's business day — FR-002.
- A tip writes both rows or neither — FR-005.
- The add-on validator accepts all four kinds and rejects a fifth.

### End-to-End Tests
- Submit a walk-in in a real browser and confirm the dropdown, queue and day figures update with no
  reload.
- Fail one refresh fetch and confirm the stale marker appears — SC-2.
- Render with an empty Today Staff list and confirm no names are offered — SC-3.

### Failure Tests
- Both refresh fetches fail: the marker shows and the previous view is retained.
- A tip whose expense write fails leaves no transaction row.

### Regression Tests
- Date-range reports return identical figures before and after.
- Today Staff order is unchanged by any operation in this spec.
- **Prove the harness can fail:** at least one check in the verification phase is observed failing
  before its fix. A check never seen failing is decoration.

---

## 11. Risks and Assumptions

### Assumptions

#### Documented
- The 2am Bangkok reset clears the visible Today Staff list — Today Staff spec, FR-007.
- Today Staff order is not rotated by a correction — correction spec, line 32.
- `countsAsMassage()` is the single home for the counting rule — its own header, lines 7-8.

#### User Confirmed
- The five reported items, verbatim, and the two-capability reading of them.
- The tip model: income plus expense, net neutral, attributed to the masseuse, never in her payday
  balance.
- The end-to-end edit behaviour: *"She's taken. She should now be mid-massage."*
- The audit trail exists as a fraud control: *"previously, the receptionist stole money."*
- Every field of a transaction must be editable.
- The amendment to the Today Staff spec's `ACTIVE`-only counting wording.
- Ordering is a dependency graph, not a question: *"What does it matter what the order is?"*
- The database currently holds test data: *"all the data in the database is fake right now."*

#### Inferred
- The tablet stays open for days without a reload. Everything about the overnight and refresh symptoms
  depends on this; the operator never stated it.
- A wrong queue position causes a real misassignment, not merely an ugly screen.

### Risks

Covered in §3 Regression Risks.

### Open Questions

None. Every design call in this spec was decidable on paper and was decided here.

---

## 12. Acceptance Criteria

- **AC-001** — The live-work predicate returns true for `ACTIVE` and `CORRECTED`, false for
  `EDITED (Corrected by …)`. *(FR-001)*
- **AC-002** — After one edit, and again after two consecutive edits, the masseuse's busy state, massage
  count, queue position, the day's revenue and the day's customer count each reflect exactly one
  massage. *(FR-001, SC-1)*
- **AC-003** — At 02:33 Bangkok, today's revenue and the staff panel report the same business day.
  *(FR-002)*
- **AC-004** — A failed roster or status fetch produces a visible stale marker on the staff area, and a
  subsequent successful fetch clears it. *(FR-003, SC-2)*
- **AC-005** — With Today Staff empty, the dropdown contains no selectable staff and shows an empty-state
  message. *(FR-004, SC-3)*
- **AC-006** — A ฿100 tip on a ฿700 massage produces ฿800 day income, a ฿100 expense row carrying the
  masseuse name and business day, and an unchanged `total_fees_earned`. *(FR-005, SC-4)*
- **AC-007** — A tip whose expense write fails leaves no tip transaction row. *(FR-005)*
- **AC-008** — A ฿50 miscellaneous income entry raises day income by ฿50, writes no expense row, and
  pays no masseuse fee. *(FR-006)*
- **AC-009** — Neither a tip nor a miscellaneous income row changes any masseuse's massage count, walk-in
  priority or Today Staff position; an `ADDITIONAL_SERVICE` still counts and a `DURATION_UPGRADE` still
  does not. *(FR-007, SC-5)*
- **AC-010** — Date-range reports return identical figures before and after the change. *(regression)*
- **AC-011** — The operator completes one shift on the branch server — new customer, an edit, past 2am —
  with no manual reload and no disagreement between screen and ledger. *(SC-6)*

### Goal coverage — checked in both directions

**Every ratified criterion has a requirement behind it:** SC-1 → FR-001 · SC-2 → FR-003 · SC-3 → FR-004 ·
SC-4 → FR-005 · SC-5 → FR-006 and FR-007 · SC-6 → all, verified live.

**Every requirement serves a ratified criterion:** FR-001 → SC-1 · FR-002 → **see below** · FR-003 → SC-2 ·
FR-004 → SC-3 · FR-005 → SC-4 · FR-006 → SC-5 · FR-007 → SC-5.

**One mismatch, named rather than buried.** **FR-002 — today's figures keyed to the business day — is
tested by no ratified criterion.** It is not scope the goal never asked for: the goal says the screen
must show "what the day has actually taken", and between 02:00 and 07:00 Bangkok it does not. This is a
**gap in the criteria**, not surplus scope. `AC-003` covers it, and the criteria set should gain a
seventh member on the operator's next pass:

> **SC-7** *(machine)* — Between 02:00 and 07:00 Bangkok, the day's money and the staff panel report the
> same business day.

Recorded here rather than silently added, because the ratified set is the only part of this document
capable of contradicting the rest, and editing it to fit what was written would destroy that.
