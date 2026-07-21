# `web-app/admin-services.html`

## 1. Header Section

**Overall Purpose:** `admin-services.html` renders the manager-only Services and Pricing page. It lets managers inspect active and inactive massage service rows, filter the catalog, add new service/duration/location variants, edit price and masseuse fee details, enable or disable services, delete services, and inspect the currently stored price details for a service.

**End-to-End Data Flow:** On page load, `loadServices()` calls `api.getServices({ includeInactive: true })`, which sends `GET /api/services?includeInactive=true` through `web-app/api.js`. `backend/routes/services.js` reads the `services` table and returns rows ordered by name and duration. In parallel, `loadPromotionSettings()` reads the authenticated manager's branch-local time-window configuration and renders its Thai-first controls. Add/edit/toggle/delete controls call `api.createService()`, `api.updateService()`, or `api.deleteService()`, which send CSRF-protected POST/PATCH/DELETE requests to `backend/routes/services.js`; `savePromotionSettings()` similarly sends a CSRF-protected manager-only update. After a successful mutation, the page updates its local state and visible success/error status.

## 2. Module API & Logic Breakdown

### `loadServices()`

- **Purpose:** Load all services, including inactive rows, for manager review.
- **Parameters / Props:** None.
- **Returns / Renders:** Populates `allServices`, `filteredServices`, summary cards, and the services table.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** Uses `api.getServices({ includeInactive: true })`; raw mutation fetches must not be reintroduced because non-GET writes require CSRF handling from `api.js`.

### `loadPromotionSettings()` and `savePromotionSettings(event)`

- **Purpose:** Render and persist the selected branch's promotion enabled state, start/end time, and reception grace period from the Services & Pricing page.
- **Parameters / Props:** `savePromotionSettings` receives the form submit event; all values come from the panel controls. `00:00` is converted to end minute `1440` only for the end field.
- **Returns / Renders:** Updates the branch label and status message; save disables its button during the request and shows a success or error state.
- **Raises / Throws:** Catches API validation, authentication, and network errors and renders a concise error.
- **Usage & Logic Notes:** The panel is manager-facing configuration, not a reception/New Customer control. It never sends a branch ID; server session context supplies it.

### `displayServices()`

- **Purpose:** Render filtered service rows and action buttons.
- **Parameters / Props:** Reads `filteredServices`.
- **Returns / Renders:** Rows under `#services-list`.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Database-provided strings must pass through `escapeServiceHtml()` before entering `innerHTML`.

### `filterServices()`

- **Purpose:** Apply name, location, duration, and massage-type filters against the loaded service rows.
- **Parameters / Props:** Reads filter controls.
- **Returns / Renders:** Updates `filteredServices` and rerenders the table.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Filtering is client-side after the authoritative service list has loaded from the backend.

### `openAddServiceModal()`, `closeServiceModal()`, `editService(serviceId)`

- **Purpose:** Open/close the add/edit modal and prefill edit fields from the selected service row.
- **Parameters / Props:** `serviceId` is the numeric service row id for edits.
- **Returns / Renders:** Mutates modal field values and visibility.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Service identity is the backend row id, so variants with the same service name but different duration/location remain distinct.

### `toggleServiceStatus(serviceId)`

- **Purpose:** Enable or disable a service row.
- **Parameters / Props:** `serviceId` numeric service row id.
- **Returns / Renders:** Calls `api.updateService(serviceId, { active })`, replaces the local row with the backend response, recomputes cards, and reapplies filters.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** This is a database update, not a local-only UI toggle.

### `viewPriceHistory(serviceId)` and `closePriceHistoryModal()`

- **Purpose:** Show the current stored price/fee details for a service.
- **Parameters / Props:** `serviceId` numeric service row id.
- **Returns / Renders:** Opens or closes `#priceHistoryModal`.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** The modal is not a historical audit table yet; it explicitly labels that price history tracking is future work.

### `deleteService(serviceId)`

- **Purpose:** Permanently delete a service row after confirmation.
- **Parameters / Props:** `serviceId` numeric service row id.
- **Returns / Renders:** Calls `api.deleteService(serviceId)`, removes the row locally, recomputes cards, and rerenders.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** The backend currently hard-deletes from `services`; any future soft-delete rule must update this page and doc together.

### `serviceForm` submit handler

- **Purpose:** Create a new service row or patch the selected service row.
- **Parameters / Props:** Reads modal form fields.
- **Returns / Renders:** Calls `api.createService()` or `api.updateService()`, then refreshes local state from the returned service row.
- **Raises / Throws:** Catches API errors and shows a toast.
- **Usage & Logic Notes:** The backend enforces service uniqueness by service name, duration, and location.

### `escapeServiceHtml(value)`

- **Purpose:** Escape database-provided service strings before template interpolation.
- **Parameters / Props:** `value`, any scalar value.
- **Returns / Renders:** Escaped string.
- **Raises / Throws:** None expected.
- **Usage & Logic Notes:** Use this helper for any new service, location, or free-text field rendered through `innerHTML`.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** `backend/routes/admin.js` serves the page at `GET /api/admin/services-page`; browser events invoke page functions.
- **Input Data Contracts / Schemas:** Service rows contain `id`, `service_name`, `duration_minutes`, `location`, `price`, `masseuse_fee`, `active`, and timestamp fields.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** `web-app/api.js` methods `getServices`, `createService`, `updateService`, and `deleteService`.
- **Output Data Contracts / Schemas:** `GET /api/services?includeInactive=true` returns service rows; `POST /api/services` and `PATCH /api/services/:id` return the created/updated service row; `DELETE /api/services/:id` returns a confirmation object.

## 4. Bug & Resolution History

- **Bug Summary:** The page used raw `fetch` for service mutations and interpolated service strings into `innerHTML` without escaping.
- **Validated Hypothesis:** Source inspection showed direct POST/PATCH/DELETE fetch calls to `/api/services` and unescaped `${service.service_name}` / `${service.location}` templates.
- **Invalidated Hypotheses:** The service edit/toggle endpoint was not missing; the backend already had `PATCH /api/services/:id`.
- **Resolution:** Added shared API client methods, moved service reads/mutations to `api.js`, escaped rendered service strings, and added `__tests__/admin-services.contract.present.test.js`.
