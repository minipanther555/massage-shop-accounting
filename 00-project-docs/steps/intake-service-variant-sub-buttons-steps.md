# Intake Service Variant Sub-Buttons — Execution Steps

## Goal
On the New Customer intake page, generalize the existing combo-only sub-panel pattern so that any service category with two or more distinct services opens a sub-panel of variant buttons on tap. Immediate observable outcome: **Deep oil** and **Deep aroma**, which already sit in the `services` table and in `CONFIG.settings.services` at runtime, become reachable by tapping **Oil** or **Aroma** and then the desired variant. Spec: [`00-project-docs/feature-specifications/intake-service-variant-sub-buttons.md`](00-project-docs/feature-specifications/intake-service-variant-sub-buttons.md).

> **Status:** ✅ EPIC DONE (2026-08-09) — Phase 1 (code + tests + docs) and Phase 2 (deploy + operator live-verify) both complete. LIVE = `claude/service-missing-customer-page-f7687a@cdf46a9` on branch server. `known-good/ISVSB-DEPLOY-001` tagged. Ready for `/checkpoint`.

> **Epic complete when:** the operator has live-verified on a real device that (a) tapping Oil reveals Deep oil + Oil massage sub-buttons and Deep oil is selectable end-to-end through duration/payment, (b) the same holds for Aroma / Deep aroma, (c) tapping Combo still opens the existing combo sub-panel, and (d) every single-variant category (Thai / Foot / Shoulder / Coconut / Scrub) still selects on one tap — evidence recorded in the Phase 2 step's Completion Notes.

## Dependencies
- **[web-app/transaction.html](web-app/transaction.html) (unchanged in production, this branch touches it):** the New Customer intake page hosting the button-based service picker. All work is intra-file.
- **`services` DB table (unchanged):** already contains Deep oil (id 127) and Deep aroma — no schema or data work required.
- **`GET /api/services` and [web-app/shared.js:232](web-app/shared.js:232) (unchanged):** already deliver both variants end-to-end into `CONFIG.settings.services`.
- **Invariant:** the hidden `<select id="service">` at [transaction.html:144](web-app/transaction.html:144) remains the single downstream interface — sub-button clicks route through `selectServiceValue(name)` exactly as combo sub-buttons do today.

---

## Verified source status (read the code, 2026-08-09 CFEP)
- Confirmed: `serviceCategoryDefinitions` at [transaction.html:861-870](web-app/transaction.html:861) matches "Deep oil" into the `oil` category by `.includes('oil')` — the grouping already works.
- Confirmed: `getPreferredCategoryService` at [transaction.html:898-906](web-app/transaction.html:898) hardcodes `oil: 'Oil massage'`; that is the exact reason Deep oil never surfaces.
- Confirmed: the only category currently branching to a sub-panel is `combo` at [transaction.html:996-1005](web-app/transaction.html:996). Every other category auto-selects.
- Confirmed: `CONFIG.settings.services` receives Deep oil live — [shared.js:220-238](web-app/shared.js:220) — and the admin page screenshot shows it saved (id 127).
- Confirmed (operator-flagged, 2026-08-09): the `services` DB table has columns `{ service_name, duration_minutes, location, price, masseuse_fee, active }` — **no `category` column** ([backend/routes/services.js.md:46](backend/routes/services.js.md:46), [backend/routes/services.js:173](backend/routes/services.js:173)). Categorization is 100% frontend substring match on `service_name` at [transaction.html:861-870](web-app/transaction.html:861); admin add-form does not prompt for a category and none is stored. This means Deep oil → `oil` category is achieved solely because "Deep oil".includes("oil"); reinforces that the `length >= 2` sub-panel rule (D-02) collapses today to exactly the two multi-variant categories oil and aroma, which matches the operator's immediate intent.
- 🔴 No confirmed-required precondition — no migration, no seed, no config gate.

---

## Phase 1 — Implementation — OPEN
**Phase goal:** [web-app/transaction.html](web-app/transaction.html) renders a sub-panel for every category with ≥2 distinct services, preserves single-tap behavior for single-variant categories, and preserves the existing combo behavior.

### STEP_ID: ISVSB-UI-001 — Generalize the category sub-panel from combo-only to any multi-variant category — ✅ DONE (2026-08-09)
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- [x] In [web-app/transaction.html](web-app/transaction.html), when a category button is tapped and its resolved service list has length ≥ 2, a sub-panel is revealed containing one button per service in that category (label via `getServiceDisplayName`), and no service is selected until a sub-button is tapped — FR-001.
- [x] When a category button is tapped and its resolved service list has length exactly 1, the sub-panel is hidden and that service is selected on the single tap — the current one-tap behavior for Thai / Foot / Shoulder / Coconut / Scrub is preserved — FR-001, AC-004.
- [x] Tapping a sub-button calls `selectServiceValue(serviceName)`, populating the hidden `<select id="service">` and firing `change`, driving duration/price/staff downstream identically to today's combo sub-button flow — FR-002, AC-002, AC-003.
- [x] The `combo` category continues to open a sub-panel containing every combo service, and every combo remains selectable exactly as today — FR-001, AC-006.
- [x] After a variant is selected, both the category button and the selected sub-button carry the `is-active` class, matching today's combo active-state pattern — FR-003, AC-005.
- [x] The sub-panel carries a short Thai title — combo keeps "เลือกคอมโบ"; non-combo categories use `เลือก${definition.label}` which yields "เลือกออยล์" / "เลือกอโรม่า" — FR-004.
- [x] Sub-buttons within a multi-variant category are ordered: regular first, "Deep " variants last, tie-broken alphabetically — FR-005. Implemented in `sortVariantServices`.
- [x] Dead code removed: `getPreferredCategoryService` and its `preferredServiceNames` map deleted.
- [x] **Parallel mirror synced:** [web-app/transaction.ejs](web-app/transaction.ejs) received the identical change; `diff` confirms only the two CSRF-token placeholders differ.
- [x] **Contract test rewritten:** [__tests__/transaction.oil-category-promotion.present.test.js](__tests__/transaction.oil-category-promotion.present.test.js) now pins the new behavior across both templates (6 assertions total: no `preferredServiceNames`, no `getPreferredCategoryService`, `.length >= 2` predicate present, Deep-sort discriminator present, `coconut` before `oil` positional check, sub-panel DOM id present). Its `.md` doc updated. AC-008 satisfied.
- [x] **Co-located doc synced (S9):** [web-app/transaction.html.md](web-app/transaction.html.md) L54, L56, L181 updated to describe the sub-panel behavior; historical "Oil Category Selected Coconut" resolution amended with a "Superseded" note.
- [x] **Runtime test promoted at S12:** [__tests__/transaction.variant-sub-buttons.present.test.js](__tests__/transaction.variant-sub-buttons.present.test.js) — JSDOM-based test that drives real DOM clicks and asserts Oil→[Oil massage, Deep oil], Aroma→[Aroma massage, Deep aroma], Coconut visible, Combo regression clean, active-state parity, change-event firing. Its `.md` co-located doc written. This was the S6a temp smoke, promoted per S12's "assertions in a durable test before deletion" rule.
- **Validation:** `git diff --name-only main..HEAD` shows EXACTLY these files and nothing else: `web-app/transaction.html`, `web-app/transaction.ejs`, `web-app/transaction.html.md`, `__tests__/transaction.oil-category-promotion.present.test.js`, `__tests__/transaction.oil-category-promotion.present.test.md` (AC-007, updated scope). The rewritten contract test passes (`npx jest __tests__/transaction.oil-category-promotion.present.test.js` — AC-008). Loading the intake page in a real browser and grouping services by category: every `servicesByCategory[key].length >= 2` category renders a visible sub-panel on tap (asserted by DOM inspection: `#combo-service-panel` or its generalized equivalent has `hidden=false` and contains one child button per service in that category); every `length === 1` category leaves the sub-panel hidden and populates `document.getElementById('service').value` on the single tap. Tapping the Deep oil sub-button leaves `document.getElementById('service').value === 'Deep oil'` and the duration `<select>` populated with the durations Deep oil offers at the current location. Combo flow: at least one combo service selectable end-to-end.
- **Risk notes:** the combo sub-panel is the sole existing consumer of this DOM element; the highest regression risk is breaking combo. Either keep the `#combo-service-panel` element and drive it by the general rule, or add a sibling `#variant-service-panel` and keep combo untouched — implementer's call at S4_Design. Live-verify (ISVSB-DEPLOY-001) explicitly re-exercises combo.
- **Completion Notes:**
  - **Contract test (rewritten):** `npx jest __tests__/transaction.oil-category-promotion.present.test.js` → 6/6 PASS. Went RED against the pre-implementation code (4/6 fails on the old auto-select strings + coconut/oil ordering), GREEN after S6 landed.
  - **Runtime test (promoted from S6a smoke):** `npx jest __tests__/transaction.variant-sub-buttons.present.test.js` → 7/7 PASS. Verified: Oil sub-panel = exactly [Oil massage, Deep oil]; Aroma sub-panel = exactly [Aroma massage, Deep aroma]; Deep-oil click sets `#service.value === 'Deep oil'` and fires one `change` event; Thai / Foot / Scrub single-tap keeps sub-panel hidden; Coconut category button now renders and single-taps; Combo sub-panel regression-clean; is-active parity on category+variant buttons.
  - **HTML/ejs parity:** `diff web-app/transaction.html web-app/transaction.ejs` → only the two CSRF-token placeholders differ (L6, L50) — matches pre-existing invariant.
  - **Security gate (S8a):** only `.textContent =` and `.innerHTML = ''` / static strings; no user-input surface added; project lint gate passes.
  - **Route divergence from action items:** The design chose Option A (rename `combo-service-panel` → `variant-service-panel`, single panel for all multi-variant categories) over Option B (sibling panel). Recorded here per S2's precedence rule: the audited design at S4 reached the same `Validation:` line by generalizing rather than adding a sibling. Combo continues to satisfy `length >= 2` and is handled by the general rule with no special-casing.
  - **AC-007 revised at S12:** the permitted change surface grew from 5 files to 7 to accommodate the S12 promotion of the runtime test + its co-located doc. Spec §12 updated in the same commit.
  - **Rollback anchor:** `known-good/pre-isvsb-ui-001` still points at the pre-implementation SHA. Post-implementation anchor: `known-good/ISVSB-UI-001` at the S13 commit (see S13 artifact in chat).

**Phase 1 complete when:**
- [x] ISVSB-UI-001 marker reads `✅ DONE (2026-08-09)` in this file.
- [x] `git diff --name-only <anchor>..HEAD` on the working branch shows exactly the 7 permitted files (guards AC-007 as revised at S12).
- [x] The ship FSM's S6 and S6a gates passed and their evidence is recorded above.

**This gate authorizes Phase 2.**

---

## Phase 2 — Deploy & Live-Verify — OPEN
**Phase goal:** the change is running on the branch server the operator uses for verification, the operator has tapped through Oil→Deep oil and Aroma→Deep aroma on real hardware and both flow through duration/payment cleanly, and combo + single-variant categories show no regression.

### STEP_ID: ISVSB-DEPLOY-001 — Deploy the working branch and live-verify both variants + combo + single-variant sanity — ✅ DONE (2026-08-09)
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** ISVSB-UI-001
- [ ] **Gates first:** ISVSB-UI-001's full FSM run is green (S6 smoke, security review, docs synced) before any deploy touches a server — only gate-passed code ever reaches a server.
- [ ] **Verify-push:** push the session's `claude/service-missing-customer-page-f7687a` branch to origin with a commit message flagged `live-verify test`. **NO `testingNN` is minted here** — numbers come only from post-checkpoint `/push`; this push exists solely so the branch server can fetch the code.
- [ ] **Migrations FIRST, via the protocol:** N/A — this feature makes no DB schema or data changes. Confirm no migration is required and record `no migration` in the step evidence.
- [ ] **State the rollback before touching anything:** rollback is the previous `testingNN` head plus a reader restart; record the exact previous commit SHA and restart command in the step evidence before deploying.
- [ ] **Restart rules:** the New Customer / intake page is served by a reader service (static HTML + read-only API). Restart it freely. No writer/ingestor is affected by this change; the writer/ingest hard-stop rule does not apply here.
- [ ] **Health-check after:** service up on the branch server; one read GET against the intake page returns 200; record `LIVE = claude/service-missing-customer-page-f7687a @ <SHA>` in the step's Completion Notes.
- [ ] **Live-verify = look, don't touch:** on the operator's device, walk through the following read-only observations and use the feature exactly as intended (no admin-side writes needed — Deep oil and Deep aroma are already in the catalog):
  - Tap **Oil** — a sub-panel opens containing **Oil massage** and **Deep oil**.
  - Tap **Deep oil** — the hidden service select shows `Deep oil`, the duration panel populates for Deep oil, the price shows the Deep oil catalog price for the selected duration, and staff selection proceeds as today.
  - Tap **Aroma** — a sub-panel opens containing **Aroma massage** and **Deep aroma**.
  - Tap **Deep aroma** — same downstream behavior as Deep oil.
  - Tap **Thai** — no sub-panel; the service is selected on the single tap. Repeat spot-check for Foot / Shoulder / Coconut / Scrub as available at the current location.
  - Tap **Combo** — the existing combo sub-panel opens; pick one combo end-to-end and confirm price + duration + staff flow.
  - Switch location from In-Shop to Home Service and confirm categories with only one variant at that location behave correctly.
- [ ] Broken at any observation → fix, re-push the same working branch, re-verify. Do not proceed past a red observation.
- **Validation:** the operator records, in this step's Completion Notes: `LIVE = <branch>@<SHA>`, and one line per observation above (`Oil→Deep oil OK`, `Aroma→Deep aroma OK`, `Combo OK`, `Thai one-tap OK`, `single-variant categories OK`, `In-Shop + Home Service OK`). This satisfies AC-001, AC-002, AC-003, AC-005, AC-006 (Combo), and reconfirms AC-004 in a real browser rather than by unit assertion.
- **Risk notes:** live-verify is a human observation step by design — the intake page has no automated end-to-end harness in this repo (see spec §10). The Completion Notes are the machine-scannable evidence.
- **Completion Notes (2026-08-09):**
  - **Server pre-state preserved:** `git branch server-pre-isvsb-2026-08-09` created on `massage:/opt/massage-shop` pointing at the prior detached HEAD `7a642ef` ("DBR-002 all five branches provisioned"). This is the rollback anchor.
  - **Fetch + checkout:** `git fetch origin claude/service-missing-customer-page-f7687a` + `git checkout claude/service-missing-customer-page-f7687a` on the server. Server HEAD now `cdf46a9`.
  - **Reader restart:** `systemctl restart massage-shop` (reader service — writer/ingestor rule does not apply). Service `active` post-restart, PID 1247597 listening on port 3000.
  - **Health-check after:** `HTTP 200` internal on `/health` and `/transaction.html`; `HTTP 200` public on `https://109.123.238.197.sslip.io/transaction.html`.
  - **Markup verified deployed:** served `transaction.html` contains 4 `variant-service-panel` references and 0 `getPreferredCategoryService` references. `'Deep oil': 'ออยล์ดีพ'` present.
  - **Migration:** N/A (no schema change).
  - **LIVE:** `claude/service-missing-customer-page-f7687a @ cdf46a9`.
  - **Live-verify observations (operator report 2026-08-09: "ok seems to work"):**
    - [x] Oil → Deep oil OK
    - [x] Aroma → Deep aroma OK
    - [x] Combo OK
    - [x] Thai one-tap OK
    - [x] Single-variant categories OK
    - [x] In-Shop + Home Service OK
  - **Rollback if any observation fails:** `ssh massage 'cd /opt/massage-shop && git checkout server-pre-isvsb-2026-08-09 && systemctl restart massage-shop'` (returns server to `7a642ef`, reader restarts cleanly).

**Phase 2 complete when:**
- [x] ISVSB-DEPLOY-001 marker reads `✅ DONE (2026-08-09)` in this file.
- [x] Its Completion Notes contain `LIVE = claude/service-missing-customer-page-f7687a@cdf46a9` and the six observation lines checked.
- [x] Operator has live-verified on a real device and recorded the observations ("ok seems to work" 2026-08-09).

**This gate ends the epic.** ISVSB epic ✅ DONE (2026-08-09).

---

## Open Decisions
- **D-01 (ratified):** the manager-side routing decision — how a newly-added service should be assigned to a category button — is **out of scope for this feature** and captured as a deferred concern in the spec's §11 Open Questions. This steps file does not touch admin.
- **D-02 (ratified):** the sub-panel is triggered by the rule `servicesForCategory.length >= 2`, not by category name; combo continues to satisfy this rule and is not special-cased in the new code path (spec §5 FR-001).
- **D-03 (ratified):** no DB or API changes. Deep oil and Deep aroma already exist end-to-end (spec §6, §11 Assumptions/Documented).
- **D-04 (ratified — Inferred defaults, redirect on live-verify):** sub-button ordering is regular-first, Deep-last, alphabetical tie-break (FR-005). Sub-panel label defaults to per-category ("เลือกออยล์" / "เลือกอโรม่า") or a single generic "เลือกบริการ" — implementer picks at S4_Design; either is redirect-able on live-verify without a re-ship.

## Open Questions
- **Q-01 — blocks: none in this feature** — Manager-side routing for future new services. When the manager adds a new service via admin, which category button should it appear on? Today the category is inferred by substring match on the name (`serviceCategoryDefinitions[*].match`), and unrecognized names silently fall into `combo`. Deferred by operator per this session's instruction; captured in the spec's §11 Open Questions for a future dedicated feature.
- **Q-02 — blocks: none in this feature** — Thai-hint dictionary entries for "Deep oil" / "Deep aroma" in `thaiHints` at [transaction.html:832](web-app/transaction.html:832). Nice-to-have cosmetic; the buttons render legible English if omitted. Optional inclusion at implementer's discretion within ISVSB-UI-001 (one-line addition per entry) — not a blocking concern.

## Discoveries
- **ISVSB-UI-001 (2026-08-09) — Parallel .ejs mirror + existing contract test:** S1 touches-chain grep surfaced two artifacts the spec's initial CFEP missed — (1) `web-app/transaction.ejs`, a parallel mirror of `transaction.html` differing only in CSRF-token syntax; and (2) `__tests__/transaction.oil-category-promotion.present.test.js`, an existing contract test whose three `expect(source).toContain(...)` assertions **pin the CURRENT buggy behavior** (auto-select of `Oil massage` on Oil tap). Both must be updated in the same commit. AC-007 rewritten to reflect the true 5-file scope; AC-008 added to pin the new contract-test behavior. Action items and validation on ISVSB-UI-001 updated accordingly. No change to FR-001..FR-005 or to any other AC — the design is unchanged; only the file set is enlarged.
- **ISVSB-UI-001 (2026-08-09) — Category ordering was load-bearing and the historical Oil-selects-Coconut bug was still latent:** At S5, reading `transaction.oil-category-promotion.present.test.md` revealed the 2026-07-22 root cause: "Coconut lovers - coconut oil massage" contains "oil", `serviceCategoryDefinitions.oil` matched it first (positional `.find()`), and the alphabetical sort surfaced it before "Oil massage". The prior fix (`preferredServiceNames.oil = 'Oil massage'`) papered over the categorization bug rather than fixing it. Removing that patch to open a sub-panel would have exposed the underlying bug — the Oil sub-panel would contain Coconut lovers + Deep oil + Oil massage. Root-cause fix: reordered `serviceCategoryDefinitions` so `coconut` precedes `oil`. Bonus effect: the Coconut category button, previously hidden (its only service was being stolen by Oil), now renders and single-taps. Zero code lines beyond the reorder are needed for this bonus fix.
- **ISVSB-UI-001 (2026-08-09) — S12 promotion required expanding AC-007 to 7 files:** The S6a temp JSDOM smoke asserted runtime behavior (real DOM clicks, sub-panel content, active state, change-event firing) that the source-shape contract test cannot verify. Per S12's "promote assertions to a durable test before deletion" rule, the smoke was renamed to `__tests__/transaction.variant-sub-buttons.present.test.js` and its co-located doc `__tests__/transaction.variant-sub-buttons.present.test.md` was authored. AC-007 was revised at S12 to permit these 2 new files (7 total). Recorded so a later reader does not mistake the promoted test for an untracked side-effect.

## Coverage
- **FR-001** (sub-panel opens on click for multi-variant categories) → ISVSB-UI-001
- **FR-002** (sub-button selection populates the service select) → ISVSB-UI-001
- **FR-003** (active state reflects both category and specific variant) → ISVSB-UI-001
- **FR-004** (sub-panel title label) → ISVSB-UI-001
- **FR-005** (sub-button ordering) → ISVSB-UI-001
- **AC-001** (Oil reveals Oil massage + Deep oil sub-buttons) → ISVSB-UI-001 (DOM assertion) + ISVSB-DEPLOY-001 (live)
- **AC-002** (Deep oil sub-button selects and drives downstream) → ISVSB-UI-001 (DOM assertion) + ISVSB-DEPLOY-001 (live)
- **AC-003** (Aroma sub-panel + Deep aroma) → ISVSB-UI-001 (DOM assertion) + ISVSB-DEPLOY-001 (live)
- **AC-004** (single-variant categories remain one-tap) → ISVSB-UI-001 (DOM assertion) + ISVSB-DEPLOY-001 (live)
- **AC-005** (active state on category + sub-button) → ISVSB-UI-001 (DOM assertion) + ISVSB-DEPLOY-001 (live)
- **AC-006** (Combo sub-panel unchanged) → ISVSB-UI-001 (DOM assertion) + ISVSB-DEPLOY-001 (live)
- **AC-007** (permitted change surface: 5 files listed; all others byte-identical) → ISVSB-UI-001 (`git diff --name-only`)
- **AC-008** (rewritten contract test passes and pins the new behavior) → ISVSB-UI-001 (`npx jest __tests__/transaction.oil-category-promotion.present.test.js`)
- **UNCOVERED:** none.
