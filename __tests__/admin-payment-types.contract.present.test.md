# `__tests__/admin-payment-types.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This test guards the manager-only Payment Types page contract. It verifies that the visible list and add/edit/delete controls use shared `api.js` wrappers, that payment method strings from the database are escaped before card rendering, and that backend payment type writes remain manager-gated.

**End-to-End Data Flow:** The test reads `web-app/admin-payment-types.html`, `web-app/api.js`, and `backend/routes/payment-types.js` as source text. It asserts that the page calls `api.getPaymentTypes()`, `api.createPaymentType()`, `api.updatePaymentType()`, and `api.deletePaymentType()`; that rendered method names and descriptions are escaped; and that POST/PUT/DELETE routes use `requireManagerAuth`.

## 2. Module API & Logic Breakdown

### Jest suite `admin payment types page API/database contract`

- **Purpose:** Preserve the Payment Types UI-to-database contract.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail result.
- **Raises / Throws:** Fails when the page drifts to raw fetch/local client construction, unsafe card rendering, missing API wrappers, or ungated backend writes.
- **Usage & Logic Notes:** Static contract coverage is intentionally narrow; browser checks can still verify modal visibility and end-to-end create/delete behavior.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** Jest test runner.
- **Input Data Contracts / Schemas:** Source text from `web-app/admin-payment-types.html`, `web-app/api.js`, and `backend/routes/payment-types.js`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** Node filesystem APIs and Jest assertions.
- **Output Data Contracts / Schemas:** Test status.

## 4. Bug & Resolution History

- **Bug Summary:** `admin-payment-types.html` loaded payment types with raw `fetch`, constructed a local `APIClient` for mutations, and interpolated payment method strings into `innerHTML`.
- **Validated Hypothesis:** Source inspection showed direct `/api/payment-types` access in page code and unescaped `${paymentType.method_name}` / `${paymentType.description}` templates.
- **Invalidated Hypotheses:** Backend payment type write routes were not missing; POST/PUT/DELETE routes already existed and were manager-gated.
- **Resolution:** Added shared API wrappers, switched the page to those wrappers, escaped payment type strings, documented the touched modules, and added this guard.
