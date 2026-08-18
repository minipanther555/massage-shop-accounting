# Daily State Freshness — Execution Steps

## Goal
What reception sees on screen matches what the database says — after a submit, after the day rolls
over, and after the tablet has been idle — with no manual page reload. Refresh logic already exists;
it is incomplete, it fails silently, it cannot survive an idle tab, and it disagrees with the server
about which day it is. Spec: `00-project-docs/feature-specifications/daily-state-freshness.md`.
Planning map: none.

> **Status:** OPEN — no steps started. Ship AFTER `edited-transaction-state-correctness-steps.md`;
> both write the reception intake page and the transactions route.

> **Epic complete when:** Phase 4's gate is met — the verification journeys pass and the operator has
> confirmed on the reception device that a tab left open overnight recovers on wake.

## Scope (this lane)
- **Owns:** which day the client asks for, the coverage of the periodic refresh, refreshing on
  visibility, re-hydrating the service and payment catalog, detecting day rollover, and surfacing
  refresh failures.
- **Does NOT own:** the edited-transaction defect — that belongs to
  `edited-transaction-state-correctness-steps.md`. Tips and miscellaneous income belong to
  `tips-and-miscellaneous-income-steps.md`. This lane does not change the business-day definition
  itself, and does not add a live push channel between devices.

## ⚠️ Cross-epic file collisions — READ BEFORE RUNNING IN PARALLEL
Three epics are in flight. Two files are **written by all three**:
- `web-app/transaction.html` and its `.ejs` mirror — this lane writes it at `DSF-DAY-001`,
  `DSF-REFRESH-001`, `-002`, `-003`, `-004` and `DSF-ERR-001`. **This lane writes it most.**
- `backend/routes/transactions.js` — this lane writes it at `DSF-DAY-002`.

`edited-transaction-state-correctness-steps.md` and `tips-and-miscellaneous-income-steps.md` write
both files too. **Running this epic concurrently with either will conflict on merge**, and this lane
touches the intake page in the most places, so it is the worst one to run in parallel. Land the
edited-transaction epic first, rebase this onto it, then run it.

This lane rewrites `backend/routes/reports.js` at `DSF-DAY-002`. The edited-transaction epic depends
on the *behaviour* of those same queries but does not edit that file, so the two changes are
compatible in either order — the hazard is textual overlap only if both are in flight.

## Dependencies
- **Post-submit refresh chain (live, keep working):** `web-app/transaction.html:1468-1478` re-fetches
  the day's transactions, the roster, the live status and the summary, and rebuilds the masseuse
  dropdown at `:1515`.
- **Periodic poll (live, keep working):** `web-app/transaction.html:355-359`, every 30 seconds.
- **Business day (live, do not change):** Bangkok with a 2am reset — `backend/utils/business-day.js`.
- Invariant: a refresh never clears, resets or overwrites a partly-filled form.
- Invariant: date-range reports keep using the existing date column; only today's queries move.

---

## Verified source status (read the code, 2026-08-18 CFEP)
- **Two day definitions exist on every transaction row.** `date` is the UTC calendar date —
  `backend/routes/transactions.js:647` (`timestampIso.split('T')[0]`). `business_day` is the Bangkok
  day with a 2am reset — `backend/routes/transactions.js:648`, `backend/utils/business-day.js`.
  Bangkok is seven hours ahead of UTC, so **the two disagree between 2am and 7am Bangkok.**
- The client asks for the day's transactions and expenses using the **UTC** date —
  `web-app/shared.js:118`. It filters the displayed list the same way —
  `web-app/transaction.html:1675`.
- Today's summary queries the **UTC** `date` column — `backend/routes/reports.js:24`, `:45`, `:204`,
  `:215` — while the roster and live status query the **Bangkok** `business_day` —
  `backend/routes/staff.js:399-462`.
- The live status endpoint already returns a `business_day` field —
  `backend/routes/staff.js:452-457`. **No new endpoint is needed to learn the server's day.**
- The 30-second poll calls the display update and the roster refresh but **not** the day's data load
  — `web-app/transaction.html:355-359`. The list is only re-filtered in memory —
  `web-app/transaction.html:1662-1676`.
- 🔴 **Refresh failures are swallowed.** The roster refresh catches its error and writes to the
  console only — `web-app/transaction.html:1516-1518`. Same for the queue advance (`:1487-1489`) and
  the set-busy call (`:1497-1499`). The success message is shown regardless (`:1478`), so a failed
  refresh is indistinguishable on screen from a successful one.
- No visibility, focus, websocket or server-sent-events handler exists anywhere in
  `web-app/transaction.html`, `web-app/shared.js`, `web-app/api.js` or `web-app/roster-ui.js`.
- The service, payment-method and masseuse catalog is loaded once at page load into `CONFIG.settings`
  — `web-app/shared.js:215-259` — and no code path re-hydrates it.

---

## Phase 1 — One idea of which day it is — OPEN
**Phase goal:** the client and the server agree on the current day, at every hour, and today's money
is scoped the same way as the roster.

### STEP_ID: DSF-DAY-001 — the client uses the server's business day — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- **Touches:** `web-app/shared.js`, `web-app/transaction.html`, `web-app/transaction.ejs`,
  `__tests__/`
- **Why this is first (shared contract):** every later step in this lane reads "which day is it".
  Fixing that once, here, stops each of them inventing its own answer.
- [ ] The client holds the business day reported by the live status endpoint and uses it for the
      day's transaction and expense fetches and for the displayed list's filter, instead of computing
      a date from its own clock.
- [ ] A failed live status call leaves the last known business day in place rather than falling back
      to a locally computed one.
- **Validation:** with the client clock set to 03:00 Bangkok, the day's data request carries the same
  business day the roster endpoint reports — satisfies AC-006 in part. Must be observed failing on
  the pre-change build, where the two differ by one day at that hour.
- **Risk notes:** shared contract for this lane. Later steps in Phase 2 depend on it.
- **Completion Notes:**

### STEP_ID: DSF-DAY-002 — today's money is scoped by the business day — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-DAY-001
- **Touches:** `backend/routes/reports.js`, `backend/routes/transactions.js`, `__tests__/`
- [ ] Today's summary and today's payment-method breakdown are scoped by the business day, matching
      the roster, rather than by the UTC calendar date.
- [ ] Date-range reports are left on their existing date basis.
- **Validation:** at 03:00 Bangkok, today's summary and the roster report the same day, and a
  transaction recorded at that hour appears in both — satisfies AC-006. Observed failing beforehand.
- **Risk notes:** this changes reported daily figures for transactions recorded between 2am and 7am
  Bangkok. That is the intended correction, not a regression — call it out at deploy. Both columns
  already exist on every row, so there is no migration and no backfill.
- **Completion Notes:**

**Phase 1 complete when:**
- [ ] DSF-DAY-001 and DSF-DAY-002 are `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] A test asserting summary-and-roster day agreement at 03:00 Bangkok exists and passes

**This gate authorizes Phase 2.**

---

## Phase 2 — Refresh that actually covers the screen — OPEN
**Phase goal:** every source of on-screen staleness has a trigger that clears it.

### STEP_ID: DSF-REFRESH-001 — the periodic refresh includes the day's transactions — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-DAY-001
- **Touches:** `web-app/transaction.html`, `web-app/transaction.ejs`, `__tests__/`
- [ ] The periodic refresh re-fetches the day's transactions rather than only re-filtering the copy
      already in memory.
- **Validation:** after a simulated day change, the periodic refresh loads the new day's transactions
  instead of emptying the list — satisfies AC-004 in part. Observed failing beforehand, where the
  list empties.
- **Completion Notes:**

### STEP_ID: DSF-REFRESH-002 — returning to the page refreshes it — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-REFRESH-001
- **Touches:** `web-app/transaction.html`, `web-app/transaction.ejs`, `__tests__/`
- [ ] The page becoming visible again, or the window regaining focus, triggers the same refresh the
      periodic one performs.
- [ ] Rapid repeated focus changes cause at most one refresh in a short window.
- [ ] The refresh updates data only and never touches form state.
- **Validation:** a simulated visibility change triggers one refresh; two rapid changes still trigger
  only one; and a refresh during data entry leaves every form field untouched — satisfies AC-005 in
  part and AC-007. Observed failing beforehand, where no handler exists at all.
- **Risk notes:** AC-007 is the regression that matters most here — reception may be mid-entry when
  the tablet is picked up.
- **Completion Notes:**

### STEP_ID: DSF-REFRESH-003 — the service and payment catalog re-hydrates — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-REFRESH-002
- **Touches:** `web-app/shared.js`, `web-app/transaction.html`, `web-app/transaction.ejs`,
  `__tests__/`
- [ ] The services, payment methods and masseuse list re-load on the visibility refresh and on day
      rollover, so a service the manager adds appears without a page reload.
- [ ] The catalog does not re-load on every periodic refresh.
- [ ] Rebuilding the dropdowns preserves whatever the user has already selected; a selection whose
      service the manager has since removed is kept and left for existing validation to reject on
      submit.
- **Validation:** a service added through the manager pages appears on intake after a visibility
  refresh with no page reload, and a pre-existing selection survives the rebuild — satisfies AC-003.
  Observed failing beforehand.
- **Completion Notes:**

### STEP_ID: DSF-REFRESH-004 — day rollover is detected and acted on — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-REFRESH-003
- **Touches:** `web-app/transaction.html`, `web-app/transaction.ejs`, `web-app/shared.js`,
  `__tests__/`
- [ ] On each periodic refresh and each visibility refresh, the server's business day is compared
      with the one the client holds, and a change triggers a full reload of the roster, live status,
      transactions, expenses, summary and catalog.
- **Validation:** a simulated business-day change causes the roster and transaction list to reload
  for the new day — satisfies AC-004. Observed failing beforehand.
- **Completion Notes:**

**Phase 2 complete when:**
- [ ] DSF-REFRESH-001 through DSF-REFRESH-004 are all `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] `web-app/transaction.html` and `web-app/transaction.ejs` remain in parity under the existing
      contract test

**This gate authorizes Phase 3.**

---

## Phase 3 — Never claim success on a stale screen — OPEN
**Phase goal:** a stale screen always carries a visible reason.

### STEP_ID: DSF-ERR-001 — refresh failures are surfaced, not swallowed — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-REFRESH-004
- **Touches:** `web-app/transaction.html`, `web-app/transaction.ejs`, `__tests__/`
- [ ] A refresh failure after a successful submit produces a visible warning that states the customer
      **was** recorded and the screen may be out of date, with an action to retry.
- [ ] Refresh failures in the periodic and visibility paths are surfaced rather than written only to
      the console.
- **Validation:** with the roster refresh forced to fail after a successful submit, a warning appears
  stating the customer was saved — satisfies AC-002. Observed failing beforehand, where a success
  message appears instead.
- **Risk notes:** the wording must make clear the customer was recorded, so reception does not enter
  them a second time. This is the case that turns a display bug into a double-booking.
- **Completion Notes:**

**Phase 3 complete when:**
- [ ] DSF-ERR-001 is `✅ DONE`
- [ ] `npx jest` passes with no failures

**This gate authorizes Phase 4.**

---

## Phase 4 — Verification & Hardening — OPEN
**Phase goal:** the lane's steps work together, and the overnight symptom is confirmed gone on the
actual reception device.

### STEP_ID: DSF-VERIFY-001 — end-to-end journeys through real boundaries — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-ERR-001
- **Touches:** `__tests__/`
- [ ] Journey — submit a customer and confirm the queue, roster and transaction list on screen match
      the database with no manual reload (AC-001).
- [ ] Journey — add a service through the manager surface and confirm it reaches intake after a
      visibility refresh (AC-003).
- [ ] Journey — cross a simulated day boundary and confirm the roster and list reload for the new day
      (AC-004).
- [ ] Journey — force a refresh failure after a successful submit and confirm the warning names the
      customer as saved (AC-002).
- [ ] Journey — refresh during data entry and confirm no form field changes (AC-007).
- [ ] At least one journey has been observed failing against the pre-change build.
- **Validation:** all five journeys pass through the real handler and database, no mocks. Waits are
  bounded polling against a real condition with an explicit timeout, never a fixed sleep.
- **Completion Notes:**

### STEP_ID: DSF-DEPLOY-001 — deploy, operator live-verify, and the overnight check — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** DSF-VERIFY-001
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
- [ ] **Live-verify — look, don't touch:** the operator submits one real customer and confirms the
      queue advances on screen without a reload, and adds a service in the manager pages and confirms
      it appears on intake without a reload.
- [ ] **Overnight check (required — this is the reported symptom):** the operator leaves the
      reception tablet on the intake page overnight and confirms the next morning that it shows the
      new day's roster on wake, without a manual reload. Suspension of background timers is device
      behaviour that cannot be proven from code, so it must be observed.
- **Validation:** the operator confirms the submit refresh, the catalog refresh and the overnight
  recovery on the live branch server, each recorded verbatim in the Completion Notes — satisfies
  AC-001, AC-003 and AC-005.
- **Risk notes:** if the overnight symptom persists after these fixes, the dominant cause was
  something other than the confirmed code defects. **Do not close the epic** — record the observation
  in Discoveries and reopen diagnosis. The overnight check is the only step here that cannot be run
  the same day the code lands.
- **Completion Notes:**

**Phase 4 complete when:**
- [ ] DSF-VERIFY-001 and DSF-DEPLOY-001 are `✅ DONE`
- [ ] `npx jest` passes with no failures
- [ ] **The operator has live-verified the submit refresh and the catalog refresh** — deliberate
      human handover
- [ ] **The operator has confirmed overnight recovery on the reception device** — deliberate human
      handover, and it takes a real overnight to satisfy
- [ ] `LIVE = <branch>@<sha>` is recorded in DSF-DEPLOY-001's Completion Notes

**This gate ends the epic.**

---

## Open Decisions
- **D-01 (ratified):** the existing refresh mechanisms are repaired rather than replaced. Adding a
  new refresh on top would leave all five confirmed defects in place.
- **D-02 (ratified):** no live push channel between devices. Polling plus a visibility refresh is
  enough for one reception tablet.
- **D-03 (ratified):** the business-day definition itself is unchanged; only which day the client and
  today's money queries ask for.
- **D-04 (ratified):** moving today's summary onto the business day changes reported figures for the
  2am-to-7am window. That is the intended correction.

## Open Questions
- **Q-01 — blocks: none** — whether suspended background timers on the reception device are the
  dominant cause of the overnight symptom. It cannot be settled from code and does not block any step
  being built; `DSF-DEPLOY-001` is where it gets observed.

## Discoveries

## Coverage
- **DSF-001 (client uses the server's day) → DSF-DAY-001**
- **DSF-002 (today's money on the business day) → DSF-DAY-002**
- **DSF-003 (poll refreshes the list) → DSF-REFRESH-001**
- **DSF-004 (refresh on visibility) → DSF-REFRESH-002**
- **DSF-005 (catalog re-hydrates) → DSF-REFRESH-003**
- **DSF-006 (rollover detected) → DSF-REFRESH-004, DSF-DEPLOY-001**
- **DSF-007 (failures surfaced) → DSF-ERR-001**
- **AC-001 → DSF-VERIFY-001, DSF-DEPLOY-001** · **AC-002 → DSF-ERR-001, DSF-VERIFY-001** ·
  **AC-003 → DSF-REFRESH-003, DSF-VERIFY-001, DSF-DEPLOY-001** · **AC-004 → DSF-REFRESH-001,
  DSF-REFRESH-004, DSF-VERIFY-001** · **AC-005 → DSF-REFRESH-002, DSF-DEPLOY-001** ·
  **AC-006 → DSF-DAY-001, DSF-DAY-002** · **AC-007 → DSF-REFRESH-002, DSF-VERIFY-001** ·
  **AC-008 → the parity condition in the Phase 2 and Phase 4 gates**
- **UNCOVERED:** none.
