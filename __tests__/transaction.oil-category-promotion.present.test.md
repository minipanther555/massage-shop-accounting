# Oil Category Promotion Presence Test Specification

## Overall Purpose
This permanent Jest source-contract test prevents the mirrored New Customer templates from treating incidental service catalog ordering as the meaning of the generic Oil category.

## End-to-End Data Flow
The test reads both templates without mutating application state. It verifies that tapping the Oil category resolves to exact active `Oil massage`, which then flows through the existing `POST /api/transactions/quote` contract to the exact Oil promotion row for the selected duration and location.

## Module API & Logic Breakdown

### Mirrored Oil Category Contract
- Parameters: each transaction template path.
- Returns: Jest pass/fail confirming the explicit `oil: 'Oil massage'` preference, the resolver function, and the category-button call site.
- Throws: assertion failure if a template returns to first-item-only category selection.

## Dependency Mapping

### Upstream Dependencies
- `web-app/transaction.html` and `web-app/transaction.ejs` category button rendering.
- Active service catalog values.

### Downstream Dependencies
- `POST /api/transactions/quote` exact service-name lookup.
- `time_window_promotion_prices` Oil massage rows.

## Bug & Resolution History

### Oil Category Selected Coconut Instead of Oil Massage (2026-07-22)
- Bug Summary: Branch-43 reception selected Oil and saw ฿700/฿1000/฿1300 base prices during the active promotion window.
- Validated Hypothesis: First-item category selection resolved `Coconut lovers - coconut oil massage`, not the promoted `Oil massage` row.
- Invalidated Hypotheses: Missing promotion data, disabled branch setting, or a Home Service-only issue.
- Resolution: Added the explicit exact Oil massage category preference and this permanent mirrored-template guard.
