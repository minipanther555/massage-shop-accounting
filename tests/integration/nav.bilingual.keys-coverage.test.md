# Navigation Bilingual Keys Coverage Test Specification

## Overall Purpose
This Jest integration test validates that navigation surfaces still provide Thai and English labels where navigation requires bilingual support. It deliberately excludes staff roster workflow buttons that are Thai-only by design.

## End-to-End Data Flow
Test runner reads configured HTML pages and `web-app/styles.css` → extracts nav/button markup → skips known utility/workflow controls → asserts navigation labels include `.label-th` and `.label-en` spans → verifies CSS still defines bilingual label classes and Thai-capable fonts.

## Module API & Logic Breakdown

### `each page has appropriate bilingual navigation elements`
- **Purpose:** Confirms each page still contains bilingual navigation markup.
- **Parameters:** None.
- **Returns:** Jest pass/fail.
- **Raises/Throws:** Assertion failure when expected label spans disappear.

### `no navigation buttons have missing or incomplete bilingual labels`
- **Purpose:** Guards real navigation buttons against incomplete bilingual markup.
- **Parameters:** None.
- **Returns:** Jest pass/fail.
- **Raises/Throws:** Assertion failure when a navigation button lacks Thai or English.
- **Usage & Logic Notes:** Staff roster primary workflow controls and roster modal utility buttons are skipped because the UX decision is Thai-only primary controls with optional English helper text outside the button.

### `pages do not render active navigation self-links`
- **Purpose:** Prevents self-reference navigation links from returning.
- **Parameters:** None.
- **Returns:** Jest pass/fail.

### `CSS classes are properly applied for bilingual layout`
- **Purpose:** Guards `.label-th`, `.label-en`, two-line nav sizing, and Thai font support.

## Dependency Mapping

### Upstream Dependencies (Inputs)
- Main HTML files in `web-app/`.
- `web-app/styles.css`.

### Downstream Dependencies (Outputs)
- Jest assertion result used as a frontend nav regression gate.

## Bug & Resolution History

### Bug Summary: Broad Button Scan Confused Workflow Buttons for Navigation
**Validated Hypothesis:** The test scanned all `.btn` elements, including Thai-only staff roster workflow controls.
**Resolution:** Added skips for `.staff-primary-action`, staff row buttons, staff modal utility buttons, roster clear/cancel/confirm modal buttons, and the Today Staff helper collapse/restore buttons while preserving bilingual checks for actual navigation.
