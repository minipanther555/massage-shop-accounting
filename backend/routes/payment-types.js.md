# `backend/routes/payment-types.js`

## 1. Header Section

**Overall Purpose:** This Express router owns manager payment type administration and the active payment-method list. It reads and writes the `payment_methods` table used by transaction payment dropdowns and manager payment type cards.

**End-to-End Data Flow:** The Payment Types page calls `GET /api/payment-types` to read active rows from `payment_methods`. Manager write actions call POST, PUT, or DELETE routes behind `authenticateToken` and `authorizeRole('manager')`. The router validates required names, checks duplicate names, inserts/updates/deletes rows, and returns the authoritative row or confirmation.

## 2. Module API & Logic Breakdown

### `GET /`

- **Purpose:** Return active payment methods.
- **Parameters / Props:** None.
- **Returns / Renders:** JSON array ordered by `method_name`.
- **Raises / Throws:** Returns 500 on database failure.
- **Usage & Logic Notes:** This read endpoint is used by both admin list UI and transaction payment dropdown readers.

### `POST /`

- **Purpose:** Create one payment method.
- **Parameters / Props:** Body `{ method_name, description? }`.
- **Returns / Renders:** Created payment method row.
- **Raises / Throws:** Returns 400 for missing name, 409 for duplicate name, 500 on database failure.
- **Usage & Logic Notes:** Requires manager authentication and creates rows as active.

### `PUT /:id`

- **Purpose:** Update one payment method row.
- **Parameters / Props:** `id` path parameter and body `{ method_name, description?, active? }`.
- **Returns / Renders:** Updated payment method row.
- **Raises / Throws:** Returns 400 for missing name, 404 when absent, 409 for duplicate name, 500 on database failure.
- **Usage & Logic Notes:** Requires manager authentication; inactive rows drop out of `GET /` because it returns only active methods.

### `DELETE /:id`

- **Purpose:** Permanently delete one payment method row.
- **Parameters / Props:** `id` path parameter.
- **Returns / Renders:** Confirmation object.
- **Raises / Throws:** Returns 404 when absent, 500 on database failure.
- **Usage & Logic Notes:** Requires manager authentication; this is currently hard delete, not soft deactivate.

### `GET /:id`

- **Purpose:** Return one payment method row.
- **Parameters / Props:** `id` path parameter.
- **Returns / Renders:** Payment method row.
- **Raises / Throws:** Returns 404 when absent, 500 on database failure.
- **Usage & Logic Notes:** This endpoint is read-only and does not require manager auth.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** `web-app/admin-payment-types.html`, `web-app/api.js`, transaction payment dropdown code.
- **Input Data Contracts / Schemas:** Payment method body `{ method_name, description, active }`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** `backend/models/database.js`.
- **Output Data Contracts / Schemas:** Rows from `payment_methods` and delete confirmation objects.

## 4. Bug & Resolution History

- **Bug Summary:** The frontend Payment Types page did not consistently use shared API wrappers and escaped rendering, making it easier for UI behavior to drift from the backend contract.
- **Validated Hypothesis:** Backend routes existed and were manager-gated, so the fix belonged in shared API wrappers and page code rather than new routes.
- **Invalidated Hypotheses:** POST/PUT/DELETE routes were not missing.
- **Resolution:** Documented the route contract and added `__tests__/admin-payment-types.contract.present.test.js`.
