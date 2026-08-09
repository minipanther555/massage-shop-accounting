# Intake Service Variant Sub-Buttons — Feature Specification

## 1. Executive Summary

### Feature Name
Intake service variant sub-buttons — surface multi-variant service categories on the New Customer page.

### Goal
On the New Customer (transaction) intake page, when a service category (e.g. Oil, Aroma) contains more than one distinct service name in the catalog, tapping the category button must open a sub-panel of one button per service so reception can pick the specific variant. Immediate target: make **Deep oil** and **Deep aroma** — which already exist in the `services` table — reachable from the intake page.

### Success Criteria
- On the New Customer page, tapping "ออยล์ / Oil" opens a sub-panel containing at least two buttons — one for **Oil massage** and one for **Deep oil** — from which reception picks the variant, which then populates the hidden `<select id="service">` and drives the duration/price/staff flow exactly as today.
- Same behavior for "อโรม่า / Aroma" → **Aroma massage** + **Deep aroma**.
- Every existing single-variant category (Thai, Foot, Shoulder, Coconut, Scrub) continues to work as a one-tap button — no regression.
- The existing `combo` sub-panel continues to work.
- No change to the admin Services page, the `/api/services` contract, the `services` table, or `web-app/shared.js` service loading.

### Requirement Sources
- **Operator request (this session):** "I added Deep oil via services … it's not present under the buttons … we also added Deep aroma … it should be automatically opened. In the case that I click Oil on the Oil button, it should open the option of those two services. So they're like sub buttons."
- **CFEP findings (this session):** the bug locus is [web-app/transaction.html:898-906](web-app/transaction.html:898) (`getPreferredCategoryService` hardcodes `oil: 'Oil massage'`) and [web-app/transaction.html:987-1006](web-app/transaction.html:987) (only the `combo` category opens a sub-panel; every other category auto-selects the preferred one).
- **Repository reality:** `CONFIG.settings.services` already contains Deep oil and Deep aroma end-to-end ([web-app/shared.js:232](web-app/shared.js:232)); they get correctly grouped under `oil` / `aroma` at [transaction.html:980-985](web-app/transaction.html:980); the render loop hides them.

---

## 2. Scope Definition

### In Scope
- The category-button render logic in [web-app/transaction.html](web-app/transaction.html) (functions `renderServiceButtons`, `updateServiceButtonState`, `getPreferredCategoryService`, and the DOM sub-panel).
- The same change applied to [web-app/transaction.ejs](web-app/transaction.ejs) — a parallel mirror of `transaction.html` that differs only in its CSRF-token placeholder syntax; the existing contract test `__tests__/transaction.oil-category-promotion.present.test.js` asserts both files stay in sync, so both must be updated together.
- The existing contract test [__tests__/transaction.oil-category-promotion.present.test.js](__tests__/transaction.oil-category-promotion.present.test.js), which currently pins the old auto-select-to-`Oil massage` behavior via three `expect(source).toContain(...)` assertions. All three assertions will fail after the change and must be rewritten to pin the new sub-panel behavior. Its co-located doc `__tests__/transaction.oil-category-promotion.present.test.md` updates alongside.
- The co-located doc [web-app/transaction.html.md](web-app/transaction.html.md) — updated at S9_DocSync to describe the sub-panel behavior for Oil/Aroma categories.
- The sub-panel markup for non-combo categories (either the existing `combo-service-panel` generalized, or a sibling panel).
- Thai label(s) for the sub-panel title when it is opened for a non-combo category.

### Out of Scope
- Admin Services page ([web-app/admin-services.html](web-app/admin-services.html)) — no change; Deep oil is already saved correctly.
- `/api/services` backend — no change.
- `services` table schema — no change.
- The `serviceCategoryDefinitions` array and its category taxonomy (Thai, Foot, Oil, Aroma, Shoulder, Coconut, Scrub, Combo) — unchanged; Deep oil / Deep aroma already resolve to `oil` / `aroma` by substring match.
- `getServiceDisplayName` Thai-hint dictionary — Deep oil and Deep aroma will render as their raw English names on the sub-buttons; adding Thai hints for them is a nice-to-have, not required for the feature to work, and is deferred (see §11 Open Questions).
- Any other reception page (Booking, Edit/Correction, Extend, Home Service) — this page is the one that switched to buttons; others still use native `<select>` and already show every catalog entry.

### Non-Goals
- Redesigning the category taxonomy.
- Building a general "manager decides what button a new service goes on" admin UI (that concern is captured as deferred, §11 Open Questions).
- Changing the preparation-delay-per-oil-service logic at [transaction.html:1259](web-app/transaction.html:1259) — Deep oil is still an oil service, still gets the 15-minute buffer.

---

## 3. Existing System Impact Analysis

### Existing Components Affected
- **[web-app/transaction.html](web-app/transaction.html)** — the New Customer intake page. Sections modified:
  - `renderServiceButtons` ([L966-1020](web-app/transaction.html:966)) — the branch that decides whether to open a sub-panel or auto-select.
  - `getPreferredCategoryService` ([L898-906](web-app/transaction.html:898)) — becomes single-variant-only fallback, or is deleted.
  - The `combo-service-panel` markup ([L140-143](web-app/transaction.html:140)) — either renamed/generalized, or a sibling panel is added with an id like `variant-service-panel`.
  - `updateServiceButtonState` ([L1022-1034](web-app/transaction.html:1022)) — must hide/show the sub-panel by the same "≥2 services in this category" rule instead of "category === combo".

### Components Explicitly Unaffected
- `web-app/admin-services.html` — no change.
- `web-app/shared.js` service loader — no change.
- `web-app/api.js` service wrappers — no change.
- `backend/routes/services.js` and `backend/routes/services.js.md` — no change.
- All non-New-Customer reception pages.
- The `services` DB table — no schema change, no data change.

### Regression Risks
- **Combo sub-panel breakage.** Cause: if the combo panel is renamed/generalized rather than duplicated, a mistake could hide it or double-render it. Impact: reception cannot pick combo services (functional regression on a working flow). Mitigation: keep the combo panel dedicated *or* apply the same generalized rule to it; either way, a smoke test on the combo flow is part of AC-004.
- **Category with only one variant now shows an empty sub-panel.** Cause: if the "open sub-panel" trigger is written incorrectly (e.g. always on click), single-variant categories would open a panel with one button, adding an extra tap for no reason. Impact: minor UX regression on Thai/Foot/Shoulder/Coconut/Scrub. Mitigation: strict guard — sub-panel opens only when `servicesByCategory[key].length > 1`; AC-002 asserts single-variant categories keep one-tap behavior.
- **Active-state visual inconsistency.** Cause: the current code sets active state on the category button and on the selected sub-button (combo pattern). If the new render loop does not preserve this, the highlighted state may be lost when switching between variants. Mitigation: `updateServiceButtonState` reuses the existing `setActiveChoice` helper for both category and sub-button containers; AC-005 asserts both remain visibly active.
- **Preferred-service map became dead code and misleading.** Cause: `getPreferredCategoryService`'s `preferredServiceNames.oil = 'Oil massage'` will never fire after this change. Impact: a future reader might extend the map and be confused when it does nothing. Mitigation: delete `getPreferredCategoryService` and `preferredServiceNames` entirely; the single-variant path can inline `servicesByCategory[key][0]`.

---

## 4. Integration Architecture

### Upstream Dependencies
- `GET /api/services` (unchanged) — supplies the catalog rows already containing Deep oil (id 127) and Deep aroma.
- `web-app/shared.js` `CONFIG.settings.services` populator (unchanged).

### Downstream Dependencies
- The hidden `<select id="service">` element ([transaction.html:144](web-app/transaction.html:144)) — sub-buttons must call `selectServiceValue(name)` which sets `.value` and dispatches `change`, identical to today's flow. Duration/price/staff logic downstream of `change` is unchanged.

### Contracts
No API, event, queue, or schema contract changes. Only intra-file DOM/JS changes to `transaction.html`.

---

## 5. Functional Requirements

### FR-001 — Sub-panel opens on click for multi-variant categories
**Description.** When reception taps a category button whose category resolves to two or more distinct service names for the current location, a sub-panel appears below the category grid containing one button per service in that category. Reception must then tap one of the sub-buttons to select a specific service; the category tap alone does not select any service.

**Trigger.** Click on a category button in `#service-category-buttons`.

**Processing logic.**
1. Compute `servicesForCategory = servicesByCategory[categoryKey]` (already computed by `renderServiceButtons`).
2. If `servicesForCategory.length >= 2`: reveal the sub-panel, render one button per service (label = service name via `getServiceDisplayName`), set the category button's active state, and do **not** call `selectServiceValue`. Wait for a sub-button tap.
3. If `servicesForCategory.length === 1`: hide the sub-panel and call `selectServiceValue(servicesForCategory[0])` — today's one-tap behavior.
4. The `combo` category continues to open the sub-panel by the same rule (it always has ≥2 combo services in the current catalog, so behavior is identical to today).

**Outputs.** DOM: sub-panel toggled visible/hidden, one sub-button per service in the multi-variant case. State: hidden `<select id="service">.value` populated only when a sub-button is tapped (or when the single-variant path fires).

**Failure modes.**
- If a category button is tapped for a category with zero services (should never happen because `renderServiceButtons` filters to `if (!servicesByCategory[definition.key]?.length) return`), the click handler is not attached in the first place. No user-visible failure.

**Edge cases.**
- **Location switch clears selection.** When the user changes location, `updateServiceOptions` re-populates the catalog and re-renders category buttons; the sub-panel must reset to hidden. This is already handled implicitly because `renderServiceButtons` re-runs and today's `combo` panel already resets — the same reset applies.
- **Re-tap the same category.** Tapping the currently active multi-variant category should keep the sub-panel open with the same buttons (idempotent). Tapping a different category hides the previous category's sub-panel and shows the new one's (or hides sub-panel entirely for a single-variant category).

### FR-002 — Sub-button selection populates the service select
**Description.** Tapping a sub-button selects that specific service.

**Trigger.** Click on a button in the sub-panel.

**Processing logic.** Call `selectServiceValue(serviceName)`, which sets `<select id="service">.value` and dispatches `change` — identical to today's `combo` sub-button behavior at [transaction.html:1015](web-app/transaction.html:1015).

**Outputs.** Hidden service select updated; duration options re-populate; price/preparation-buffer logic runs on the selected service.

**Failure modes / edge cases.** None new — this reuses the existing `selectServiceValue` path, whose failure modes are already handled.

### FR-003 — Active state reflects both category and specific variant
**Description.** When a specific variant is selected, the category button and the sub-button both display the active state (matching today's combo behavior).

**Processing logic.** `updateServiceButtonState` sets `.is-active` on the category button whose key equals `getServiceCategory(serviceSelect.value)`, and on the sub-button whose `data-service-value` equals `serviceSelect.value`. The sub-panel remains visible for multi-variant categories.

### FR-004 — Sub-panel title label
**Description.** The sub-panel carries a short Thai title so reception knows what they are choosing.

**Processing logic.** Default (Inferred, see §11): reuse a single label — the existing "เลือกคอมโบ" for combo, and either "เลือกบริการ" (choose service) for every other multi-variant category, or a per-category label such as "เลือกออยล์" / "เลือกอโรม่า". If a single sub-panel element is used for all categories, the title text is set dynamically at open time.

### FR-005 — Sub-button ordering
**Description.** Sub-buttons within a category appear in a stable, predictable order.

**Processing logic.** Default (Inferred, see §11): the regular service first, the "deep" variant second — implemented as: sort by whether the service name starts with "Deep " (deep last), tie-broken by alphabetical order. For combo, keep the existing `sortComboServices` order.

---

## 6. Data Model Changes
None. `services` table unchanged. No new columns, no new rows required (Deep oil and Deep aroma are already in the table).

---

## 7. State Transitions
Not applicable — this is a stateless UI render change.

---

## 8. Operational Considerations
- **Logging.** None. Existing `console.log` at the pricing step ([transaction.html:1260](web-app/transaction.html:1260)) already logs whether a service is an oil service; Deep oil, being oil, will log the same.
- **Metrics / monitoring / alerting.** None.
- **Performance.** Sub-panel rendering is O(n) over ≤ ~5 services per category, on click; no measurable impact.
- **Security.** None — no auth or authorization surface changes.
- **Permission changes.** None.

---

## 9. Rollout Plan
- **Deployment strategy.** Standard: commit to the working branch, live-verify on the intake page (walk through both Oil and Aroma flows with Deep variants selected), then a numbered publish via `/push` when the operator is ready.
- **Migration strategy.** None — no data migration.
- **Feature flag.** None — this is a small, well-scoped UI fix with a low regression surface.
- **Rollback.** Revert the one commit that touches `transaction.html`.
- **Backward compatibility.** N/A — no external consumers of this page's internal JS.

---

## 10. Testing Requirements

### Manual live-verify (primary, matches how this repo ships intake changes)
1. Load the New Customer page as reception; confirm the eight category buttons render.
2. Tap **Oil** — the sub-panel appears with **Oil massage** and **Deep oil** buttons.
3. Tap **Deep oil** — the hidden service select shows "Deep oil", duration options populate for Deep oil, price shows the Deep oil price, staff selector and preparation-buffer logic proceed as today.
4. Tap **Aroma** — the sub-panel appears with **Aroma massage** and **Deep aroma** buttons; select Deep aroma; verify same flow.
5. Tap **Thai** (single-variant) — the service select is populated on that single tap (no sub-panel).
6. Tap **Combo** — the existing combo sub-panel opens with every combo button (no regression).
7. Change location to Home Service — verify categories with only one variant at that location behave correctly.

### Unit / integration tests
The intake page has minimal automated coverage today (search under `__tests__/` and `tests/`); this feature does not warrant adding a first test harness. Manual live-verify is the ship gate for this repo's intake page (see the `paid-time-extension` steps precedent).

### Regression tests
Verified in steps (5)–(6) above. The combo flow is the highest-risk regression surface.

---

## 11. Risks and Assumptions

### Assumptions
**Documented (from repo code + this session's CFEP):**
- `CONFIG.settings.services` already contains Deep oil and Deep aroma end-to-end — [shared.js:232](web-app/shared.js:232) + the operator's screenshot showing Deep oil id 127.
- Only the `combo` category currently has >1 service, so today's behavior is preserved for every existing single-variant category — [transaction.html:987-1006](web-app/transaction.html:987).
- The hidden `<select id="service">` and its `change` event are the single interface downstream logic depends on — [transaction.html:925-931](web-app/transaction.html:925).

**User Confirmed (this session):**
- Sub-buttons under Oil / Aroma is the desired UX ("It should be automatically opened. In the case that I click Oil on the Oil button, it should open the option of those two services. So they're like sub buttons").
- Deep oil and Deep aroma exist in the DB; the fix is display-only.
- The immediate goal is to make Deep oil / Deep aroma visible; broader admin-side routing is deferred.

**Inferred (defaults chosen — redirect if wrong):**
- Sub-button ordering: regular first, Deep second (FR-005).
- Sub-panel label: single "เลือกบริการ" for non-combo categories, or per-category — implementer's call at build time unless the operator prefers one form; the ambiguity is low-stakes and both are legible Thai.
- No Thai-hint dictionary entries for "Deep oil" / "Deep aroma" — buttons render the raw English name. Adding hints is trivial and can happen alongside if the operator wants; not required for the feature.

### Risks
- **Combo sub-panel regression.** Cause: refactoring the sub-panel from combo-specific to general. Impact: reception cannot pick combos. Mitigation: manual live-verify step (6); if regression risk feels high, add a sibling `variant-service-panel` element and leave `combo-service-panel` untouched (two panels, mutually exclusive by visibility rule).
- **Missing Thai hint for Deep oil / Deep aroma.** Cause: `getServiceDisplayName` returns the raw name if no hint exists. Impact: sub-buttons show "Deep oil" / "Deep aroma" in English instead of the Thai-first pattern the other buttons follow. Mitigation: acceptable for shipping (matches admin page); a later Thai-hint patch is trivial. Not blocking.
- **Category taxonomy remains hardcoded.** Cause: `serviceCategoryDefinitions` still matches by substring in code. Impact: if the manager adds a new service whose name does not match any existing substring rule, it silently falls into `combo`. Mitigation: this is the pre-existing state of the world, and the deferred Open Question below is the long-term fix. This spec does not make the risk worse.

### Open Questions
- **Manager-side routing for new services (DEFERRED, per operator).** When the manager adds a new service via the admin Services page, the intake page must know which category button it belongs to. Today this is decided by substring match on the service name (`serviceCategoryDefinitions[*].match`), which silently defaults to `combo` for anything unrecognized. This works by coincidence for Deep oil / Deep aroma (they contain "oil" / "aroma"), but a service named e.g. "Herbal ball only" would land in `combo`. **Question to answer in a future spec:** should the `services` table carry an explicit `category` column (or a small routing table maintained in the admin UI), and should the admin form prompt the manager for a category at add-time? This is a separate feature; do NOT do it now. Recorded here so the concern is not lost.
- **Thai-hint dictionary entries for Deep oil / Deep aroma.** Nice-to-have; not blocking. Can be included in the same commit if the operator wants (one-line addition to `thaiHints` at [transaction.html:832](web-app/transaction.html:832)).

*Both are precisely phrasable; neither blocks this spec.*

---

## 12. Acceptance Criteria

- **AC-001.** On the New Customer page at `In-Shop` location, tapping the **Oil** category button reveals a sub-panel containing exactly two buttons — one labeled with **Oil massage** and one labeled with **Deep oil** — and does not populate `<select id="service">` on the category tap alone.
- **AC-002.** Tapping the **Deep oil** sub-button sets `<select id="service">.value` to `"Deep oil"`, fires the `change` event, populates the duration options for Deep oil from `CONFIG.settings.services`, and updates the displayed price to the Deep oil catalog price for the selected duration.
- **AC-003.** On the New Customer page, tapping the **Aroma** category button reveals a sub-panel containing exactly two buttons — **Aroma massage** and **Deep aroma** — and tapping **Deep aroma** selects it with the same downstream behavior as AC-002.
- **AC-004.** Tapping any single-variant category (Thai, Foot, Shoulder, Coconut, Scrub) still populates `<select id="service">` on the single tap, with no sub-panel visible — the existing one-tap behavior is preserved.
- **AC-005.** After a sub-button is selected, both the category button and the selected sub-button carry the `is-active` class (visual active state), matching today's combo behavior.
- **AC-006.** Tapping the **Combo** category button still opens the existing combo sub-panel, and every combo service is selectable exactly as today.
- **AC-007.** The following files are byte-identical to before this feature: `web-app/shared.js`, `web-app/admin-services.html`, `web-app/api.js`, `backend/routes/services.js`, `backend/routes/services.js.md`, and everything under `backend/routes/`, `backend/migrations/`, `backend/db/`. Grep-verifiable via `git diff --name-only main..HEAD`. The permitted change surface is exactly: `web-app/transaction.html`, `web-app/transaction.ejs` (parallel mirror), `web-app/transaction.html.md` (co-located doc), `__tests__/transaction.oil-category-promotion.present.test.js` (contract test rewritten to pin the new behavior), and `__tests__/transaction.oil-category-promotion.present.test.md` (its co-located doc). No other files may appear in the diff.
- **AC-008.** The rewritten contract test at `__tests__/transaction.oil-category-promotion.present.test.js` passes, and it now asserts the new behavior: both `transaction.html` and `transaction.ejs` (a) no longer contain the string `"oil: 'Oil massage'"`, (b) no longer contain `function getPreferredCategoryService`, and (c) do contain a sub-panel branch that renders one button per service when the category resolves to ≥2 services. The `test.each(templates)` cross-file assertion continues to enforce html/ejs parity.
