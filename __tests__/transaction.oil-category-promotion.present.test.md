# Oil / Aroma Sub-Button Presence Test Specification

## Overall Purpose
This permanent Jest source-contract test pins the New Customer intake page's Oil and Aroma category sub-button behavior across both mirrored templates (`transaction.html` and `transaction.ejs`). It prevents a regression back to the earlier auto-select-by-preferred-name behavior, which made secondary variants (Deep oil, Deep aroma) unreachable from the button UI.

## End-to-End Data Flow
The test reads both templates without mutating application state. It verifies (a) the two files still share the same button-layer contract via `test.each([html, ejs])`, and (b) three source-shape invariants that together make Deep oil and Deep aroma reachable:
1. The old auto-select strings (`"oil: 'Oil massage'"`, `getPreferredCategoryService`, `preferredServiceNames`) are absent.
2. The render loop's sub-panel branch uses a `.length >= 2` predicate — the general rule that surfaces every category with two or more variants, not just Combo.
3. `serviceCategoryDefinitions` orders `coconut` before `oil` so `Coconut lovers - coconut oil massage` (name contains both substrings) lands in Coconut, keeping the Oil sub-panel to exactly `Oil massage` + `Deep oil`.

The runtime behavior these strings enable is exercised by the temp JSDOM smoke `__tests__/temp_isvsb_smoke.test.js` during ISVSB-UI-001 and by manual live-verify in ISVSB-DEPLOY-001.

## Module API & Logic Breakdown

### Mirrored Oil / Aroma Sub-Button Contract
- **Parameters:** each transaction template path (`transaction.html`, `transaction.ejs`).
- **Returns:** Jest pass/fail across three assertion groups — auto-select removed, sub-panel branch present, Coconut precedes Oil.
- **Throws:** assertion failure if a template regresses to the pre-ISVSB behavior, or if the two files drift apart in the pinned invariants.

## Dependency Mapping

### Upstream Dependencies
- `web-app/transaction.html` and `web-app/transaction.ejs` — the two mirrored intake templates; the `<script>` block hosting `renderServiceButtons`, `openVariantPanel`, `serviceCategoryDefinitions`, `sortVariantServices`.
- Active service catalog served by `GET /api/services` — supplies `Deep oil`, `Deep aroma`, and `Coconut lovers - coconut oil massage` at runtime.

### Downstream Dependencies
- `POST /api/transactions/quote` — exact service-name lookup still receives the specific variant (e.g. `Deep oil`) via `selectServiceValue()`, so promotion pricing continues to work per exact catalog row.
- `time_window_promotion_prices` — Oil promotion rows still apply to `Oil massage` only; Deep oil carries its own catalog price.

## Bug & Resolution History

### Oil Category Selected Coconut Instead of Oil Massage (2026-07-22)
- **Bug Summary:** Branch-43 reception selected Oil and saw ฿700/฿1000/฿1300 base prices during the active promotion window.
- **Validated Hypothesis:** First-item category selection resolved `Coconut lovers - coconut oil massage`, not the promoted `Oil massage` row.
- **Invalidated Hypotheses:** Missing promotion data, disabled branch setting, or a Home Service-only issue.
- **Resolution:** Added the explicit exact Oil massage category preference (`preferredServiceNames.oil = 'Oil massage'`) via `getPreferredCategoryService()`, and this permanent mirrored-template guard pinned all three strings.

### Deep Oil and Deep Aroma Not Reachable From Intake Buttons (2026-08-09, ISVSB-UI-001)
- **Bug Summary:** Manager added `Deep oil` and `Deep aroma` via the admin Services page. Both persisted to the `services` table and flowed end-to-end into `CONFIG.settings.services`, but neither surfaced on the New Customer page: the Oil / Aroma category buttons auto-selected `Oil massage` / `Aroma massage` because the previous fix hardcoded a single preferred service per category.
- **Validated Hypothesis:** The `getPreferredCategoryService` bottleneck was terminal for every non-Combo category with more than one service in the catalog.
- **Resolution:** Removed `getPreferredCategoryService()` and `preferredServiceNames`. Generalized the existing combo sub-panel pattern via `openVariantPanel()`; any category resolving to `.length >= 2` services now opens the sub-panel on tap. Reordered `serviceCategoryDefinitions` so `coconut` precedes `oil` (fixes the underlying promotion bug at its root — `Coconut lovers - coconut oil massage` now lands in Coconut and never enters the Oil group). This test was rewritten to pin the new contract; the old three `expect(source).toContain(...)` assertions on the removed strings were replaced with `not.toContain` / `not.toMatch` assertions, a `.length >= 2` presence check, and a `coconutIdx < oilIdx` positional assertion.
