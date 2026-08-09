# Variant Sub-Buttons Runtime Test Specification

## Overall Purpose
This permanent Jest test pins the runtime behavior of the New Customer intake page's category → variant sub-button flow (`renderServiceButtons`, `openVariantPanel`, click handlers). It complements the source-shape guard in `transaction.oil-category-promotion.present.test.js` by driving the real DOM through JSDOM and asserting what a reception tap actually produces.

## End-to-End Data Flow
The test loads `web-app/transaction.html` into a JSDOM window, extracts the button-layer functions from the inline `<script>` block, seeds the hidden `<select id="service">` with a representative service fixture (including `Oil massage`, `Deep oil`, `Aroma massage`, `Deep aroma`, `Coconut lovers - coconut oil massage`, and two combos), invokes `renderServiceButtons()`, and simulates real click events on category and variant buttons. It reads back `#service.value`, sub-panel `hidden` state, and `is-active` class assignments.

The upstream data path (`GET /api/services` → `web-app/shared.js` → `CONFIG.settings.services` → hidden `<select id="service">`) is not exercised here; that continues to be smoke-checked by manual live-verify in ISVSB-DEPLOY-001. This test isolates the button layer.

## Module API & Logic Breakdown

### Runtime Assertions
- **Oil sub-panel content (AC-001):** tapping `[data-service-category="oil"]` renders exactly `Oil massage` + `Deep oil` sub-buttons in that order (regular first, `Deep …` last per `sortVariantServices`). `Coconut lovers - coconut oil massage` does NOT appear, verifying that `coconut` precedes `oil` in `serviceCategoryDefinitions`.
- **Aroma sub-panel content (AC-003):** tapping `[data-service-category="aroma"]` renders exactly `Aroma massage` + `Deep aroma`.
- **Deep sub-button selection (AC-002, FR-002):** tapping the `Deep oil` sub-button sets `#service.value === 'Deep oil'` and dispatches exactly one `change` event.
- **Single-variant one-tap (AC-004):** tapping `[data-service-category="thai"]` selects `Thai Massage` on the single tap without opening the sub-panel.
- **Coconut button visibility (bonus, ISVSB Discovery 2026-08-09):** the Coconut category button renders and single-taps `Coconut lovers - coconut oil massage`. Before the ISVSB reorder, the Coconut button was hidden because its only service was being stolen by Oil.
- **Combo regression guard (AC-006):** the Combo category button still opens the sub-panel with combo services intact.
- **Active-state parity (AC-005, FR-003):** after variant selection, both `[data-service-category="oil"]` and `[data-service-value="Deep oil"]` carry `is-active`.

### Extraction Strategy
The test does NOT re-implement any button-layer logic. It extracts the target functions and constants (`serviceCategoryDefinitions`, `getServiceCategory`, `renderServiceButtons`, `openVariantPanel`, `sortVariantServices`, etc.) from the inline `<script>` block via a brace-balanced regex walk, and evaluates them in the JSDOM window scope. This means the same source code that runs in production runs here, minus the wider page setup (loadData, API calls, appData).

## Dependency Mapping

### Upstream Dependencies
- `web-app/transaction.html` — the file under test, read from disk.
- `jsdom` (dev dependency) — DOM environment.

### Downstream Dependencies
None. This test writes no files, hits no network, opens no server. It is safe to run in CI on any machine with the repo checked out.

## Fragility & Trade-off
The brace-balanced script extraction is regex-based; edits to transaction.html that reshape the target functions (e.g. converting `function renderServiceButtons() { … }` to an arrow function) will require this test's extraction to be updated. The alternative — losing runtime coverage until Playwright-based full-page tests exist for this page — is worse. Manual live-verify (ISVSB-DEPLOY-001) is the belt-and-braces backup, but a source read caught by JSDOM at unit-test speed is where regressions should be caught first.

## Bug & Resolution History

### Deep Oil / Deep Aroma Not Reachable From Intake Buttons (2026-08-09, ISVSB-UI-001)
- **Bug Summary:** Manager added `Deep oil` and `Deep aroma` via admin; both persisted to `services` and flowed into `CONFIG.settings.services`, but the New Customer buttons auto-selected the pre-existing `Oil massage` / `Aroma massage` variants and never surfaced the new ones.
- **Resolution:** Sub-panel pattern generalized from combo-only to any `.length >= 2` category; `serviceCategoryDefinitions` reordered so `coconut` precedes `oil`. This test was added at S12 (promoted from the S6a temp smoke) to guard the runtime behavior across future edits.
