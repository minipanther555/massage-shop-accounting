# `backend/routes/services.js`

## 1. Header Section

**Overall Purpose:** This Express router owns service catalog and payment-method catalog endpoints. It exposes read endpoints used by receptionist-facing service/payment dropdowns and manager endpoints used by Services and Pricing administration.

**End-to-End Data Flow:** Frontend pages call `/api/services` through `web-app/api.js` or direct read-only fetches. `GET /api/services` reads the `services` table, optionally including inactive rows for manager pages. `POST /api/services`, `PATCH /api/services/:id`, `PATCH /api/services/bulk/update`, and `DELETE /api/services/:id` validate input and write the `services` table. Payment-method endpoints read or insert rows in `payment_methods`.

## 2. Module API & Logic Breakdown

### `GET /`

- **Purpose:** Return service rows.
- **Parameters / Props:** Optional query `includeInactive=true`.
- **Returns / Renders:** JSON array of service rows ordered by `service_name`, then `duration_minutes`.
- **Raises / Throws:** Returns 500 on database failure.
- **Usage & Logic Notes:** Reception pages normally consume active rows; manager pages pass `includeInactive=true`.

### `GET /payment-methods`

- **Purpose:** Return active payment methods for transaction payment dropdowns.
- **Parameters / Props:** None.
- **Returns / Renders:** JSON array of active payment method rows ordered by `method_name`.
- **Raises / Throws:** Returns 500 on database failure.
- **Usage & Logic Notes:** Manager payment-type administration uses `backend/routes/payment-types.js`; this endpoint is the simple active-list reader.

### `GET /:id`

- **Purpose:** Return one service row by id.
- **Parameters / Props:** `id`, positive integer path parameter.
- **Returns / Renders:** JSON service row.
- **Raises / Throws:** Returns 400 for invalid id, 404 when absent, 500 on database failure.
- **Usage & Logic Notes:** Literal routes such as `/bulk/update` must be declared before parameterized id routes for matching methods.

### `POST /`

- **Purpose:** Create one service row.
- **Parameters / Props:** Body `{ service_name, duration_minutes, location, price, masseuse_fee, active? }`.
- **Returns / Renders:** Created service row.
- **Raises / Throws:** Returns 400 for missing/invalid data or uniqueness conflicts, 500 on database failure.
- **Usage & Logic Notes:** `location` must be `In-Shop` or `Home Service`; uniqueness is service name plus duration plus location.

### `PATCH /bulk/update`

- **Purpose:** Update price, masseuse fee, or active status across selected/filtered service rows.
- **Parameters / Props:** Body `{ serviceIds?, updates, filters? }`; `updates` may include `price`, `masseuse_fee`, or `active`, and numeric fields may use `multiply:<factor>`.
- **Returns / Renders:** `{ message, changes }`.
- **Raises / Throws:** Returns 400 for missing/invalid updates, 500 on database failure.
- **Usage & Logic Notes:** This route must appear before `PATCH /:id`; otherwise Express treats `/bulk/update` as `id="bulk"`.

### `PATCH /:id`

- **Purpose:** Update one service row.
- **Parameters / Props:** `id` path parameter and a body containing any of `service_name`, `duration_minutes`, `location`, `price`, `masseuse_fee`, `active`.
- **Returns / Renders:** Updated service row.
- **Raises / Throws:** Returns 400 for invalid id/data or uniqueness conflicts, 404 when absent, 500 on database failure.
- **Usage & Logic Notes:** This is used by edit and enable/disable controls on `admin-services.html`.

### `DELETE /:id`

- **Purpose:** Permanently delete one service row.
- **Parameters / Props:** `id`, positive integer path parameter.
- **Returns / Renders:** Confirmation object.
- **Raises / Throws:** Returns 400 for invalid id, 404 when absent, 500 on database failure.
- **Usage & Logic Notes:** This is currently hard delete; any future soft-delete rule must update the admin page contract.

### `POST /payment-methods`

- **Purpose:** Create a payment method row.
- **Parameters / Props:** Body `{ method_name }`.
- **Returns / Renders:** Created payment method row.
- **Raises / Throws:** Returns 400 for missing/duplicate method name, 500 on database failure.
- **Usage & Logic Notes:** This legacy endpoint overlaps with `backend/routes/payment-types.js`; new payment-type manager workflows should prefer the dedicated payment-types router.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** `web-app/api.js`, `web-app/admin-services.html`, New Customer/transaction service dropdown code, and payment dropdown code.
- **Input Data Contracts / Schemas:** Service write body `{ service_name, duration_minutes, location, price, masseuse_fee, active }`; bulk update body `{ serviceIds, updates, filters }`; payment method body `{ method_name }`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** `backend/models/database.js`.
- **Output Data Contracts / Schemas:** Rows from `services` and `payment_methods`; mutation confirmation objects.

## 4. Bug & Resolution History

- **Bug Summary:** `PATCH /bulk/update` was declared after `PATCH /:id`, so Express could route `/api/services/bulk/update` to the id route as `id="bulk"`.
- **Validated Hypothesis:** Source order showed the literal bulk route below the parameter route.
- **Invalidated Hypotheses:** The page-level edit/toggle route was not absent; `PATCH /:id` existed and handled single-service updates.
- **Resolution:** Moved `PATCH /bulk/update` above `PATCH /:id`, removed leftover debug logs, and added `__tests__/admin-services.contract.present.test.js`.
