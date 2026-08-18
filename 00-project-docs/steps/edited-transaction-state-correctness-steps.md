# Edited Transaction State Correctness — Execution Steps

## Goal
After a transaction is edited, every part of the system agrees the edited version is the real one —
the masseuse's availability, her workload, the day's money, and the monthly report. Today an edit
writes a status that half the system does not recognise, so she reads as free mid-massage and her
money vanishes from the daily summary. Spec:
`00-project-docs/feature-specifications/edited-transaction-state-correctness.md`. Planning map: none.

> **Status:** IN PROGRESS — `ETSC-CORE-001` (availability and workload) and `ETSC-CORE-002` (the
> day's money) are `✅ DONE`. Fix direction REVERSED on 2026-08-18 after reading the governing
> correction spec and the audit-repair tool; see D-01 in Open Decisions. Ship this epic FIRST of the
> three: until `ETSC-CORE-002` shipped, an edited transaction reported **zero** revenue for that
> customer, which was an open theft window.

> **⚠️ Operator advisory issued 2026-08-18, now DISCHARGED by `ETSC-CORE-002`:** the operator was
> told not to close a business day until this step shipped, because closing a day archived the wrong
> total **and then deleted the source rows**, making the loss permanent. That is fixed. Any day
> closed *before* this ship still carries an understated `daily_summaries` row whose source rows are
> gone — unrecoverable, and outside the no-backfill reasoning in D-02, which assumed only the
> transient on-screen summary was affected. Flagged for the operator; blocks nothing here.

> **Epic complete when:** Phase 4's gate is met — the verification journeys pass and the operator has
> live-verified an edit on the branch server.

## Scope (this lane)
- **Owns:** the status an edit writes to the replacement transaction row, every reader of that
  status, and the removal of the dead set-busy path in reception intake.
- **Does NOT own:** the intake refresh and overnight staleness defects — those belong to
  `daily-state-freshness-steps.md`. Tips and miscellaneous income belong to
  `tips-and-miscellaneous-income-steps.md`.

## ⚠️ Cross-epic file collisions — READ BEFORE RUNNING IN PARALLEL
Three epics are in flight. This lane's write-set changed on 2026-08-18 when the fix direction was
corrected — it now writes the staff and reports routes rather than the transaction write path.

- `backend/routes/staff.js` — written here at `ETSC-CORE-001`. **No other epic writes it.**
- `backend/routes/reports.js` — written here at `ETSC-CORE-002`. **`daily-state-freshness-steps.md`
  also writes this file**, at its own day-basis step, and both change the same today-summary queries:
  this lane changes which statuses they count, that lane changes which day column they filter on. The
  two edits are compatible but land in the same lines — do not run them concurrently.
- `backend/routes/transactions.js` — written here at `ETSC-CORE-002` (today-summary query),
  `ETSC-CORE-002a` (the audit-repair tool) and `ETSC-CORE-003`. Both other epics write this file too.
- `web-app/transaction.html` and its `.ejs` mirror — written here **only** at `ETSC-CLEAN-001`, the
  optional cleanup step. If that step is cut, this lane does not touch the intake page at all.

## Dependencies
- **Transactions write path (live):** an edit relabels the original and inserts a replacement —
  `backend/routes/transactions.js:693-717`. Must keep the audit trail of superseded rows.
- **Busy and workload derivation (live):** read only rows whose status is `ACTIVE` —
  `backend/routes/staff.js:41`, `:201`, `:711`, `:755`. **These are corrected by ETSC-CORE-001** —
  they are the defect, not a dependency to leave alone.
- **Today's money (live):** reads only `ACTIVE` — `backend/routes/reports.js:24`, `:45`, `:63`,
  `:204`, `:215`, `:456`, and `backend/routes/transactions.js:935`, `:946`. **These are corrected by
  ETSC-CORE-002.**
- Invariant: superseded rows are never deleted; the transaction list keeps showing them.
- Invariant: existing rows already carrying the `CORRECTED` status keep reading correctly wherever
  they are already accepted. No historic data is rewritten.

---

## Verified source status (read the code, 2026-08-18 CFEP)
- An edit inserts the replacement with status `CORRECTED` — `backend/routes/transactions.js:713`
  (`originalTransactionId ? 'CORRECTED' : 'ACTIVE'`). Read in full, not grepped.
- The original is relabelled `EDITED (Corrected by <id>)` — `backend/routes/transactions.js:693-696`.
- Busy derivation filters `status = 'ACTIVE'` — `backend/routes/staff.js:201`; a null busy window
  falls through to `available` — `backend/routes/staff.js:246-248`, `:259`.
- Workload count filters `status = 'ACTIVE'` — `backend/routes/staff.js:41`; lowest workload sorts to
  the front of walk-in priority — `backend/routes/staff.js:294-300`.
- Today's summary filters `status = 'ACTIVE'` — `backend/routes/reports.js:24`, `:45`, `:204`, `:215`.
  Date-range reports filter `status IN ('ACTIVE','CORRECTED')` — `backend/routes/reports.js:108`,
  `:147`, `:168`, `:239`. **The two families disagree on every edited transaction.**
- The audit-repair tool matches on the `CORRECTED` status at `backend/routes/transactions.js:799`
  (`WHERE corrected_from_id = ? AND status = "CORRECTED"`). Keying it on the link instead is
  hardening, not a prerequisite — the status is not changing.
- The unique booking index covers `status IN ('ACTIVE','CORRECTED')` —
  `backend/models/database.js:359`. With the original relabelled `EDITED`, one row remains in the
  index either way.
- 🔴 **A governing spec mandates the replacement's status.**
  `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md` FR-003:
  *"preserves the original transaction with an `EDITED (Corrected by ...)` audit status and the
  replacement with `CORRECTED` plus `corrected_from_id`."* Its §6 states the same transition. **The
  replacement must stay marked `CORRECTED`**; the defect is in the readers, not the writer.
- 🔴 **That same spec's AC-003 is what the current code violates:** *"removes the original staff
  member's payable fee and active-workload effect, and applies the replacement fee/workload effect
  exactly once."* The fee is applied (`backend/routes/transactions.js:720-726`); **the workload effect
  is not**, because the workload count admits only live rows (`backend/routes/staff.js:41`). This
  epic implements AC-003 rather than working around it.
- 🔴 **An audit-integrity repair tool depends on the `CORRECTED` status.**
  `POST /transactions/fix-edited-status` — `backend/routes/transactions.js:782-825` — finds superseded
  rows wrongly left live and relabels them, matching on that status at `:799`. Writing replacements
  live would leave this tool permanently unable to match anything. The audit trail is a fraud control
  (a receptionist previously stole money), so degrading it is not an acceptable cost.
- The date-range financial report **already treats a corrected row as live money** —
  `backend/routes/reports.js:239` (`WHERE t.status IN ('ACTIVE', 'CORRECTED')`). It is the reference
  implementation for the today-summary fix.
- Audit display keys on the superseded row's status, not the replacement's — `web-app/summary.html:443`,
  `:461`, `web-app/index.html:453`, `web-app/transaction.html:1730`. **Both rows stay visible and the
  edited badge keeps rendering under this epic**; the manager's fraud-review view is untouched.
- Reception calls a set-busy endpoint after every submit — `web-app/transaction.html:1473` — which
  writes `staff_roster.status` and `busy_until` (`backend/routes/staff.js:660-664`). **Nothing reads
  it**: the roster query hardcodes `NULL AS busy_until` — `backend/routes/staff.js:35`.

---

## Phase 1 — Make the live row recognisable — OPEN
**Phase goal:** after an edit, the replacement counts for availability, workload and the day's money,
while every superseded row still counts for neither — and both rows stay in the ledger.

### STEP_ID: ETSC-CORE-001 — availability and workload recognise a corrected row as live — ✅ DONE
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/routes/staff.js`, `backend/services/transaction-status-sql.js` (new — the
  shared predicate's home, following the pattern of `backend/services/add-on-sql.js`), `tests/`
- **Why the fix goes here and not in the write path:** the correction spec mandates that the
  replacement row is marked `CORRECTED` — `transaction-correction-operational-reversal.md` FR-003 and
  §6. Writing it live instead would contradict that governed contract **and** silently disable the
  audit-integrity repair tool at `backend/routes/transactions.js:782-825`, which finds superseded rows
  by looking for the `CORRECTED` status at `:799`. The audit trail is a fraud control; degrading it is
  not an acceptable cost. So the readers are corrected, not the writer.
- [x] A masseuse's busy window derives from her live massage whether that massage is an original or a
      correction replacement.
- [x] Her workload count includes a correction replacement, so an edit does not reset her queue
      position — this is `transaction-correction-operational-reversal.md` AC-003, which requires the
      replacement's workload effect to apply exactly once and which the current code does not honour.
- [x] Superseded rows and cancelled rows remain excluded from both.
- [x] The two other workload-fairness readers in the same file are corrected with the same predicate:
      today's per-masseuse performance (`backend/routes/staff.js:711`) and yesterday's commission
      (`backend/routes/staff.js:755`), which orders tomorrow's roster via
      `ORDER BY previous_day_commission ASC` at `:773` — so an edit today must not change who gets
      customers tomorrow.
- [x] The predicate lives in one shared helper, not inline at each site, following the reason
      `backend/services/add-on-sql.js:5-8` gives for existing: so the aggregation sites cannot drift.
- **Validation:** after editing a one-hour massage to two hours, the masseuse reads as busy for the
  edited duration, is not offered as next in line, and keeps the workload count she had before the
  edit — satisfies AC-001, AC-002 and AC-003. All three observed failing on the pre-change build;
  this is the operator's reported symptom, so a test that never failed proves nothing.
- **Risk notes:** the predicate must admit a corrected row without admitting a superseded or cancelled
  one. Superseded rows carry a status beginning `EDITED`; cancelled rows one beginning `CANCELLED`.
  An implementation that widens to "not cancelled" would wrongly count superseded rows and double a
  masseuse's workload for every edit.
- **Completion Notes:** Shipped 2026-08-18.

  **What changed.** New shared module `backend/services/transaction-status-sql.js` exporting
  `countsAsLiveWork(alias)`, returning `status IN ('ACTIVE', 'CORRECTED')` — an allowlist of exactly
  two values, matching the reference implementation at `backend/routes/reports.js:239` and the unique
  booking index at `backend/models/database.js:359` verbatim. No new status vocabulary. Applied at all
  four transaction-status filters in `backend/routes/staff.js`: the workload count at `:42`, the busy
  window at `:202`, today's per-masseuse performance at `:712`, and yesterday's commission at `:756`.
  `grep -n "status = 'ACTIVE'" backend/routes/staff.js` now returns nothing, so no inline copy
  survived. `countsAsMassage('t')` at `:43` is untouched and still ANDed.

  **RED observed before any production line changed** —
  `tests/integration/edited-transaction-live-state.integration.test.js`, 8 of 9 failing, with the
  values the ledger predicted: `current_state` `"available"` not `"busy"`, `walk_in_priority` `true`
  not `false`, `today_massages` `0` not `1`, two-successive-edits count `0` not `1`,
  `previous_day_commission` `0` not `300`, and the per-masseuse performance row `undefined`. GREEN
  after: 9 of 9. The ninth test — a cancelled row counting for nothing — passed in both states by
  design; it is a regression guard on behaviour that was already correct, not a symptom reproduction.

  **The Validation line was too weak and was strengthened rather than relaxed.** As quoted it exercises
  only busy state, next-in-line and workload, which is `:42` and `:202`. An implementation changing
  only those two sites would have satisfied it in full while failing this step's fourth objective
  outright. Three supplementary assertions close the gap, all approved at the plan audit: yesterday's
  commission through `GET /staff/today/helper` covering `:756`; a two-successive-edits fixture
  asserting a workload of one, not three, which fails a denylist predicate directly rather than
  incidentally; and a source assertion that the predicate is imported from the shared module and no
  inline filter remains, which is what makes the fifth objective checkable at all.

  **Gates.** `npx jest __tests__` = 1 failed / 169 passed, identical to the recorded baseline, the
  single failure being `__tests__/nav.bilingual.present.test.js`, unrelated. Six integration suites
  reading the changed queries — walk-in queue refresh, transaction correction, paid time extension,
  booking reservation, time-window promotion, promotion settings manager — 56 passed, 0 failed.
  Security: all four call sites pass hardcoded literals (`'t'`, `''`), verified by grep; no user input
  reaches the interpolated alias; no new endpoint, no new input, and the change widens what is read
  while writing nothing. Performance: `EXPLAIN QUERY PLAN` before and after is byte-identical — the
  workload count keeps `SEARCH t USING COVERING INDEX idx_transactions_business_day_staff`, and the
  busy query's plan never depended on the status column.

  **Not touched, deliberately.** `backend/routes/transactions.js` (the edit write path, whose status
  values are mandated by `transaction-correction-operational-reversal.md` FR-003 and §6); every
  `web-app` file; `backend/routes/reports.js` (owned by ETSC-CORE-002); `backend/routes/admin.js` (see
  Discoveries — display-only, and payouts accrue correctly through the edit path itself);
  `backend/routes/staff.js:702`'s UTC date derivation (see Discoveries — owned by the freshness lane,
  and the reason the `:712` test pins a fixture to the real UTC date instead of `?at=`).

  **Docs.** New `backend/services/transaction-status-sql.js.md`. `backend/routes/staff.js.md` had three
  stale lines asserting the counts came from `ACTIVE` rows — corrected at `:29`, `:41` and `:137` — plus
  a new bug-record section covering the symptom, the two rejected hypotheses and the resolution.

### STEP_ID: ETSC-CORE-002 — the day's money counts a corrected row — ✅ DONE
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-001
- **Touches:** `backend/routes/reports.js`, `backend/routes/transactions.js`, `tests/`
- **Why this matters beyond tidiness:** an edited transaction currently contributes nothing to the
  day's revenue, because today's summary counts live rows only and after an edit neither row is live.
  A customer edited from 798 to 399 shows as **0** in the day's takings, so the cash the manager
  expects for that customer drops to nothing. The audit trail still shows the edit, but the headline
  number does not. **This is an open theft window, and it is the reason this step exists.**
- [x] Today's revenue, fee and payment-method totals count a correction replacement as live money,
      matching what the date-range financial report already does at `backend/routes/reports.js:239`.
- [x] Superseded and cancelled rows stay excluded, so an edit never double-counts.
- [x] 🔴 **The permanent archive is corrected too.** `POST /reports/end-day`
      (`backend/routes/reports.js:456`) writes the day's row into `daily_summaries` counting live rows
      only, so every edited transaction is missing from the archived record **forever**. It is live —
      called from `web-app/api.js:499` via `web-app/shared.js:586-597` and `web-app/summary.html:515`.
      Fixing the screen and leaving the archive wrong moves the defect into the books a manager would
      audit months later.
- [x] The daily per-masseuse report (`backend/routes/reports.js:63`) is corrected with the same
      predicate.
- **Validation:** for a day containing a transaction edited from 399 to 798, today's summary reports
  798 and excludes 399; **and** closing the day archives 798 into `daily_summaries`, not zero;
  **and** every one of the eight money readers returns 798 rather than zero — `reports.js:24`,
  `:45`, `:63`, `:204`, `:215`, `:456` and `transactions.js:935`, `:946`, each with its own
  assertion. Naming only some of them is the defect this line was rewritten twice to remove.
  Satisfies AC-004. The third assertion is here because the previous step proved the danger: its
  criterion named only two of its four readers, so an implementation could have satisfied it in full
  while leaving a reader untouched. Every reader named in the objectives gets an assertion. Both observed failing beforehand, where the day reports zero for that customer.
  The cross-report agreement assertion lives in ETSC-MONEY-001, scoped there.
- **Risk notes:** the same admit-corrected-but-not-superseded care as the previous step. The existing
  date-range report is the reference implementation — match its treatment rather than inventing one.
- **Completion Notes:** Shipped 2026-08-18.

  **What changed.** Eight money filters converted to `countsAsLiveWork()` from the existing shared
  module `backend/services/transaction-status-sql.js`, yielding `status IN ('ACTIVE', 'CORRECTED')`
  at every site. No second predicate was written and no SQL was inlined. Six sites in
  `backend/routes/reports.js`: the daily report's transaction summary (`:25`), payment breakdown
  (`:46`) and per-masseuse performance (`:64`); today's summary (`:205`) and its payment breakdown
  (`:216`); and the permanent end-day archive (`:457`). Two in `backend/routes/transactions.js`: the
  today-summary totals (`:936`) and its payment breakdown (`:947`). Line numbers shifted by one in
  each file because of the added import. The whole production diff is 12 insertions / 10 deletions
  across those two files and nothing else.

  **RED observed before any production line changed** — 12 failed / 4 passed across the two new
  specs, every money reader returning the predicted zero: `total_revenue` 0 where 1596 was required
  on all three read endpoints, the Cash and Transfer payment-breakdown rows `undefined` rather than
  798 each, no `masseuse_performance` row for สา at all, and the archived `daily_summaries` row
  carrying `total_revenue` 0 rather than 798. GREEN after: 16 of 16. The four that passed in both
  states are guards by design, not symptom reproductions — the allowlist shape of the already-shipped
  predicate, `end-day` returning 200, the not-1197/1298/1697 double-count guard which can only fail
  if the fix over-widens, and the assertion that end-day leaves no surviving source rows.

  **The Validation line was strengthened twice, and the second time was necessary.** As it stood at
  `511fd28` it named three of the eight readers, so an implementation touching only `reports.js:204`,
  `:63` and `:456` would have satisfied it verbatim while leaving four money readers broken —
  including the whole of `GET /transactions/summary/today`, a second endpoint whose informal name is
  also "today's summary" and which an implementer reading the criterion had no way to know existed.
  The plan audit rewrote the criterion to name all eight with an assertion each. That is now the
  shipped test shape: one assertion per reader, plus two source-pattern assertions proving both
  routes import the shared module and that no `WHERE ... status = 'ACTIVE'` money clause survives in
  either file.

  **Test topology.** Two spec files, not one. `POST /reports/end-day` archives the day and then
  DELETEs the day's transaction rows (`backend/routes/reports.js:480-492`), so any fixture sharing
  its database is destroyed. Each Jest spec file calls `mkdtempSync` and sets `process.env.DB_PATH`
  at module scope before requiring the server, and Jest runs spec files in separate workers, so a
  separate file is the only thing that guarantees isolation by construction rather than by
  declaration order. In the archive spec, end-day fires once in `beforeAll` and every test then reads
  `daily_summaries`, so no test there depends on running before or after another. Both fixtures pin
  rows to the real current UTC calendar date, because all three endpoints derive their day from
  `new Date().toISOString().split('T')[0]` and honour no clock pin.

  **Gates.** `npx jest __tests__` = 1 failed / 169 passed, identical to the recorded baseline, the
  single failure being `__tests__/nav.bilingual.present.test.js`, unrelated. Integration regression
  measured by stashing the production diff and re-running: 7 suites / 65 tests passed before, 9
  suites / 81 tests passed after — the difference is exactly the 16 new tests, zero regressions.
  Security: all twelve `countsAsLiveWork()` call sites across the three route files pass hardcoded
  literals (`'t'`, `''`), verified by grep; no user input reaches the interpolated alias; no new
  endpoint, no new input. The change widens what is read; the only write it affects is the end-day
  archive, which now stores the correct larger total, and that handler's DELETE predicate is
  untouched. Performance: `EXPLAIN QUERY PLAN` before and after is identical — both the archive sum
  and the payment breakdown keep `SEARCH transactions USING INDEX
  idx_transactions_recent_date_timestamp (date=?)`; the status column never drove these plans.

  **Not touched, deliberately.** The edit write path (`backend/routes/transactions.js:694-697`,
  `:714`), whose status values are mandated by `transaction-correction-operational-reversal.md`
  FR-003 and §6. The audit-repair tool (`:791`, `:800`) — `ETSC-CORE-002a`.
  `getCorrectionEligibleStaff()` (`:21`, `:29`) — `ETSC-CORE-002b`, escalated from this step's
  planning and now a step of its own. The date-range reports (`backend/routes/reports.js:109`,
  `:148`, `:169`, `:240`), the reference implementation this step was matched to. The pending-add-on
  preservation subquery (`:485`, `:488`), which selects rows to rescue from deletion rather than rows
  to count. `isSettled()` at all four sites that carry it — orthogonal to the live-row rule, and the
  source test pins its call count at four so it cannot be dropped silently. `backend/routes/staff.js`,
  `backend/routes/admin.js`, and every `web-app` file.

  **Docs.** New bug records in `backend/routes/reports.js.md` (the money defect plus a dedicated
  section on the archive being the irreversible one) and `backend/routes/transactions.js.md` (the
  second today-summary endpoint, plus an explicit list of what was left alone and who owns each).
  `backend/services/transaction-status-sql.js.md` §3 now names all twelve consumer sites, and §5 was
  corrected: it had claimed all `transactions.js` live-row filters belonged to this step, which
  silently absorbed two filters this step never covered. Each is now attributed to the step that owns
  it.

### STEP_ID: ETSC-CORE-002a — the audit-repair tool keys on the link — ✅ DONE
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `backend/routes/transactions.js`, `__tests__/`
- [x] The audit-integrity repair tool at `backend/routes/transactions.js:782-825` finds a superseding
      row by its link to the row it replaces, rather than by that row's status, so it keeps working if
      the status vocabulary is ever extended.
- [x] A full backend search has been run for every other reader of the `CORRECTED` status, and each is
      either converted the same way or recorded as deliberately left alone with a reason.
- **Validation:** the repair tool relabels a superseded row that was wrongly left live, and leaves a
  correctly-formed chain untouched — satisfies AC-009. Observed failing on a fixture where the
  superseding row carries a status the current query does not match.
  **Strengthened at S4 (2026-08-18) — the fourth too-few-readers hole in this lane.** As written the
  line reaches only the INNER lookup: "the superseding row carries a status the current query does not
  match" is `:800`, and "wrongly left live" is satisfied by the `ACTIVE` case the OUTER scan at `:791`
  already caught. A change to `:800` alone passes it verbatim. Two real defects survive that:
  **(a)** the original of a **first** edit has a null `corrected_from_id`, which the outer scan
  required to be non-null, so the most basic case the tool exists for was unreachable; **(b)** a
  superseded row left `CORRECTED` was invisible to the outer scan — and **this epic made that one
  dangerous**, because `countsAsLiveWork()` now admits `CORRECTED` at fourteen sites, so such a row
  double-counts the masseuse's workload and the day's money in the very tool meant to catch
  double-counting. Both filters now carry their own assertion; the criterion was not relaxed.
- **Risk notes:** this hardens the fraud control rather than changing behaviour. It is independent of
  the two steps above and may run concurrently with them — it shares no file with `ETSC-CORE-001`.
  **Correction:** it does share `backend/routes/transactions.js` with `ETSC-CORE-002` and
  `ETSC-CORE-002b`, which is why it ran after them, not beside them.
- **Completion Notes:** Shipped 2026-08-18.

  **What changed.** One join replaces both status-keyed matches in
  `POST /transactions/fix-edited-status`. A row is superseded **iff another row points at it through
  `corrected_from_id`**, so the query joins successors to predecessors on that link and filters the
  predecessor with `countsAsLiveWork('t')` — an allowlist choosing *which* rows may be relabelled,
  which is what stops a `CANCELLED (…)` row's own reason string being overwritten with an edit label.
  `ORDER BY s.id ASC` into a `Map` keeps the choice deterministic if a chain ever forked. Production
  diff confined to `backend/routes/transactions.js`.

  **RED observed before the handler changed** — `tests/integration/audit-repair-keys-on-link.integration.test.js`,
  4 failed / 3 passed. `TX-B` stayed `ACTIVE` where `EDITED (Corrected by TX-C)` was required (the
  twice-edited chain); the stray row stayed `CORRECTED`; the original of a first edit stayed `ACTIVE`;
  and the handler source still carried both status matches. **The double-count was reproduced, not
  argued:** the roster reported `today_massages: 2` for a single massage before the repair ran, and 1
  after. GREEN: **7 of 7.** The three that passed in both states are declared guards — a
  correctly-formed chain untouched with `fixedCount` 0, a cancelled row keeping its reason string, and
  the live tail of a three-row chain surviving two consecutive repair runs.

  **Objective 2 — the full `CORRECTED` reader search, with a disposition for each.** Backend:
  `backend/models/database.js:359` (unique booking index) and `backend/routes/transactions.js:54`
  (`getCorrectionCandidates`) are correct allowlists — spec §6 makes an `ACTIVE` **or** `CORRECTED`
  row correctable. `backend/routes/transactions.js:153` (`/recent`) includes `EDITED%` deliberately so
  the audit trail stays visible. `:714` is the write path, mandated by FR-003. `backend/routes/reports.js:109`,
  `:148`, `:169`, `:240` are the date-range reports, the reference implementation the whole epic was
  matched to. All left alone. `web-app/shared.js:198`, `:672`, `:678`, `:706`, `:717`, `:755`,
  `web-app/summary.html:385` and `web-app/summary.ejs:385` use `status.includes('CORRECTED')` for
  display filtering — out of this step's Touches and display-only, left alone.

  **Gates.** `npx jest __tests__` = 1 failed / 169 passed, identical to baseline, the single failure
  `__tests__/nav.bilingual.present.test.js`, unrelated. Eleven integration suites = 95 passed / 0
  failed (81 before this session's two steps, plus 7 and 7). Security: the handler takes no user
  input, adds no endpoint, and the one interpolated value is the hardcoded alias `'t'`; the UPDATE is
  still parameterised. Performance **improved**: the old scan planned as `SCAN transactions`, the new
  join as `SCAN s | SEARCH t USING INDEX sqlite_autoindex_transactions_1 (transaction_id=?)`. An
  intermediate `EXISTS` + correlated-subquery form was measured at `SCAN t | SCAN s | SCAN s` and
  **rejected for the join** rather than shipped.

  **Not touched, deliberately.** Everything in the reader search above; `backend/routes/staff.js`;
  `backend/routes/admin.js`; every `web-app` file; and `getCorrectionEligibleStaff()` at `:21`/`:29`,
  shipped by `ETSC-CORE-002b` earlier in this session.

  **Touches divergence, recorded rather than silent:** this step's Touches names `__tests__/`, but
  `__tests__` holds only static contract tests with no server or database, and its test count is the
  phase gate's baseline. The spec needs the real handler and a real database, so it went to
  `tests/integration/` with the rest of the lane. Putting it in `__tests__` would have moved the
  baseline this epic checks against.

### STEP_ID: ETSC-CORE-002b — correction picks a replacement who is actually free — ✅ DONE
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `backend/routes/transactions.js`, `tests/`
- **Why this exists:** found during ETSC-CORE-002's planning. `getCorrectionEligibleStaff()` at
  `backend/routes/transactions.js:16-45` chooses the default replacement masseuse when reception
  corrects a transaction. Its workload subquery at `:21` and its busy scan at `:29` both filter live
  rows only — **the same defect ETSC-CORE-001 fixed in the staff route, in a different file.** So a
  masseuse who is mid-massage on a correction replacement reads as free with zero workload and is
  offered as the replacement for the next correction. That is
  `transaction-correction-operational-reversal.md` FR-004 failing in the very flow this epic is
  about, so shipping without it would leave the bug alive where it is most visible.
- **Depends on ETSC-CORE-002 for file safety, not for logic** — both write
  `backend/routes/transactions.js`, so they must not run concurrently.
- [ ] The correction flow's workload count and busy scan recognise a correction replacement as live
      work, using the same shared predicate, with superseded and cancelled rows still excluded.
- [ ] No inline live-row filter remains in `getCorrectionEligibleStaff()`.
- **Validation:** **both** filters are proven fixed, each by an assertion the other cannot satisfy.
  (a) A masseuse mid-massage on a correction replacement is not offered as the default replacement,
  **and** an override naming her is refused with a 409 — the picker both suggests and enforces
  (`backend/routes/transactions.js:650-655`), so today she is wrongly accepted as well as wrongly
  suggested. (b) With no mid-massage masseuse in play at all, a masseuse whose correction replacement
  has **already finished** must lose the default slot to a colleague with genuinely no work, on
  workload rather than queue position. (c) The function's source contains the shared predicate twice
  and no inline live-row filter. Each observed failing beforehand.
  **Why (b) exists:** the earlier wording was satisfiable by fixing the busy scan alone — that removes
  her from the list, so the first clause passes and the second has nothing left to compare. The
  workload filter would have stayed broken and the finished-massage masseuse would still be handed
  the next correction. Assertion (b) uses a masseuse the busy filter cannot reach, so a half-fix
  fails it. This is the third step in this lane whose criterion named fewer readers than its
  objectives; one assertion per named reader is now the rule.
- **Risk notes:** the eligibility guards elsewhere in this file are about a row's own lifecycle state,
  not workload — do not widen into them. The audit-repair tool at `:790` and `:799` belongs to
  ETSC-CORE-002a.
- [x] The correction flow's workload count and busy scan recognise a correction replacement as live
      work, using the same shared predicate, with superseded and cancelled rows still excluded.
- [x] No inline live-row filter remains in `getCorrectionEligibleStaff()`.
- **Completion Notes:** Shipped 2026-08-18.

  **What changed.** Both live-row filters in `getCorrectionEligibleStaff()` now call
  `countsAsLiveWork()` from the existing shared module: the workload subquery at `:21` and the busy
  scan at `:29`, each yielding `status IN ('ACTIVE', 'CORRECTED')`. No second predicate, no inlined
  SQL, and **no new import** — `:8` already carried it from `ETSC-CORE-002`, so **this diff shifts no
  line numbers in any file**, which is why `ETSC-CORE-002a` could follow immediately without
  re-deriving its own cited sites. Production diff: 12 insertions / 2 deletions in
  `backend/routes/transactions.js`, of which 10 insertions are the comment explaining the test export
  below.

  **RED observed before either filter changed** —
  `tests/integration/correction-replacement-picker.integration.test.js`, 5 failed / 2 passed, every
  value as predicted: the eligible list came back `["Busy", "Free", "Wrong"]` with the mid-massage
  masseuse ranked first; the override naming her returned **201 instead of 409**; the
  finished-massage masseuse's `today_massages` read `0` where `1` was required; the picker and the
  roster disagreed `0` against `1` for the same masseuse on the same day; and the function's source
  contained `countsAsLiveWork(` zero times. GREEN after: **7 of 7**. The two that passed in both
  states are declared guards, not symptom reproductions — the two-successive-edits count-once guard,
  which exists to fail a denylist rather than the current code, and the cancelled-row guard on
  behaviour that was already correct.

  **🔴 The defect was worse than the ledger described: she was wrongly ACCEPTED, not merely wrongly
  suggested.** `getCorrectionEligibleStaff()` feeds two decisions at `:650-655` — the default
  replacement (`eligibleStaff[0]`) and the FR-007 availability guard (`.some(...)`). Reception
  overriding to a masseuse who was mid-massage on a correction replacement got a **201 and a saved
  correction**, where FR-007 requires a refusal. That is the live half of this defect and it is now
  covered end to end through the real handler and database.

  **🔴 The default-suggestion half is unreachable over HTTP, and that is a spec-level finding.**
  `validateInput` is mounted globally at `backend/server.js:86`, and
  `backend/middleware/input-validation.js:105-108` rejects any `POST /api/transactions` carrying no
  `masseuse_name` — correction or not — measured, returning `400 "Masseuse name must be between 1 and
  100 characters"`. So `:652` never executes and the sort at `:45` has no HTTP-visible effect. The
  route's own field check at `:588` deliberately exempts corrections, so the route and the middleware
  contradict each other. **The workload filter was fixed regardless** — it is wrong either way and is
  a live trap for whoever makes the default reachable — and is asserted directly against the
  function, which is exported as `router.getCorrectionEligibleStaff` for that purpose only. That
  export changes no runtime behaviour and leaves `module.exports = router` intact. Without it,
  Validation clause (b) has no observable and would have collapsed into clause (c), which is the
  same class of hole this lane has now hit three times, in a new disguise. See Discoveries.

  **Gates.** `npx jest __tests__` = 1 failed / 169 passed, identical to the recorded baseline, the
  single failure being `__tests__/nav.bilingual.present.test.js`, unrelated. Ten integration suites
  including this step's = 88 passed / 0 failed; the nine pre-existing ones were 81 passed before, so
  the delta is exactly the 7 new tests and zero regressions. In particular
  `tests/integration/transaction-correction.integration.test.js`'s existing "rejects a busy manual
  replacement" test still passes — it uses an `ACTIVE` busy row, which the allowlist still admits.
  Security: all fourteen `countsAsLiveWork()` call sites across the three route files pass hardcoded
  literals (`'t'`, `''`), verified by grep; no user input reaches the interpolated alias; no new
  endpoint, no new input, no new write. The change **narrows** who may be assigned a correction, the
  safe direction for FR-007. Performance: `EXPLAIN QUERY PLAN` before and after is byte-identical on
  both queries — the workload subquery keeps `SEARCH t USING INDEX
  idx_transactions_business_day_staff (business_day=? AND masseuse_name=? AND status=?)`, SQLite
  serving `IN` as an index seek exactly as it served `=`.

  **Not touched, deliberately.** The edit write path (`:693-697`, `:714`), mandated by
  `transaction-correction-operational-reversal.md` FR-003 and §6. The audit-repair tool (`:791`,
  `:800`) — `ETSC-CORE-002a`. The eight money sites in `backend/routes/reports.js` and this file.
  The lifecycle guards at `:291`, `:437`, `:452`, `:494`, `:504`, `:878`, `:893`, and the
  `booking_credits` status filters at `:65`, `:94`, `:762`, `:907`, none of which aggregate work.
  `getCorrectionCandidates()` at `:54` and `/recent` at `:153`, both already correct — the latter
  includes `EDITED%` on purpose so the audit trail stays visible. `backend/routes/staff.js`,
  `backend/routes/admin.js`, `backend/middleware/input-validation.js`, and every `web-app` file.

  **Docs.** New bug record in `backend/routes/transactions.js.md` covering the picker defect, the
  wrongly-accepted override, and the unreachable-default finding.
  `backend/services/transaction-status-sql.js.md` moved `:21` and `:29` out of §5 Known
  Non-Consumers and into §3 Dependency Mapping, which now names fourteen consumer sites.

### STEP_ID: ETSC-CORE-003 — an edit is all-or-nothing — ✅ DONE
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `tests/` — **expected to be test-only.** The edit path already wraps its work in one
  database transaction (`BEGIN IMMEDIATE` at `backend/routes/transactions.js:658`, `COMMIT` at `:754`,
  `ROLLBACK` at `:771`), with both the relabel and the insert inside that span. If the implementer
  finds a real escape path, this step gains production code and records the divergence.
  **Verified 2026-08-18, and the cited lines had drifted by one:** the wrapper is at `:659`, `:755`
  and `:772`. No escape path exists — the fee reversal (`:681-684`), the relabel (`:692-695`) and
  the insert (`:714`) are all inside the span, and the only exit that skips `COMMIT` runs `ROLLBACK`.
  **Shipped test-only, as expected.**
- [x] The relabel of the superseded row and the insert of the replacement either both happen or
      neither does.
- [x] After any number of successive edits, exactly one row in the chain counts as live work and live
      money; every earlier row is superseded and counts for neither.
- **Validation:** a forced failure part-way through an edit leaves the original live and no
  replacement row present; and two successive edits leave exactly one live row — satisfies AC-008.
  **Strengthened at S4 (2026-08-18) — the fifth too-weak-criterion finding in this lane, and the
  first where the weakness is that the criterion is satisfiable by a handler that did nothing.**
  "The original is still live and no replacement row is present" is equally true of an edit that
  never started, and of a handler reordered to insert before relabelling — neither of which is
  atomic. Two assertions close that: the original masseuse's `total_fees_earned` must be **restored**
  after the forced failure (that write happens before both others, so finding it undone can only be
  a rollback), and a source-order assertion pinning `BEGIN IMMEDIATE` → fee reversal → relabel →
  insert → `COMMIT` → `ROLLBACK`. The second clause was also too weak: "exactly one live row" is a
  raw row count, which says nothing about the objective's actual words, *counts as live work and
  live money*. Both readers now get their own assertion, through the real endpoints.
- **Completion Notes:** Shipped 2026-08-18. **No production code — the step is tests only**, which
  is what its Touches predicted.

  **What was verified before anything was written.** The whole `POST /` handler was read, not
  grepped. `BEGIN IMMEDIATE` at `:659`, `COMMIT` at `:755`, `ROLLBACK` at `:772` in the single
  `catch`, guarded by `dbTransactionStarted`. Every write of the edit is inside that span: the
  original masseuse's fee reversal (`:681-684`), `reverseActiveBookingCredit()` (`:686`), the relabel
  (`:692-695`), the insert of the replacement (`:714`), the replacement masseuse's fee accrual
  (`:719-725`), the booking credit and the booking completion. **The three line numbers this step's
  Touches cited were each one low**; corrected above rather than left to drift further.

  **New spec: `tests/integration/edit-is-all-or-nothing.integration.test.js`, 9 of 9 green.**
  Isolated by `mkdtempSync` plus `process.env.DB_PATH` at module scope, the pattern the rest of the
  lane uses.

  **How the failure is forced, without touching production code.** The fixture creates a SQLite
  trigger that aborts any INSERT into `transactions` carrying a marker `customer_contact`, and drops
  it in `afterAll`. It fires at STEP 7 — after the fee reversal and after the relabel are already
  written inside the open transaction. `RAISE(ABORT)` reverts only the offending statement and leaves
  the enclosing transaction open, so what the test observes is **the handler's own `ROLLBACK`** undoing
  the two earlier writes, not SQLite undoing the insert.

  **Every assertion here is a GUARD, declared as such, and none is a symptom reproduction.** The
  behaviour was already correct, so nothing could go red against the shipped tree. **The guards were
  proven capable of failing by mutation instead:** removing `BEGIN IMMEDIATE` and `COMMIT` from the
  handler turned 3 of the 9 red, with the exact partial-write state the objective forbids — the
  original left `EDITED (Corrected by TX-1787039012150-4a9ccb)` while no row with that id exists, a
  chain with **no** live row at all. The mutation was reverted immediately (`git checkout --`) and
  the suite re-measured at 9 of 9; `git status` confirms `backend/routes/transactions.js` unmodified.

  **The two-successive-edits chain is driven through the real endpoint**, not assembled by hand as
  the reader-isolating specs in this lane do — this step is about the writer, so hand-building the
  rows would assert nothing. Three `POST /api/transactions` calls produce the operator's reported
  shape: 399 superseded, 798 superseded, 399 live. The chain is then read four ways — the raw
  live-work predicate returns exactly one row; `/api/staff/roster` reports `today_massages` 1, not 3;
  `/api/reports/summary/today` and `/api/transactions/summary/today` both report 399 and a count of
  1, not 1197 or 1596; and `/api/transactions/recent` still lists all three rows, so the audit trail
  the operator ruling protects is intact.

  **Gates.** `npx jest __tests__` = 1 failed / 169 passed, identical to the recorded baseline, the
  single failure `__tests__/nav.bilingual.present.test.js`, unrelated.
  `npx jest --testMatch '**/tests/integration/**/*.test.js'` = 4 failed / 148 passed, the four being
  the recorded pre-existing failures (`revenue.card.regression`, `nav.bilingual.present`,
  `nav.bilingual.keys-coverage`, `csrf-auth-flow`) and the 148 being 139 plus this step's 9. Zero
  regressions. Security: no production change, no new endpoint, no new input; the fixture's trigger
  is created and dropped inside a `mkdtemp` database that is deleted in `afterAll`. Performance: no
  production change, so no query plan moved.

  **Not touched.** Nothing outside `tests/`, this ledger and `backend/routes/transactions.js.md`.
  In particular the edit write path's status values, all fourteen `countsAsLiveWork()` sites,
  `backend/routes/admin.js` and every `web-app` file are unmodified.

  **Docs.** New section in `backend/routes/transactions.js.md` §5 recording that the atomicity is
  pre-existing, why it needed covering anyway, how the trigger forces the failure, and the mutation
  check that proves the guards bite.

**Phase 1 complete when:**
- [ ] ETSC-CORE-001, ETSC-CORE-002, ETSC-CORE-002a, ETSC-CORE-002b and ETSC-CORE-003 are all `✅ DONE`
- [ ] `npx jest __tests__ tests/integration` shows **no new failures against the baseline recorded
      below**. Repo-root `npx jest` is NOT a usable gate: measured 2026-08-18 it is 67 failed / 41
      passed suites, because it sweeps Playwright specs that abort under Jest. Baseline for the
      usable subset, same date: `npx jest __tests__` = 1 failed / 169 passed tests, the single
      failure being `__tests__/nav.bilingual.present.test.js`, unrelated to this epic.
- [ ] A test asserting a superseded row is excluded from workload while its replacement is counted
      exists and passes — the double-count guard

**This gate authorizes Phase 2.**

---

## Phase 2 — Prove the reported symptom is gone — OPEN
**Phase goal:** the operator's actual symptom is covered by tests that fail on the old build.

### STEP_ID: ETSC-QUEUE-001 — a superseded row never counts, however many edits — ✅ DONE
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-001
- **Touches:** `__tests__/`
- **Why this is separate from the fix:** widening the readers to admit a correction replacement is
  one edit away from also admitting the superseded row it replaced. That would double a masseuse's
  workload on every edit and make her *less* available rather than more. This step is the guard.
- [x] A superseded row contributes nothing to busy state or workload, and a cancelled row contributes
      nothing either.
- [x] After two successive edits of the same customer, the masseuse's workload count is one, not
      three.
- [x] A masseuse with one live correction replacement reads as busy for its duration, not for the
      superseded row's.
- **Validation:** the three assertions above pass — guards AC-001, AC-002 and AC-003 against the
  double-count failure mode. The two-successive-edits case must be built as a fixture, because it is
  the shape the operator actually reported: three rows for one customer.
  **Strengthened at S4 (2026-08-18) — the sixth too-weak-criterion finding in this lane, and here the
  hole is in the FIXTURE rather than the wording.** All three assertions were already passing against
  the shipped tree using `edited-transaction-live-state.integration.test.js`'s fixtures, so a spec
  that merely copied them would have satisfied this criterion verbatim while proving nothing this
  step exists for. Two blind spots in those fixtures were found and closed:
  **(a)** their edit LENGTHENS the massage — one hour to two — and the busy window is the MAX end
  across live rows (`backend/routes/staff.js:208-213`), so a wrongly admitted superseded row is the
  shorter one and changes no answer. Objective 3 is therefore unreachable with a lengthening edit.
  This spec SHORTENS the massage, so admitting the superseded row moves `busy_until_iso` by an hour.
  **(b)** in those fixtures every superseded row sits beside a live replacement for the **same**
  masseuse, so excluding it is invisible in busy state — she reads busy either way. This spec gives
  a masseuse a superseded row **alone**, the reassignment case where reception corrected the wrong
  masseuse and the replacement went to a colleague. If the superseded row were admitted she would
  read busy mid-shift on a massage she is not giving.
- **Risk notes:** no production code is expected here. If an assertion cannot be made to pass by
  Phase 1's changes alone, the fix admitted too much — stop and narrow it rather than adding code.
  **None was needed: the step shipped test-only and every assertion passed on Phase 1's changes
  alone.**
- **Completion Notes:** Shipped 2026-08-18. **No production code.**

  **New spec: `tests/integration/superseded-row-never-counts.integration.test.js`, 8 of 8 green.**
  Isolated by `mkdtempSync` plus `process.env.DB_PATH` at module scope. Fixtures are built **per
  test** rather than shared, because `walk_in_priority` is a single roster-wide flag — exactly one
  masseuse on a roster carries it — so the next-in-line assertions need rosters of their own.

  **Every assertion is a declared GUARD, and the RED count is zero by design.** The behaviour was
  already correct after `ETSC-CORE-001`, so nothing could reproduce a symptom against this tree.
  **The guards were proven capable of failing by mutation:** turning `countsAsLiveWork()` into the
  denylist its own doc warns about — `status NOT LIKE 'CANCELLED%'` — turned **7 of the 8 red**,
  with `today_massages` reading **3** for one massage and `busy_until_iso` reading the superseded
  row's later end. The eighth is the plain cancelled-row assertion, which a denylist still satisfies;
  it is kept because it is the only one of the eight guarding the cancelled half of the rule. The
  mutation was reverted immediately and the suite re-measured at 8 of 8; `git status` confirms
  `backend/services/transaction-status-sql.js` unmodified.

  **What each objective got.** Objective 1, busy state: a masseuse holding **only** a superseded row
  reads `available` with a null busy window while the colleague who took the work reads `busy` until
  12:30 — so the exclusion is proven not to be blanket. Objective 1, cancelled rows: a plain
  cancelled row counts for nothing, **and** a cancelled *correction replacement* counts for nothing
  either, so voiding an edited transaction really releases her rather than letting the superseded row
  resurrect the massage. Objective 2: the three-row chain gives `today_massages` 1, and — the
  operator-visible cost — she still takes the next-in-line slot from a colleague who really did two
  massages and holds the better queue position, which a count of 3 would have lost her. Objective 3:
  a shortening edit, asserted both as the replacement's end **and** explicitly not the superseded
  row's; and the same again mid-chain, where each of two successive edits shortens the massage and
  neither earlier end may appear.

  **Gates.** `npx jest __tests__` = 1 failed / 169 passed, identical to the recorded baseline.
  `npx jest --testMatch '**/tests/integration/**/*.test.js'` = 4 failed / 156 passed, the four being
  the recorded pre-existing failures and the 156 being 148 plus this step's 8. Zero regressions.
  Security and performance: no production change.

  **Touches divergence, recorded rather than silent — the same one `ETSC-CORE-002a` recorded.** This
  step's Touches names `__tests__/`, but `__tests__` holds only static contract tests with no server
  and no database, and its test count is this epic's phase-gate baseline. These assertions need the
  real handler and a real database, so the spec went to `tests/integration/` with the rest of the
  lane. Putting it in `__tests__` would have moved the baseline the gates check against.

  **Docs.** `backend/services/transaction-status-sql.js.md` §4 now records this spec, why it is not a
  copy of the two that came before it, and the denylist mutation result.

### STEP_ID: ETSC-MONEY-001 — the money is right and counted once — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-002
- **Touches:** `__tests__/`
- [ ] For a day containing an edited transaction **and no part-paid add-on**, today's summary and the
      date-range financial report return the same revenue total. The fixture must exclude part-paid
      add-ons: today's summary filters them out (`backend/routes/reports.js:204` applies the settled
      predicate) and the date-range report does not (`:239` has no such filter), so the two endpoints
      disagree by the value of any pending money for reasons that have nothing to do with editing.
      That divergence is a separate pre-existing defect — record it in Discoveries, do not fix it here.
- [ ] An edited transaction is counted once, not twice — the superseded row adds nothing.
- [ ] The masseuse's payday balance after an edit equals the edited fee, with the original reversed
      exactly once.
- **Validation:** all three assertions pass — satisfies AC-005 and AC-007, each seen failing
  beforehand. The count-once assertion is the money-side twin of the double-count guard in the
  previous step.
- **Risk notes:** this is the step that closes the theft window described at `ETSC-CORE-002`. A day
  containing an edit must never again report less than it took.
- **Completion Notes:**

**Phase 2 complete when:**
- [ ] ETSC-QUEUE-001 and ETSC-MONEY-001 are `✅ DONE`
- [ ] Every assertion in both steps has a recorded red-then-green observation
- [ ] A two-successive-edits fixture exists, matching the shape the operator reported

**This gate authorizes Phase 3.**

---

## Phase 3 — Remove the contradictory busy path — OPEN
**Phase goal:** one source of truth for whether a masseuse is busy.

### STEP_ID: ETSC-CLEAN-001 — reception stops writing the unread busy record — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-QUEUE-001
- **Touches:** `web-app/transaction.html`, `web-app/transaction.ejs`, `__tests__/`
- [ ] Reception's submit no longer writes a busy record that nothing reads; busy state derives from
      transactions only.
- [ ] Before removing anything, every consumer of the legacy busy columns has been searched for —
      including the expired-status reset job at `backend/routes/staff.js:309-396`. If a live consumer
      exists, this step narrows to removing only the intake call and the finding is recorded.
- **Validation:** submitting a customer still marks the masseuse busy for the service duration and
  advances the queue, with the set-busy call gone — no regression against AC-001 or AC-002.
- **Risk notes:** **this is cleanup, not repair, and it is the first thing to cut if the epic needs
  narrowing.** It serves no acceptance criterion directly; it exists because two contradictory busy
  systems are what made this defect hard to see. It also writes the intake page, which both other
  epics write — see the collision note at the top of this file.
- **Completion Notes:**

**Phase 3 complete when:**
- [ ] ETSC-CLEAN-001 is `✅ DONE`, or is explicitly marked cut with the reason recorded
- [ ] `npx jest __tests__ tests/integration` shows **no new failures against the baseline recorded
      below**. Repo-root `npx jest` is NOT a usable gate: measured 2026-08-18 it is 67 failed / 41
      passed suites, because it sweeps Playwright specs that abort under Jest. Baseline for the
      usable subset, same date: `npx jest __tests__` = 1 failed / 169 passed tests, the single
      failure being `__tests__/nav.bilingual.present.test.js`, unrelated to this epic.
- [ ] `web-app/transaction.html` and `web-app/transaction.ejs` remain in parity under the existing
      contract test

**This gate authorizes Phase 4.**

---

## Phase 4 — Verification & Hardening — OPEN
**Phase goal:** the lane's steps work together against real boundaries, and the fix is confirmed on
the live branch server.

### STEP_ID: ETSC-VERIFY-001 — end-to-end journeys through real boundaries — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-CORE-003, ETSC-QUEUE-001, ETSC-MONEY-001
- **Touches:** `__tests__/`
- [ ] Journey — record a customer, edit the duration, and confirm through the real handler and
      database that she stays busy for the edited duration and off the next-in-line slot.
- [ ] Journey — record a customer, edit the price, and confirm the day's summary reports the edited
      amount.
- [ ] Journey — record a customer, edit twice, and confirm the transaction list shows every
      superseded row with its edited marker and exactly one live row (AC-006).
- [ ] Journey — void an edited transaction and confirm the reversal reaches the replacement.
- [ ] At least one of these journeys has been observed failing against the pre-change build.
- **Validation:** all four journeys pass through the real handler and database, no mocks — satisfies
  AC-006 and integrates AC-001 through AC-009. Waits are bounded polling against a real condition,
  never a fixed sleep.
- **Completion Notes:**

### STEP_ID: ETSC-DEPLOY-001 — deploy to the branch server and operator live-verify — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ETSC-VERIFY-001
- **Touches:** no repo files — server checkout only
- [ ] **Gates first:** every FSM gate is green before anything is deployed. Only gate-passed code
      ever reaches a server.
- [ ] **Verify-push:** push this session's `claude/…` working branch, commit message flagged
      `live-verify test`. **No `testingNN` number is minted here** — numbers come only from a
      post-checkpoint `/push`. This push exists solely so the server can fetch the code.
- [ ] **Migrations first, via the protocol:** none required by this epic — no schema or data change.
      Record that explicitly rather than skipping the check.
- [ ] **State the rollback before touching anything:** name the previous branch and SHA the server is
      on, plus the restart command, in this step's evidence.
- [ ] **Restart rules:** `massage-shop.service` is a reader service and restarts freely. No writer or
      ingestor service is touched by this epic.
- [ ] **Health-check after:** service active, one read endpoint returns 200; record
      `LIVE = <branch>@<sha>` in the Completion Notes.
- [ ] **Live-verify — look, don't touch:** the operator edits one real transaction's duration and
      confirms the masseuse stays busy and off the next-in-line slot, and that the day's summary
      shows the edited amount. Read-only observation plus using the feature exactly as intended.
- **Validation:** the operator confirms both behaviours on the live branch server, recorded verbatim
  in the Completion Notes — satisfies AC-001, AC-002 and AC-004 against real data.
- **Risk notes:** broken at live-verify → fix, re-push the same working branch, re-verify. Do not
  mint a number on a failed verify.
- **Completion Notes:**

**Phase 4 complete when:**
- [ ] ETSC-VERIFY-001 and ETSC-DEPLOY-001 are `✅ DONE`
- [ ] `npx jest __tests__ tests/integration` shows **no new failures against the baseline recorded
      below**. Repo-root `npx jest` is NOT a usable gate: measured 2026-08-18 it is 67 failed / 41
      passed suites, because it sweeps Playwright specs that abort under Jest. Baseline for the
      usable subset, same date: `npx jest __tests__` = 1 failed / 169 passed tests, the single
      failure being `__tests__/nav.bilingual.present.test.js`, unrelated to this epic.
- [ ] **The operator has live-verified the edit behaviour on the branch server** — this condition
      requires human judgement and is a deliberate handover
- [ ] `LIVE = <branch>@<sha>` is recorded in ETSC-DEPLOY-001's Completion Notes

**This gate ends the epic.**

---

## Open Decisions
- **D-01 (ratified 2026-08-18, REVERSED from the original authoring):** the replacement row keeps
  the `CORRECTED` status and the **readers** are corrected instead. The original decision — write the
  replacement live — was made without reading
  `transaction-correction-operational-reversal.md`, which mandates that status at FR-003 and §6, and
  without noticing the audit-repair tool at `backend/routes/transactions.js:782-825` that matches on
  it. Writing replacements live would contradict a governed contract and silently disable a fraud
  control. Operator ruling 2026-08-18: the audit trail exists because a receptionist stole money, and
  both rows must remain in the ledger exactly as they are.
- **D-02 (ratified 2026-08-18):** no historic data is rewritten, and none needs to be. The
  date-range financial report already counted correction replacements
  (`backend/routes/reports.js:108`, `:147`, `:239`), so the historic record was never wrong there.
  Only the live daily summary was, and it is only viewable on the day itself — so there is nothing
  stranded to backfill. This supersedes the concern raised as Q-01 at authoring.

## Open Questions
- **Q-01 — RESOLVED 2026-08-18, blocks nothing** — asked whether past edited transactions needed
  correcting in the historic record. They do not: the date-range financial report already counted
  them (`backend/routes/reports.js:239`). Only the same-day summary was wrong, and that view does not
  persist. No backfill, no operator decision needed.

## Discoveries
- **ETSC-CORE-002a shipping (2026-08-18):** 🔴 **this epic converted a dormant gap in the fraud
  control into a live double-count.** The audit-repair tool's scan took `corrected_from_id IS NOT NULL`
  plus a live status, so a superseded row left marked `CORRECTED` was invisible to it. Before
  `ETSC-CORE-001` and `ETSC-CORE-002` that row counted for nothing anywhere and was inert. Now
  `countsAsLiveWork()` admits `CORRECTED` at fourteen sites, so it adds a second massage to the
  masseuse's workload and a second fare to the day's takings — reproduced as `today_massages: 2` for
  one massage. **Fixed in this step.** The general lesson for the remaining steps: widening what
  counts as live makes every *stale* live row newly expensive, so anything that can leave one behind
  is now load-bearing.
- **ETSC-CORE-002a shipping (2026-08-18):** the repair tool could never fix the most basic case it
  exists for. Its scan required a non-null `corrected_from_id`, but the original of a **first** edit
  has none by definition, so an original wrongly left live after a failed relabel was unreachable. The
  tool only ever matched rows that were themselves replacements — a state the current writer cannot
  even produce, since it always inserts a replacement as `CORRECTED`. Fixed by keying on the link.
- **ETSC-CORE-002b shipping (2026-08-18):** 🔴 **the correction endpoint cannot accept a request that
  omits the masseuse, so FR-004's default-replacement rule has no reachable code path.**
  `backend/routes/transactions.js:588` deliberately exempts a correction from the required-field check
  (`!masseuseName && !originalTransactionId`), so the handler is written to fall back to
  `eligibleStaff[0]` at `:652`. But `validateInput` is mounted globally at `backend/server.js:86` and
  `backend/middleware/input-validation.js:105-108` rejects **every** `POST /api/transactions` with no
  `masseuse_name`, correction or not — measured, `400 "Masseuse name must be between 1 and 100
  characters"`. The route and the middleware contradict each other, and the middleware wins. So
  `transaction-correction-operational-reversal.md` FR-004 — *"The default is the next eligible staff
  member after the original incorrect assignment is excluded from active workload"* — is implemented
  but never executed; reception's page always sends a name (`web-app/shared.js:344`). The workload
  filter was fixed anyway, because it is wrong either way and is a trap for whoever makes the default
  reachable, and it is asserted directly against the function rather than through the endpoint.
  **Not fixed here:** relaxing an input-validation contract is outside this step's Touches and changes
  what the API accepts. **Operator decision — schedule or decline.** The two ways out are opposite
  answers to a product question, not a code one: exempt corrections in the middleware so reception can
  let the system choose, or delete the dead fallback at `:652` and make the name genuinely required.
- **ETSC-CORE-002b shipping (2026-08-18):** the defect was worse than this step described. The picker
  feeds the FR-007 availability guard as well as the default suggestion (`:650-655`), so a masseuse
  mid-massage on a correction replacement was not merely offered first — an override naming her was
  **accepted with a 201** where FR-007 requires a refusal. That half is live and is now covered end to
  end. The suggestion half is not reachable, per the Discovery above.
- **ETSC-CORE-002b planning (2026-08-18):** the correction picker's workload rule and the roster's are
  not the same rule, and this step does not make them the same. The roster ANDs the live-row predicate
  with the counts-as-a-massage predicate (`backend/routes/staff.js:42-43`); the picker has no
  counts-as-a-massage term (`backend/routes/transactions.js:21`). So a duration-upgrade add-on
  increments the picker's count and not the roster's. **Pre-existing, orthogonal to the live-row rule,
  and outside this step's objectives** — not widened into. Operator schedules or declines.
- **ETSC-CORE-002b planning (2026-08-18):** this step's own line citations were stale by one, written
  before the money step added an import, and contradicted this Discoveries section. Corrected to
  `:16-45`, `:21`, `:29`.
- **ETSC-CORE-002 planning (2026-08-18):** 🔴 **closing the day destroys the evidence.**
  `POST /reports/end-day` archives totals into `daily_summaries` (`backend/routes/reports.js:466-471`)
  and then **deletes that day's transaction rows** (`:479-491`), keeping only unpaid add-ons and their
  parents. No route file writes `archived_transactions`. So on any closed day containing an edit, the
  archived total omits that money **and** the source rows are gone — permanently unrecoverable. This
  raises ETSC-CORE-002 from important to urgent, and it means days already closed with edits have
  already lost that revenue from the books. Operator advised 2026-08-18 not to close a day until this
  step ships.
- **ETSC-CORE-002 planning (2026-08-18):** the correction flow's own replacement picker has the same
  defect — now owned by ETSC-CORE-002b rather than left as a note.
- **ETSC-CORE-001 planning (2026-08-18):** the manager's staff dashboard has the same defect and is in
  no step of this epic. `backend/routes/admin.js:147`, `:151`, `:155` compute a staff member's
  transactions today, fees this week and massages this week filtering live rows only, and `:487` does
  the same for the performance report. So an edited transaction disappears from the manager's view of
  what a masseuse earned. **Payouts are unaffected** — those accrue on the staff table, which the edit
  path updates correctly (`backend/routes/transactions.js:683-686`, `:720-726`) — so this is a display
  discrepancy on the oversight surface, not a money error. **Not widened into this epic**; the
  operator schedules or declines it.
- **ETSC-CORE-001 planning (2026-08-18):** `GET /staff/performance/today` derives its date from UTC at
  `backend/routes/staff.js:702` and ignores the `?at=` clock pin every other endpoint in that file
  honours. Pre-existing, and it belongs to `daily-state-freshness-steps.md`, not here. It constrains
  how `backend/routes/staff.js:711` can be tested.
- **ETSC-CORE-001 planning (2026-08-18):** the step's Validation line does not reach two of its own
  objectives — it exercises busy state, next-in-line and workload count only, so an implementation
  changing `backend/routes/staff.js:41` and `:201` while leaving `:711` and `:755` untouched would
  pass it while failing objective 4 verbatim. **The test was strengthened rather than the criterion
  relaxed**: three assertions were added covering yesterday's commission, a two-successive-edits
  workload count, and that the predicate is imported rather than inlined.
- **ETSC-CORE-002 planning (2026-08-18):** the correction flow picks a replacement masseuse using
  live-row-only filters of its own — `getCorrectionEligibleStaff()` at
  `backend/routes/transactions.js:21` (workload) and `:29` (busy scan). Same defect class as
  `ETSC-CORE-001`, different file, and it is **not money**, so it fell outside `ETSC-CORE-002`'s
  objectives. Escalated rather than absorbed; **now `ETSC-CORE-002b`**, sequenced after
  `ETSC-CORE-002` because both write that file.
- **ETSC-CORE-002 planning (2026-08-18):** the step's Validation line reached only three of its eight
  money readers, so an implementation touching `reports.js:204`, `:63` and `:456` alone would have
  passed it verbatim while leaving four readers broken — including the whole of
  `GET /transactions/summary/today`, a second endpoint sharing the informal name "today's summary"
  that an implementer had no way to discover from the criterion. **The criterion was rewritten to
  name all eight, one assertion each**, rather than the test being quietly widened past it. This is
  the second step in a row where a partially-scoped Validation line would have passed a partial fix;
  the rule now applied throughout this lane is one assertion per named reader.
- **ETSC-CORE-002 shipping (2026-08-18):** `POST /reports/end-day` is destructive in a way the epic
  had not fully priced. It archives the day into `daily_summaries` and **then deletes the day's
  transaction rows** (`backend/routes/reports.js:480-492`), and nothing writes
  `archived_transactions` — verified by reading the handler and searching the route files. So a day
  closed before this step shipped lost the edited money from the books *and* lost the rows that would
  let anyone reconstruct it. This is why the archive assertion was treated as the load-bearing one,
  and why it lives in its own database: the handler empties any fixture it shares.
- **Epic planning (2026-08-18):** the permanent daily archive is affected, not just the live screen.
  `POST /reports/end-day` (`backend/routes/reports.js:456`) writes `daily_summaries` counting live
  rows only, and it is live (`web-app/api.js:499`, `web-app/shared.js:586-597`,
  `web-app/summary.html:515`). Added to ETSC-CORE-002. Without it the epic would fix the screen and
  leave every edited transaction missing from the archived record permanently.
- **Epic planning (2026-08-18):** an edit distorts the NEXT day's queue order.
  `backend/routes/staff.js:755` computes `previous_day_commission` from live rows only and
  `:773` orders the roster by it. Added to ETSC-CORE-001.
- **Epic planning (2026-08-18):** two further money/fairness readers excluded corrected rows and were
  in no step — today's per-masseuse performance (`backend/routes/staff.js:711`) and the daily report
  (`backend/routes/reports.js:63`). Added to ETSC-CORE-001 and ETSC-CORE-002 respectively.
- **Epic planning (2026-08-18):** repo-root `npx jest` has no green baseline — 67 failed / 41 passed
  suites, all pre-existing, because it sweeps Playwright specs that abort under Jest. Every phase gate
  demanding "no failures" was unsatisfiable as authored and has been rewritten to a named subset plus
  a recorded baseline.
- **Epic planning (2026-08-18):** today's summary and the date-range financial report disagree by the
  value of any part-paid add-on, independently of editing — `backend/routes/reports.js:204` applies
  the settled-money filter and `:239` does not. **Pre-existing defect, out of scope here.** The
  cross-report assertion in ETSC-MONEY-001 is scoped around it rather than fixing it.
- **Epic planning (2026-08-18):** the edit path is already atomic (`BEGIN IMMEDIATE` at
  `backend/routes/transactions.js:658`), so ETSC-CORE-003 is expected to be test-only.
- **Epic planning (2026-08-18):** no test anywhere in the repo mentions the `CORRECTED` status. The
  status this whole epic turns on has zero coverage today, so every red-then-green observation here is
  genuinely new coverage rather than a modified assertion.

## Coverage
- **ETSC-001 (the live version is what counts) → ETSC-CORE-001** (availability and workload) and
  **ETSC-CORE-002** (the day's money)
- **ETSC-002 (lookups key on the link) → ETSC-CORE-002a**
- **ETSC-003 (one live row per chain) → ETSC-CORE-003, ETSC-QUEUE-001**
- **ETSC-004 (busy follows the edited duration) → ETSC-CORE-001, ETSC-QUEUE-001**
- **ETSC-005 (remove the dead busy path) → ETSC-CLEAN-001**
- **AC-001 → ETSC-CORE-001, ETSC-QUEUE-001, ETSC-VERIFY-001, ETSC-DEPLOY-001** ·
  **AC-002 → ETSC-CORE-001, ETSC-QUEUE-001, ETSC-VERIFY-001, ETSC-DEPLOY-001** ·
  **AC-003 → ETSC-CORE-001, ETSC-QUEUE-001** ·
  **AC-004 → ETSC-CORE-002, ETSC-MONEY-001, ETSC-DEPLOY-001** ·
  **AC-005 → ETSC-CORE-002, ETSC-MONEY-001** · **AC-006 → ETSC-VERIFY-001** ·
  **AC-007 → ETSC-MONEY-001** · **AC-008 → ETSC-CORE-003, ETSC-QUEUE-001** ·
  **AC-009 → ETSC-CORE-002a**
- **UNCOVERED:** none.
