# Edited Transaction State Correctness — Feature Specification

**Status:** Ready for `/steps-file-creation`
**Authored:** 2026-08-18
**Prefix:** `ETSC-xxx`
**Class:** Defect repair. Root cause confirmed by source reading, not inferred.

## 1. Executive Summary

### Feature Name
Edited Transaction State Correctness

### Goal

**After a transaction is edited, every part of the system must agree that the edited version is the
one that is real — the masseuse's availability, her workload, the day's money, and the monthly
report.** Today they disagree, because an edit leaves the live record in a state that half the system
does not recognise.

### Operator-reported symptom (2026-08-18)

A masseuse was recorded as a 1-hour Thai massage at 399 baht, then edited to a 2-hour massage at 798
baht. She continued to show as **first in the queue for the next customer** although she was
mid-massage. Three rows appeared in the transaction list for one customer.

### Success Criteria

1. After an edit, the masseuse shows as **busy** for the duration of the **edited** massage, not the
   original. *(machine)*
2. After an edit, she is **not offered as next in line** while that massage is still running.
   *(machine)*
3. After an edit, her **workload count** includes the edited massage, so queue fairness is unchanged
   by the act of editing. *(machine)*
4. After an edit, the day's **income total is the edited amount** — 798, not 399 and not zero.
   *(machine)*
5. **Today's summary and the date-range report agree** on an edited transaction. *(machine)*
6. The transaction list still shows the **audit trail** of what was edited. *(machine)*
7. Her **payday balance** reflects the edited amount exactly once. *(machine)*

### Chain Pointers
- **Planning map:** none — decided in one session.
- **Steps file:** not yet decomposed.
- **Co-located docs:** `backend/routes/transactions.js.md`, `backend/routes/staff.js.md`,
  `web-app/transaction.html.md`, `web-app/transaction.ejs.md`.

### Requirement Sources
- Operator report, 2026-08-18, with the observed three-row transaction list.
- Source reading this session, cited below. Every claim here was read, not grepped.

---

## 2. Scope Definition

### In Scope
- The status an edit writes to the replacement transaction row.
- Every busy, workload, queue and money query that reads that status.
- Reconciling today's summary with the date-range report.

### Out of Scope
- The intake refresh and overnight staleness defects — see `daily-state-freshness.md`.
- The correction and void flows themselves, beyond the status they write.
- Any change to how add-ons work.

### Non-Goals
- Not a redesign of the edit workflow. Editing keeps working the way reception already knows.
- Not a change to the audit trail. Superseded rows are still kept.

---

## 3. Existing System Impact Analysis

### Root cause, confirmed

An edit does **not** update the transaction in place. It relabels the original and inserts a new row:

- The original becomes `EDITED (Corrected by <new id>)` — `backend/routes/transactions.js:693-696`.
- The replacement is inserted with status `CORRECTED` —
  `backend/routes/transactions.js:713`: `originalTransactionId ? 'CORRECTED' : 'ACTIVE'`.

**After an edit, neither row is `ACTIVE`.** Everything that reads only `ACTIVE` rows therefore
behaves as if the massage does not exist:

| Reader | Query site | Consequence of the edit |
|---|---|---|
| Busy derivation | `backend/routes/staff.js:201` (`WHERE business_day = ? AND status = 'ACTIVE'`) | No active massage found, so `busyUntilIso` is null (`staff.js:246-248`) and `currentState` falls to `available` (`staff.js:259`) — **she reads as free mid-massage** |
| Workload count | `backend/routes/staff.js:41` (`AND t.status = 'ACTIVE'`) | Her count drops to zero, which sorts her to the **front** of walk-in priority (`staff.js:294-300`) |
| Today's income | `backend/routes/reports.js:24`, `:45`, `:63`, `:204`, `:215` (`status = 'ACTIVE'`) | **The edited transaction's money disappears from the daily summary** |
| Date-range report | `backend/routes/reports.js:108`, `:147`, `:168`, `:239` (`status IN ('ACTIVE','CORRECTED')`) | The same transaction **is** counted here — so the two reports disagree |

The client-side pick of "next in line" then selects her because she is both available and
lowest-workload — `web-app/transaction.html:423-426`.

**A second, unrelated dead path.** Reception still calls a set-busy endpoint after every submit
(`web-app/transaction.html:1473`), which writes `staff_roster.status` and `busy_until`
(`backend/routes/staff.js:660-664`). Nothing reads it: the roster query hardcodes
`NULL AS busy_until` (`backend/routes/staff.js:35`). This vestigial imperative busy-state system is
why the symptom is invisible to the obvious fix.

### The three-row display, explained

The recent list shows rows with status `ACTIVE`, `CORRECTED`, or beginning `EDITED`
(`backend/routes/transactions.js:152`), and the edited badge renders only for rows whose status
begins `EDITED` (`web-app/transaction.html:1730`). Because an edit never removes the superseded row
and always inserts one, **each edit adds a row**. The reported set — 399 unbadged, 798 badged, 399
badged — is what **two** successive edits produce, not one.

### Components Explicitly Unaffected
- The fee reversal and re-accrual on edit (`transactions.js:683-686`, `:720-726`), which is already
  correct.
- Add-on behaviour and the counts-as-a-massage predicate.
- Booking credits.

### Regression Risks

| Cause | Impact | Mitigation |
|---|---|---|
| Making the replacement row `ACTIVE` while a query elsewhere assumes `CORRECTED` | A lookup silently returns nothing | One known site depends on it — `transactions.js:799` selects `WHERE corrected_from_id = ? AND status = "CORRECTED"`. It must be changed to key on the link, not the status. Verified by search; any further site must be found before implementation |
| Date-range reports double-counting | Money overstated | The superseded row keeps its `EDITED` status and is excluded from both report families, exactly as today |
| The unique booking index | An edit could violate it | `idx_transactions_one_active_booking` covers `status IN ('ACTIVE','CORRECTED')` (`database.js:359`); with the original relabelled `EDITED`, only one row remains in the index, so the constraint still holds |

---

## 4. Integration Architecture

### Upstream
- `POST /transactions` — the writer of the status under change.

### Downstream
- `GET /staff/current-status`, `GET /staff/roster` — busy and workload.
- `GET /reports/summary/today`, `GET /transactions/summary/today` — the day's money.
- `GET /reports/*` date-range endpoints.
- `web-app/transaction.html` and `web-app/transaction.ejs` — the next-in-line pick and the list.

### Contracts
- The transaction `status` vocabulary: `ACTIVE`, `CORRECTED`, `EDITED (Corrected by …)`,
  `CANCELLED`. This spec changes which value an edit writes, not the vocabulary.

---

## 5. Functional Requirements

### ETSC-001: The live row after an edit is `ACTIVE`

**Description.** The replacement row an edit inserts must carry status `ACTIVE`, because it *is* the
live transaction. The superseded row keeps `EDITED (Corrected by …)`.

**Rationale for choosing this over the alternative.** The other repair is to widen roughly fifteen
query sites to accept `CORRECTED`. That is rejected: it is more code, it must be repeated in every
future query, and the project already learned this lesson — `backend/services/add-on-sql.js:1-12`
exists specifically so that "the ~20 aggregation sites cannot drift apart." Making the data correct
at the single point of writing is strictly smaller and cannot drift.

**Trigger.** Any edit of an existing transaction.

**Processing logic.** At `backend/routes/transactions.js:713`, write `'ACTIVE'` for both the edit and
the non-edit case. The `corrected_from_id` column continues to record that this row replaced another
— that link, not the status, is what marks a row as a replacement.

**Outputs.** Busy, workload, queue, today's income and the date-range report all see the edited
transaction, with no change to any of those queries.

**Failure modes.** None new. The write path is otherwise unchanged.

**Edge cases.** An edit of an edit produces a chain of `corrected_from_id` links; each superseded row
is `EDITED`, and exactly one row in the chain is `ACTIVE`.

### ETSC-002: Replacement lookups key on the link, not the status

**Description.** Any query that finds a replacement row by `status = 'CORRECTED'` must instead use
`corrected_from_id`.

**Processing logic.** `backend/routes/transactions.js:799` currently reads
`WHERE corrected_from_id = ? AND status = "CORRECTED"`. Drop the status condition; the link alone
identifies the replacement. Before implementation, search the whole backend for any other reader of
the `CORRECTED` status and convert it the same way.

**Outputs.** Void and reversal flows keep working after ETSC-001 changes the status.

### ETSC-003: Exactly one live row per edit chain

**Description.** After any number of edits, exactly one row in the chain is `ACTIVE`.

**Processing logic.** The relabel of the original to `EDITED (Corrected by …)`
(`transactions.js:693-696`) and the insert of the replacement must happen in one database
transaction, so a crash cannot leave two live rows or none.

**Failure modes.** Partial write is forbidden; on failure nothing changes.

### ETSC-004: Busy window follows the edited duration

**Description.** After an edit that changes duration, the masseuse's busy window must derive from the
edited massage.

**Processing logic.** No new code. Once ETSC-001 makes the live row `ACTIVE`, the existing derivation
at `backend/routes/staff.js:209` — end is `end_datetime`, else timestamp plus duration — reads the
edited values automatically. This requirement exists so the behaviour is **tested**, since it is the
operator's actual reported symptom.

### ETSC-005: Remove the dead set-busy path

**Description.** Reception's post-submit set-busy call writes a record nothing reads. Remove the
call and the endpoint's role in intake, so there is one source of truth for busy state.

**Processing logic.** Delete the `setMasseuseBusy` call at `web-app/transaction.html:1473` and its
mirror in `web-app/transaction.ejs`. Busy state derives from transactions only.

**Edge cases.** The expired-status reset job (`backend/routes/staff.js:309-396`) operates on the same
legacy columns. Confirm nothing else depends on it before removing; if anything does, this
requirement narrows to the intake call only and the endpoint stays.

**Risk note.** This is the one requirement here that is cleanup rather than repair. If it proves to
have any live consumer, drop it from this epic rather than expanding the epic.

---

## 6. Data Model Changes

**None.** No schema change, no migration. The `status` column already holds every value needed;
this epic changes which value gets written.

**Historic rows are not rewritten.** Transactions already edited before this fix keep status
`CORRECTED` and stay missing from past daily summaries. Backfilling them would rewrite finished
books and is deliberately excluded — see Open Questions.

---

## 7. State Transitions

### States
`ACTIVE` — the live transaction · `EDITED (Corrected by <id>)` — superseded, kept for audit ·
`CANCELLED` — voided · `CORRECTED` — **retired for new writes** by ETSC-001, still readable on
historic rows.

### Valid transitions
`ACTIVE` → `EDITED (Corrected by <id>)` when replaced by an edit.
`ACTIVE` → `CANCELLED` when voided.

### Invalid states
Two `ACTIVE` rows in one edit chain. No `ACTIVE` row in an edit chain that has not been voided.

### Recovery
Both are prevented by the single-transaction write in ETSC-003 rather than repaired afterwards.

---

## 8. Operational Considerations

- **Logging:** the edit path already logs each step; keep the log lines and add the resulting status.
- **Monitoring:** a query for edit chains with a count of live rows other than one is a cheap
  integrity check worth running once after deploy.
- **Security:** unchanged. No new endpoint, no new input.
- **Performance:** unchanged. Existing index
  `idx_transactions_business_day_staff (business_day, masseuse_name, status)` already serves these
  reads (`database.js:349`).

---

## 9. Rollout Plan

- **Deployment:** standard numbered-branch publish and branch-server deploy.
- **Migration:** none.
- **Backward compatibility:** historic `CORRECTED` rows still read correctly everywhere that already
  accepts them; the date-range reports are unchanged.
- **Rollback:** revert the application code. No data is rewritten, so rollback is clean.
- **Live verification:** on the branch server, edit a real transaction's duration and confirm the
  masseuse stays busy and off the next-in-line slot, and that the day's income shows the edited
  amount.

---

## 10. Testing Requirements

- **Unit:** the edit path writes `ACTIVE` to the replacement and `EDITED (…)` to the original.
- **Integration:** after editing 1 hour to 2 hours, the busy window ends 2 hours after the start.
- **Integration:** after that edit, the masseuse is not returned as next in line while busy.
- **Integration:** after that edit, her workload count includes the massage.
- **Integration:** after that edit, today's income equals the edited amount.
- **Integration:** today's summary and the date-range report return the same figure for the day.
- **Integration:** the payday balance equals the edited fee exactly once.
- **Failure:** a forced failure mid-edit leaves the original `ACTIVE` and no replacement row.
- **Regression:** the transaction list still shows superseded rows with their edited badge.
- **Regression:** voiding an edited transaction still finds its replacement (ETSC-002).
- **Contract:** `transaction.html` and `transaction.ejs` stay in parity.

---

## 11. Risks and Assumptions

### Assumptions
- **Documented** — the edit path relabels and inserts rather than updating in place
  (`transactions.js:693-717`), read this session.
- **Documented** — busy and workload read only `ACTIVE` rows (`staff.js:41`, `:201`), read this
  session.
- **Documented** — today's summary reads only `ACTIVE` while date-range reads `ACTIVE` and
  `CORRECTED` (`reports.js:24` versus `:108`), read this session.
- **Inferred** — the operator's three rows come from two successive edits, not one. Consistent with
  the mechanism but not confirmed against the live database.

### Risks

| Cause | Impact | Mitigation |
|---|---|---|
| An unfound reader of the `CORRECTED` status | A flow silently breaks after the change | ETSC-002 requires a full backend search before implementation, not a spot fix |
| Past edited transactions stay missing from their daily summaries | Historic daily figures remain understated | Deliberately not backfilled; flagged to the operator as a decision, see below |

### Open Questions

**OQ-1 — Should past edited transactions be corrected in the historic record?** This spec does not
rewrite them, so any past day containing an edit keeps an understated daily summary while its
monthly report is right. Correcting them is a data change to finished books and is the operator's
call, not a developer's. **Blocks nothing in this epic** — it is a separate, later decision.

---

## 12. Acceptance Criteria

- **AC-001** *(criterion 1)* — After editing a 1-hour massage to 2 hours, the masseuse's status is
  busy and her busy window ends 2 hours after the start.
- **AC-002** *(criterion 2)* — While that edited massage runs, next-in-line does not return her.
- **AC-003** *(criterion 3)* — Her workload count after the edit equals her count before it.
- **AC-004** *(criterion 4)* — Today's income after editing 399 to 798 includes 798 and does not
  include 399.
- **AC-005** *(criterion 5)* — Today's summary and the date-range report return the same total for a
  day containing an edited transaction.
- **AC-006** *(criterion 6)* — The superseded row is still listed and still carries its edited badge.
- **AC-007** *(criterion 7)* — `staff.total_fees_earned` after the edit equals the edited fee, with
  the original reversed exactly once.
- **AC-008** *(guardrail)* — Exactly one row per edit chain is live, including after two successive
  edits.
- **AC-009** *(guardrail)* — Voiding an edited transaction still resolves its replacement.

### Goal coverage check
- **Every ratified criterion has a requirement behind it:** 1→ETSC-004, 2→ETSC-001, 3→ETSC-001,
  4→ETSC-001, 5→ETSC-001, 6→unchanged display behaviour pinned by AC-006, 7→existing fee logic
  pinned by AC-007. Clean.
- **Every requirement serves a criterion:** ETSC-001→2/3/4/5, ETSC-002→guardrail AC-009,
  ETSC-003→guardrail AC-008, ETSC-004→1, **ETSC-005→no criterion.** Named rather than hidden:
  removing the dead set-busy path is cleanup the goal did not ask for. It is kept because it removes
  the second, contradictory source of busy state that made this defect hard to see — but it is the
  first thing to cut if the epic needs narrowing, and its own risk note says so.
