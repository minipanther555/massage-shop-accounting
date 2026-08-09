# Intake Service Variant Sub-Buttons — Execution Steps

## Goal
On the New Customer intake page, generalize the existing combo-only sub-panel pattern so that any service category with two or more distinct services opens a sub-panel of variant buttons on tap. Immediate observable outcome: **Deep oil** and **Deep aroma**, which already sit in the `services` table and in `CONFIG.settings.services` at runtime, become reachable by tapping **Oil** or **Aroma** and then the desired variant. Spec: [`00-project-docs/feature-specifications/intake-service-variant-sub-buttons.md`](00-project-docs/feature-specifications/intake-service-variant-sub-buttons.md).

> **Status:** OPEN — awaiting Phase 1.

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

### STEP_ID: ISVSB-UI-001 — Generalize the category sub-panel from combo-only to any multi-variant category — OPEN
- **Protocol:** `/fsm-ship-ntc`
- **Dependencies:** none
- [ ] In [web-app/transaction.html](web-app/transaction.html), when a category button is tapped and its resolved service list has length ≥ 2, a sub-panel is revealed containing one button per service in that category (label via `getServiceDisplayName`), and no service is selected until a sub-button is tapped — FR-001.
- [ ] When a category button is tapped and its resolved service list has length exactly 1, the sub-panel is hidden and that service is selected on the single tap — the current one-tap behavior for Thai / Foot / Shoulder / Coconut / Scrub is preserved — FR-001, AC-004.
- [ ] Tapping a sub-button calls `selectServiceValue(serviceName)`, populating the hidden `<select id="service">` and firing `change`, driving duration/price/staff downstream identically to today's combo sub-button flow — FR-002, AC-002, AC-003.
- [ ] The `combo` category continues to open a sub-panel containing every combo service, and every combo remains selectable exactly as today — FR-001, AC-006.
- [ ] After a variant is selected, both the category button and the selected sub-button carry the `is-active` class, matching today's combo active-state pattern — FR-003, AC-005.
- [ ] The sub-panel carries a short Thai title (either the existing "เลือกคอมโบ" for combo plus a generic "เลือกบริการ" for other categories, or a per-category label such as "เลือกออยล์" / "เลือกอโรม่า") — FR-004. Implementer's choice between the two forms; both are acceptable Thai UX.
- [ ] Sub-buttons within a multi-variant category are ordered: regular first, "Deep " variants last, tie-broken alphabetically — FR-005.
- [ ] Dead code removed: `getPreferredCategoryService` and its `preferredServiceNames` map at [transaction.html:898-906](web-app/transaction.html:898) are deleted if no longer referenced after the change; the single-variant path inlines `servicesByCategory[key][0]`.
- **Validation:** `git diff --name-only main..HEAD` returns exactly `web-app/transaction.html` and nothing else (AC-007). Loading the intake page in a real browser and grouping services by category: every `servicesByCategory[key].length >= 2` category renders a visible sub-panel on tap (asserted by DOM inspection: `#combo-service-panel` or its generalized equivalent has `hidden=false` and contains one child button per service in that category); every `length === 1` category leaves the sub-panel hidden and populates `document.getElementById('service').value` on the single tap. Tapping the Deep oil sub-button leaves `document.getElementById('service').value === 'Deep oil'` and the duration `<select>` populated with the durations Deep oil offers at the current location. Combo flow: at least one combo service selectable end-to-end.
- **Risk notes:** the combo sub-panel is the sole existing consumer of this DOM element; the highest regression risk is breaking combo. Either keep the `#combo-service-panel` element and drive it by the general rule, or add a sibling `#variant-service-panel` and keep combo untouched — implementer's call at S4_Design. Live-verify (ISVSB-DEPLOY-001) explicitly re-exercises combo.
- **Completion Notes:** _(empty at authoring; the ship FSM fills this at S10 with Exit-Criteria evidence, the commit SHA, the `known-good/ISVSB-UI-001` tag if this becomes the rollback anchor, and any route that diverged from the action items above.)_

**Phase 1 complete when:**
- [ ] ISVSB-UI-001 marker reads `✅ DONE (<date>)` in this file.
- [ ] `git diff --name-only main..HEAD` on the working branch shows `web-app/transaction.html` and no other file changed (guards AC-007).
- [ ] The ship FSM's S6 smoke gate passed and its evidence is recorded in ISVSB-UI-001's Completion Notes.

**This gate authorizes Phase 2.**

---

## Phase 2 — Deploy & Live-Verify — OPEN
**Phase goal:** the change is running on the branch server the operator uses for verification, the operator has tapped through Oil→Deep oil and Aroma→Deep aroma on real hardware and both flow through duration/payment cleanly, and combo + single-variant categories show no regression.

### STEP_ID: ISVSB-DEPLOY-001 — Deploy the working branch and live-verify both variants + combo + single-variant sanity — OPEN
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
- **Completion Notes:** _(empty at authoring; the ship FSM + operator fill this at S10.)_

**Phase 2 complete when:**
- [ ] ISVSB-DEPLOY-001 marker reads `✅ DONE (<date>)` in this file.
- [ ] Its Completion Notes contain `LIVE = <branch>@<SHA>` and the seven observation lines above.
- [ ] Operator has live-verified on a real device and recorded the observations. *(This is a deliberate handover to human judgment — the visual/tactile check of the sub-panel opening on a real intake device is not automatable in this repo today.)*

**This gate ends the epic.**

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
_(append-only; empty at authoring; written by the ship FSM as execution reveals what the plan had wrong.)_

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
- **AC-007** (only `web-app/transaction.html` changed) → ISVSB-UI-001 (`git diff --name-only`)
- **UNCOVERED:** none.
