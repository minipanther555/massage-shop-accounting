# `web-app/admin-payment-types.html`

## 1. Header Section

**Overall Purpose:** `admin-payment-types.html` renders the manager Payment Types page. It lets managers list active payment methods, create a new method, edit an existing method name/description/active flag, and permanently delete a payment method after confirmation.

**End-to-End Data Flow:** On page load, `loadPaymentTypes()` calls `api.getPaymentTypes()`, which sends `GET /api/payment-types` through `web-app/api.js`. `backend/routes/payment-types.js` reads active rows from `payment_methods` and returns them ordered by name. Form submission calls `api.createPaymentType()` or `api.updatePaymentType()`; delete confirmation calls `api.deletePaymentType()`. The backend validates names, writes `payment_methods`, and the page reloads the authoritative list after each successful mutation.

## 2. Module API & Logic Breakdown

### `loadPaymentTypes()`

- **Purpose:** Load active payment methods from the backend.
- **Parameters / Props:** None.
- **Returns / Renders:** Updates `currentPaymentTypes` and calls `displayPaymentTypes()`.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** Uses the shared `api` instance so non-GET requests elsewhere on the page share CSRF behavior.

### `displayPaymentTypes()`

- **Purpose:** Render active payment method cards.
- **Parameters / Props:** Reads `currentPaymentTypes`.
- **Returns / Renders:** Cards in `#payment-types-grid`.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Method names and descriptions are database strings and must be escaped with `escapePaymentTypeHtml()` before entering `innerHTML`.

### `showAddModal()`, `editPaymentType(id)`, `closeModal()`

- **Purpose:** Open/close the add/edit modal and prefill edit fields.
- **Parameters / Props:** `id`, numeric `payment_methods.id` for editing.
- **Returns / Renders:** Mutates modal form state.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** The active checkbox is shown only in edit mode because new payment types are created active.

### `deletePaymentType(id)`, `closeDeleteModal()`, `confirmDelete()`

- **Purpose:** Confirm and permanently delete a payment method row.
- **Parameters / Props:** `id`, numeric `payment_methods.id`.
- **Returns / Renders:** `confirmDelete()` calls `api.deletePaymentType()`, closes the modal, and reloads the list.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** The backend currently hard-deletes from `payment_methods`.

### `payment-type-form` submit handler

- **Purpose:** Create or update a payment method row.
- **Parameters / Props:** Reads `method-name`, `description`, and edit-mode `active`.
- **Returns / Renders:** Calls `api.createPaymentType()` or `api.updatePaymentType()`, closes the modal, and reloads the list.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** Backend uniqueness is by `method_name`.

### `escapePaymentTypeHtml(value)`

- **Purpose:** Escape payment method strings before HTML interpolation.
- **Parameters / Props:** `value`, any scalar value.
- **Returns / Renders:** Escaped string.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Use this helper for any new database-provided payment method field rendered through `innerHTML`.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** `backend/routes/admin.js` serves the page at `GET /api/admin/payment-types-page`; browser events invoke page functions.
- **Input Data Contracts / Schemas:** Payment method rows contain `id`, `method_name`, `description`, `active`, `created_at`, and `updated_at`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** `web-app/api.js` payment type methods.
- **Output Data Contracts / Schemas:** `GET /api/payment-types` returns active payment methods; `POST /api/payment-types` and `PUT /api/payment-types/:id` return created/updated rows; `DELETE /api/payment-types/:id` returns a confirmation object.

## 4. Bug & Resolution History

- **Bug Summary:** The page used raw `fetch` for the list, local `new APIClient()` calls for mutations, and unescaped payment method strings in card templates.
- **Validated Hypothesis:** Source inspection found direct `/api/payment-types` access and raw `${paymentType.method_name}` / `${paymentType.description}` interpolation.
- **Invalidated Hypotheses:** Backend payment type routes were present and manager-gated.
- **Resolution:** Added shared API wrappers, moved the page to the shared `api` instance, escaped rendered payment strings, and added `__tests__/admin-payment-types.contract.present.test.js`.
