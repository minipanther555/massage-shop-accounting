# Daily State Freshness — Feature Specification

**Status:** Ready for `/steps-file-creation`
**Authored:** 2026-08-18
**Prefix:** `DSF-xxx`
**Class:** Defect repair. Causes confirmed by source reading; one contributing mechanism is
device behaviour that must be reproduced during implementation (see DSF-006).

## 1. Executive Summary

### Feature Name
Daily State Freshness

### Goal

**What reception sees on screen must be what the database actually says — after a submit, after the
day rolls over, and after the tablet has been sitting idle — without anyone having to reload the
page by hand.**

### Operator-reported symptoms (2026-08-18)

1. After submitting a customer, the screen keeps showing the state from before the submit. The queue,
   the dropdowns and who is working only update after a manual refresh.
2. Overnight, yesterday's roster keeps appearing on the next day, as though nothing refreshed.

### Correction to the initial framing

The request was to *add* refresh logic. Refresh logic already exists: a post-submit refresh chain
(`web-app/transaction.html:1468-1478`) and a 30-second poll
(`web-app/transaction.html:355-359`). The defects are that the existing refresh is **incomplete**,
**silently fails**, **cannot survive an idle tab**, and **disagrees with the server about which day
it is**. Adding a new refresh mechanism on top would leave all four in place.

### Success Criteria

1. After a submit, the queue, the roster and the day's transaction list on screen match the database
   without a manual reload. *(machine)*
2. If any part of the post-submit refresh fails, reception is **told**, rather than seeing a success
   message. *(machine)*
3. A service or payment method added by the manager appears on the intake page without a manual
   reload. *(machine)*
4. When the business day rolls over, the page shows the new day's roster and transactions without a
   manual reload. *(machine)*
5. Bringing an idle tablet back to the page shows current data, not the data from when it was last
   touched. *(machine, plus one on-device confirmation)*
6. The day's summary and the roster agree about which day it is, at every hour. *(machine)*

### Chain Pointers
- **Planning map:** none — decided in one session.
- **Steps file:** not yet decomposed.
- **Co-located docs:** `web-app/transaction.html.md`, `web-app/transaction.ejs.md`,
  `web-app/shared.js.md`, `web-app/api.js.md`, `backend/routes/reports.js.md`.

### Requirement Sources
- Operator report, 2026-08-18.
- Source reading this session, cited below.

---

## 2. Scope Definition

### In Scope
- The completeness and failure reporting of the post-submit refresh.
- The 30-second poll's coverage.
- Refreshing when the page becomes visible again after being idle or backgrounded.
- Detecting a business-day rollover on the client.
- Reconciling the client's idea of "today" with the server's business day.
- Re-hydrating the service and payment catalog without a page reload.

### Out of Scope
- The edited-transaction defect — see `edited-transaction-state-correctness.md`.
- Live push updates between devices (websockets or server-sent events). Polling plus a
  visibility-triggered refresh is sufficient for a single reception tablet, and a push channel is a
  much larger change.
- Any change to how the business day itself is defined. The 2am Bangkok reset stays as it is.

### Non-Goals
- Not a rewrite of the page's state handling.
- Not an offline mode.

---

## 3. Existing System Impact Analysis

### What already works, and must not be broken

The post-submit chain does re-fetch the roster, the live shop status, the day's transactions and the
summary — `web-app/transaction.html:1468-1478`, calling `loadTodayData()` then
`refreshRosterForDropdown()` then `updateAllDisplays()`. The masseuse dropdown is rebuilt from the
fresh roster (`transaction.html:1515`). A 30-second poll refreshes the roster and displays
(`transaction.html:355-359`). Any repair must keep these.

### Confirmed defects

**D1 — Refresh failures are swallowed.** `refreshRosterForDropdown()` catches its error and writes to
the console only (`web-app/transaction.html:1516-1518`). The same pattern applies to the queue
advance (`:1487-1489`) and the set-busy call (`:1497-1499`). The success message is shown regardless
(`:1478`). **A refresh that failed is indistinguishable on screen from one that worked** — which
matches the reported symptom exactly, because the screen keeps the pre-submit state while reception
is told the submit succeeded.

**D2 — The poll does not refresh the transaction list.** The 30-second poll calls
`updateAllDisplays()` and `refreshRosterForDropdown()` (`transaction.html:355-359`); it does not call
`loadTodayData()`. The recent-transactions display re-filters the array already in memory against a
freshly computed today (`transaction.html:1662-1676`). So across a day boundary it *drops* yesterday's
rows without ever loading today's.

**D3 — Nothing refreshes when the page becomes visible again.** There is no `visibilitychange`
handler, no window focus handler, and no websocket or server-sent-events channel anywhere in
`transaction.html`, `shared.js`, `api.js` or `roster-ui.js`. Browsers throttle or suspend timers in a
backgrounded or sleeping tab, so the 30-second poll cannot be relied on overnight, and there is
nothing else to catch up when the tablet is picked up again.

**D4 — The client and the server disagree about which day it is.** Every transaction row stores two
different dates: `date` is the UTC calendar date (`backend/routes/transactions.js:647`,
`timestampIso.split('T')[0]`), while `business_day` is the Bangkok day with a 2am reset
(`backend/routes/transactions.js:648`, `backend/utils/business-day.js`). The client asks for
transactions and expenses using the **UTC** date (`web-app/shared.js:118`). Today's summary also
queries the UTC `date` column (`backend/routes/reports.js:24`, `:45`, `:204`, `:215`), while the
roster and live status query the Bangkok `business_day` (`backend/routes/staff.js:399-462`). Bangkok
is seven hours ahead of UTC, so **between 2am and 7am Bangkok the summary and the roster are looking
at different days.**

**D5 — The service and payment catalog is loaded once and never refreshed.** `loadData()` populates
the services, payment methods and masseuse list into `CONFIG.settings` at page load
(`web-app/shared.js:215-259`). No code path re-hydrates it. The dropdowns are only re-derived from
that cached copy when the location or service selection changes
(`web-app/transaction.html:1130`). A service the manager adds is therefore invisible until someone
reloads the page — which matches the "dropdowns need a manual refresh" part of the report.

### Components Explicitly Unaffected
- The server's business-day definition and the 2am reset.
- The roster provisioning flow.
- Any backend write path.

### Regression Risks

| Cause | Impact | Mitigation |
|---|---|---|
| A visibility-triggered refresh firing on every small focus change | Needless load, or a form being cleared under the user | Refresh data only; never touch form state. Debounce so it fires at most once per short interval |
| Switching the summary from the UTC date to the Bangkok business day | Reported daily figures shift for transactions recorded between 2am and 7am | Intended: it makes the summary agree with the roster. Call it out at deploy; the shop opens at 10am so live impact is small |
| Surfacing refresh errors | Reception sees warnings they cannot act on | The message must say what to do — retry, or reload — not just that something failed |

---

## 4. Integration Architecture

### Upstream
- `GET /staff/roster`, `GET /staff/current-status` — Bangkok business day.
- `GET /transactions/recent`, `GET /expenses` — currently keyed on the UTC date.
- `GET /reports/summary/today`, `GET /expenses/summary/today`.
- `GET /services`, `GET /services/payment-methods` — the catalog.

### Downstream
- `web-app/transaction.html` and its byte-identical `.ejs` mirror.
- `web-app/shared.js` — `loadData`, `loadTodayData`, `loadCurrentShopStatus`.

### Contracts
- The server already exposes the business day: `GET /staff/current-status` returns a `business_day`
  field (`backend/routes/staff.js:452-457`). **The client should treat that as the authority for
  which day it is**, rather than computing its own — this is the cheapest fix for D4 and needs no new
  endpoint.

---

## 5. Functional Requirements

### DSF-001: The server's business day is the only day the client uses

**Description.** The client must stop computing "today" from its own clock in UTC and use the
business day the server reports.

**Trigger.** Any fetch of day-scoped data.

**Processing logic.** Take the `business_day` value already returned by the live status endpoint
(`backend/routes/staff.js:452-457`) and hold it as the current day. Use it for the transaction and
expense fetches in `loadTodayData()` (`web-app/shared.js:118`) and for the client-side filter in
`updateRecentTransactions()` (`web-app/transaction.html:1675`).

**Outputs.** The list, the summary and the roster all describe the same day at every hour.

**Edge cases.** If the live status call fails, keep the last known business day rather than falling
back to a locally computed one; a wrong day is worse than a stale one.

### DSF-002: Today's money queries use the business day

**Description.** The daily summary must be scoped by the same day as the roster.

**Processing logic.** Change today's summary queries from the UTC `date` column to `business_day` —
`backend/routes/reports.js:24`, `:45`, `:63`, `:204`, `:215`, and the equivalent in
`backend/routes/transactions.js:925-950`. Both columns are already written on every row
(`transactions.js:647-648`), so no migration and no backfill is needed.

**Outputs.** Today's summary and the roster agree at every hour, including between 2am and 7am.

**Edge cases.** Date-range reports are out of scope here and keep using `date`; they are not
affected by the rollover symptom.

### DSF-003: The poll refreshes the transaction list too

**Description.** The periodic refresh must include the day's transactions.

**Processing logic.** Add `loadTodayData()` to the 30-second poll at
`web-app/transaction.html:355-359`, so the list is re-fetched rather than only re-filtered.

**Outputs.** The list stays correct across a rollover, instead of emptying.

### DSF-004: Refresh when the page becomes visible again

**Description.** Returning to the page after it was hidden, backgrounded or idle must trigger a full
refresh of day-scoped data.

**Trigger.** The document becoming visible, or the window regaining focus.

**Processing logic.** Add a `visibilitychange` handler and a window focus handler that re-run the
same refresh the poll performs, plus the catalog re-hydration of DSF-005. Debounce so rapid focus
changes cause at most one refresh in a short window. **Refresh data only — never reset or clear the
form**, because reception may be mid-entry.

**Outputs.** Picking up an idle tablet shows current data immediately.

**Failure modes.** A failed refresh here follows DSF-007 and is surfaced, not swallowed.

### DSF-005: The service and payment catalog re-hydrates

**Description.** A service or payment method the manager adds must appear without a page reload.

**Processing logic.** Re-fetch the services, payment methods and masseuse list into `CONFIG.settings`
(`web-app/shared.js:215-259`) on the visibility refresh of DSF-004, and on business-day rollover. Do
not re-fetch on every 30-second poll; the catalog changes rarely and the dropdown rebuild is not
free.

**Edge cases.** Rebuilding the dropdowns must preserve whatever the user has already selected. If a
selected service has been removed by the manager, keep the selection and let the existing validation
reject it on submit rather than silently changing it.

### DSF-006: Business-day rollover is detected and acted on

**Description.** When the business day changes, the page must reload its day-scoped state.

**Trigger.** The business day reported by the server differing from the one the client is holding.

**Processing logic.** On each poll and each visibility refresh, compare the server's business day
with the held value. On a change, re-run the full load — roster, live status, transactions, expenses,
summary, and the catalog per DSF-005.

**Outputs.** The next day's roster and empty transaction list appear on their own.

**Reproduction obligation.** During implementation, confirm on the actual reception device that a tab
left open overnight recovers on wake. The suspension of background timers is device and browser
behaviour, so it must be observed rather than assumed — the code fixes above are justified
independently, but this is the check that the reported overnight symptom is actually gone.

### DSF-007: Refresh failures are visible

**Description.** Reception must never be shown a success message when the screen state is stale.

**Processing logic.** Stop discarding errors in the post-submit chain and the poll —
`web-app/transaction.html:1487-1489`, `:1497-1499`, `:1516-1518`. On a refresh failure after a
successful submit, show a clear warning that the customer was saved but the screen may be out of
date, with an action to retry.

**Outputs.** A stale screen is always accompanied by a visible reason.

**Edge cases.** The submit itself succeeding while the refresh fails is the important case: the
message must make clear the customer **was** recorded, so reception does not enter them twice.

---

## 6. Data Model Changes

**None.** Both `date` and `business_day` already exist on every transaction row
(`backend/models/database.js:50-56`), and the live status endpoint already returns the business day.

---

## 7. State Transitions

Client-held day: `unknown` at load → `known(<business day>)` after the first live status response →
`known(<next day>)` on rollover, which triggers the full reload of DSF-006.

A failed live status call leaves the held day unchanged (DSF-001), never reverting it to `unknown`.

---

## 8. Operational Considerations

- **Logging:** log each refresh trigger — poll, visibility, rollover — with its outcome, so a stale
  screen can be diagnosed after the fact rather than reproduced.
- **Performance:** the visibility refresh adds a handful of requests when the tablet is picked up.
  The catalog re-fetch is excluded from the 30-second poll for this reason.
- **Security:** unchanged. No new endpoint, no new input, no change to authentication.

---

## 9. Rollout Plan

- **Deployment:** standard numbered-branch publish and branch-server deploy.
- **Migration:** none.
- **Backward compatibility:** the summary's day basis changes for the 2am-to-7am window (DSF-002);
  everything else is additive.
- **Rollback:** revert the application code. No data changes, so rollback is clean.
- **Live verification:** submit a customer and confirm the queue advances on screen with no reload;
  add a service in the manager pages and confirm it appears on intake without a reload; leave the
  tablet overnight and confirm the next morning's roster appears on wake.

---

## 10. Testing Requirements

- **Unit:** the client uses the server's business day, not a locally computed date.
- **Unit:** a failed refresh produces a user-visible warning rather than only a console message.
- **Integration:** today's summary scoped by business day agrees with the roster's day at 03:00
  Bangkok, the hour the two currently disagree.
- **Integration:** the poll re-fetches the transaction list rather than only re-filtering it.
- **Runtime (JSDOM):** a visibility change triggers a refresh; two rapid focus changes trigger only
  one.
- **Runtime (JSDOM):** a simulated business-day change triggers a full reload.
- **Runtime (JSDOM):** a catalog re-hydration preserves the user's current selection.
- **Regression:** the post-submit chain still refreshes the queue, roster and list.
- **Regression:** a refresh never clears or resets a partly filled form.
- **Contract:** `transaction.html` and `transaction.ejs` stay in parity.
- **On-device:** the overnight recovery check required by DSF-006.

---

## 11. Risks and Assumptions

### Assumptions
- **Documented** — the post-submit chain and the 30-second poll exist and their coverage is as
  described (`transaction.html:355-359`, `:1468-1478`), read this session.
- **Documented** — no visibility, focus, websocket or server-sent-events mechanism exists anywhere in
  the client, confirmed by search across `transaction.html`, `shared.js`, `api.js` and `roster-ui.js`.
- **Documented** — the two day definitions and their seven-hour offset
  (`transactions.js:647-648`, `business-day.js`), read this session.
- **Documented** — the catalog is loaded once (`shared.js:215-259`), read this session.
- **Inferred, needs reproduction** — that suspended background timers on the reception device are the
  dominant cause of the overnight symptom. The code defects above are real regardless; DSF-006
  requires this to be observed on the device rather than assumed.

### Risks

| Cause | Impact | Mitigation |
|---|---|---|
| The overnight symptom persists after these fixes | The real cause was something else | DSF-006's reproduction obligation catches it during implementation, before the epic is called done |
| A refresh interrupting mid-entry | Reception loses typed input | DSF-004 refreshes data only and is forbidden from touching form state; a regression test covers it |

### Open Questions
None. Every defect above is confirmed in source, and every fix is determined by it.

---

## 12. Acceptance Criteria

- **AC-001** *(criterion 1)* — After a submit, the queue, roster and transaction list on screen match
  the database with no manual reload.
- **AC-002** *(criterion 2)* — A forced refresh failure after a successful submit produces a visible
  warning stating the customer was saved.
- **AC-003** *(criterion 3)* — A service added through the manager pages appears on intake after a
  visibility refresh, with no page reload.
- **AC-004** *(criterion 4)* — A simulated business-day change causes the roster and transaction list
  to reload for the new day.
- **AC-005** *(criterion 5)* — A visibility change after an idle period triggers a full refresh; and
  the operator confirms overnight recovery on the reception device.
- **AC-006** *(criterion 6)* — At 03:00 Bangkok, today's summary and the roster report the same
  business day.
- **AC-007** *(guardrail)* — A refresh during data entry leaves every form field untouched.
- **AC-008** *(guardrail)* — `transaction.html` and `transaction.ejs` remain in parity.

### Goal coverage check
- **Every ratified criterion has a requirement behind it:** 1→DSF-003 and the existing chain,
  2→DSF-007, 3→DSF-005, 4→DSF-006, 5→DSF-004, 6→DSF-001 and DSF-002. Clean.
- **Every requirement serves a criterion:** DSF-001→6, DSF-002→6, DSF-003→1/4, DSF-004→5,
  DSF-005→3, DSF-006→4, DSF-007→2. Clean.
- Both directions clean; no orphans in either.
