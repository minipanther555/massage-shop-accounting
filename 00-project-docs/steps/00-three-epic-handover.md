# Three-Epic Handover — 2026-08-18

Read-first map for running three epics as three separate `/ship-epic` sessions.
**This file is navigation only. It contains no tasks.**

---

## 0. Before you start ANY session — commit and push

The three specs and three steps files are **untracked** on
`claude/musing-mclaren-418dbf` (based on `testing3421`). A new session cannot read a file that was
never committed. **Commit and push this branch first**, then start each session from that commit.

Each session should open its own worktree branch off that same base, so the three do not share a
working tree.

---

## 1. The three epics

| # | Epic | Steps file | Size | Ship order |
|---|---|---|---|---|
| 1 | Edited transaction state correctness | `edited-transaction-state-correctness-steps.md` | 7 steps | **FIRST** |
| 2 | Daily state freshness | `daily-state-freshness-steps.md` | 8 steps | second |
| 3 | Tips and miscellaneous income | `tips-and-miscellaneous-income-steps.md` | 9 steps | third |

---

## 2. ⚠️ Why these are NOT safely parallel

Two files are **written by all three epics**:

| File | Epic 1 (edited txn) | Epic 2 (freshness) | Epic 3 (tips) |
|---|---|---|---|
| `web-app/transaction.html` + `.ejs` | writes (1 step) | writes (5 steps) | writes (1 step) |
| `backend/routes/transactions.js` | writes (3 steps) | writes (1 step) | writes (3 steps) |
| `backend/routes/reports.js` | — | writes (1 step) | writes (1 step) |

Three branches editing the same monolithic intake page will conflict on merge, and
`web-app/transaction.html` holds its JavaScript inline, so the conflicts land in the middle of
functions rather than at tidy boundaries.

**There is also one real ordering dependency, not just a textual one.** Epic 3 (tips) creates rows
that can later be edited or voided. Whether a voided tip correctly reaches its paired payout depends
on Epic 1 (edited transaction) having fixed how a replacement row is written. Shipping tips first
means building on the defect.

### Recommended ordering

1. **Run Epic 1 (edited transaction) alone, to completion.** Seven steps, one-line root fix, and it
   is currently losing money from the daily summary every time a transaction is edited.
2. **Then run Epics 2 and 3 in parallel**, each rebased onto Epic 1's result. They still overlap on
   the intake page and the transactions route, so expect to resolve conflicts at merge — but the
   semantic dependency is gone and the conflicts are mechanical.

If you want all three at once anyway, run Epic 1 and Epic 2 in parallel and hold Epic 3 back; Epic 3
is the one with the genuine dependency.

---

## 3. Session 1 — Edited transaction state correctness

**Start with:** `/rehydrate`, then `/ship-epic` on `ETSC-CORE-001`.

- **Steps file:** `00-project-docs/steps/edited-transaction-state-correctness-steps.md`
- **Spec:** `00-project-docs/feature-specifications/edited-transaction-state-correctness.md`
- **First OPEN step:** `ETSC-CORE-001` — replacement lookups key on the link, not the status
- **Entry step depends on:** nothing
- **Phases:** 1 make the live row recognisable · 2 prove the symptom is gone · 3 remove the
  contradictory busy path · 4 verification and deploy
- **Human stops:** one — the operator live-verifies an edit on the branch server at
  `ETSC-DEPLOY-001`, the final step.
- **What it fixes:** an edit writes a status half the system does not recognise. The masseuse reads
  as free mid-massage and jumps to the front of the queue, and the edited transaction's money
  disappears from the daily summary while still appearing in the monthly report.
- **The one thing to watch:** `ETSC-CLEAN-001` (removing the dead busy-write from intake) is cleanup,
  not repair. It serves no acceptance criterion and the steps file says to cut it first if the epic
  needs narrowing.
- **No migration. No schema change.**

---

## 4. Session 2 — Daily state freshness

**Start with:** `/rehydrate`, then `/ship-epic` on `DSF-DAY-001`.

- **Steps file:** `00-project-docs/steps/daily-state-freshness-steps.md`
- **Spec:** `00-project-docs/feature-specifications/daily-state-freshness.md`
- **First OPEN step:** `DSF-DAY-001` — the client uses the server's business day
- **Entry step depends on:** nothing
- **Phases:** 1 one idea of which day it is · 2 refresh that covers the screen · 3 never claim
  success on a stale screen · 4 verification and deploy
- **Human stops:** two — the operator live-verifies the submit and catalog refresh, **and** confirms
  overnight recovery on the reception tablet. **The overnight check needs a real overnight**, so this
  epic cannot close the same day its code lands.
- **What it fixes:** refresh logic already exists but is incomplete, fails silently, cannot survive an
  idle tab, and disagrees with the server about which day it is. The client asks for the UTC date
  while the roster uses the Bangkok day with a 2am reset — seven hours apart.
- **The one thing to watch:** `DSF-DAY-002` changes reported daily figures for anything recorded
  between 2am and 7am Bangkok. That is the intended correction, not a regression — but mention it
  when you deploy.
- **The honest gap:** whether the tablet's browser suspends its timers overnight cannot be proven
  from code. The five code defects are real regardless, but `DSF-DEPLOY-001` says plainly: if the
  overnight symptom survives the fix, **do not close the epic** — reopen diagnosis.
- **No migration. No schema change.**

---

## 5. Session 3 — Tips and miscellaneous income

**Start with:** `/rehydrate`, then `/ship-epic` on `TMI-CONTRACT-001`.

- **Steps file:** `00-project-docs/steps/tips-and-miscellaneous-income-steps.md`
- **Spec:** `00-project-docs/feature-specifications/tips-and-miscellaneous-income.md`
- **First OPEN step:** `TMI-CONTRACT-001` — non-massage income never counts as a massage
- **Entry steps depending on nothing:** `TMI-CONTRACT-001` and `TMI-CONTRACT-002` (these two can run
  concurrently — they share no file)
- **Phases:** 1 shared contracts · 2 money in, money out · 3 reception and reporting · 4 verification
  and deploy
- **Human stops:** one — the operator records a real tip on the branch server and judges whether it
  slows intake, at `TMI-DEPLOY-001`.
- **What it builds:** a tip goes in as income and out as an expense, nets to zero on profit, stays
  traceable to the masseuse, and never touches her payday balance. Extra charges like tiger balm are
  income only. Standalone income needs no massage behind it.
- **Migration:** yes — four nullable columns on the expenses table, applied by the existing startup
  mechanism, no backfill. `TMI-DEPLOY-001` requires confirming they landed before the code that reads
  them is exercised.
- **The trap this epic must not spring:** the counts-as-a-massage rule treats any row without a parent
  as a massage. A standalone income row has no parent, so without `TMI-CONTRACT-001` it would inflate
  a masseuse's workload and push her down the queue — re-creating the exact defect Epic 1 fixes.
- **Runtime unknown:** "Gowabi" does not exist as a payment method anywhere in code. Payment methods
  are admin-created rows, so it may or may not exist in the live database. Resolved at deploy; needs
  no code change either way.

---

## 6. Shared facts every session needs

- **Branch base:** `testing3421`, live-verified on the branch server.
- **Server:** ssh alias `massage` → `/opt/massage-shop`, systemd unit `massage-shop.service`
  (a reader service — restarts freely, no operator gate needed for restart).
- **Mirror rule:** every `web-app/*.html` has a byte-identical `.ejs` mirror apart from two CSRF
  placeholders. Parity is enforced by a contract test. **Every intake change must be mirrored.**
- **Tests:** Jest, in `__tests__/`. Run with `npx jest`.
- **No `testingNN` number is minted by any deploy step.** Numbers come only from a post-checkpoint
  `/push`. The deploy steps push the working branch so the server can fetch it — nothing more.
- **Every epic ends with an operator live-verify.** None of the three can close unattended.

---

## 7. What is deliberately NOT in any of these epics

- Point-of-sale integration through card and booking-platform notification emails and texts.
- Cash-drawer or till tracking — the manager does not want it.
- Correcting past daily summaries that were understated by the edited-transaction defect. Rewriting
  finished books is an operator decision and blocks nothing.
- A live push channel between devices.
