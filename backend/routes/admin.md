# `backend/routes/admin.js`

## 1. Header Section

**Overall Purpose:** `admin.js` serves manager-only admin pages and exposes manager-only staff/payday administration APIs. It gates every route with authenticated-session and manager-role middleware, injects CSRF tokens into served admin HTML pages, and provides staff, payment, outstanding-fee, performance, and ranking endpoints backed by SQLite tables.

**End-to-End Data Flow:** A manager navigates to an admin page such as `/api/admin/staff-page` or `/api/admin/users-page`. `backend/server.js` mounts this router at `/api/admin`; the router first runs `authenticateToken` and `authorizeRole('manager')`. Page routes read the matching `web-app/admin-*.html` file, replace the CSRF token placeholder, and send HTML. Data routes receive browser requests from `web-app/api.js` or page scripts, query or mutate SQLite through `backend/models/database.js`, and return JSON.

## 2. Module API & Logic Breakdown

### Page Routes
- **Purpose:** Serve manager-only HTML pages for payday tracking, service pricing, reports, payment types, and user inventory.
- **Parameters / Props:** Authenticated manager request; no required body.
- **Returns / Renders:** HTML with CSRF placeholder replacement.
- **Raises / Throws:** HTTP 500 if the page file cannot be read.
- **Usage & Logic Notes:** Routes: `GET /staff-page`, `GET /services-page`, `GET /reports-page`, `GET /payment-types-page`, `GET /users-page`.

### `GET /staff`
- **Purpose:** Return active staff with payday/outstanding/performance summary fields.
- **Parameters / Props:** Authenticated manager request.
- **Returns / Renders:** `{ staff, summary }`.
- **Raises / Throws:** HTTP 500 on database failures.
- **Usage & Logic Notes:** Reads `staff` and current transaction aggregates.

### `POST /staff`
- **Purpose:** Add a new active All Staff record.
- **Parameters / Props:** Staff payload from the admin staff page.
- **Returns / Renders:** Created staff row.
- **Raises / Throws:** HTTP 400/500 for invalid input or database failure.

### `PUT /staff/:id`
- **Purpose:** Update an existing staff record.
- **Parameters / Props:** Staff ID path parameter and editable staff fields.
- **Returns / Renders:** Updated staff row.
- **Raises / Throws:** HTTP 404/500 for absent staff or database failure.

### `DELETE /staff/:id`
- **Purpose:** Remove/deactivate a staff record when backend constraints allow it.
- **Parameters / Props:** Staff ID path parameter.
- **Returns / Renders:** Confirmation payload.
- **Raises / Throws:** Rejects staff with outstanding balance; HTTP 404/500 for absent staff or database failure.

### `GET /staff/:id/payments`
- **Purpose:** Return payment history for one staff member.
- **Parameters / Props:** Staff ID path parameter.
- **Returns / Renders:** Array of `staff_payments` rows.
- **Raises / Throws:** HTTP 500 on database failure.

### `POST /staff/:id/payments`
- **Purpose:** Record a staff payment and update staff paid/last-payment fields.
- **Parameters / Props:** Staff ID path parameter and payment body.
- **Returns / Renders:** Confirmation with updated outstanding balance.
- **Raises / Throws:** HTTP 400/404/500 for invalid payment, absent staff, or database failure.

### `GET /staff/outstanding-fees`
- **Purpose:** Return staff with unpaid earned fees.
- **Parameters / Props:** Authenticated manager request.
- **Returns / Renders:** `{ outstanding_fees, total_outstanding, staff_count }`.
- **Raises / Throws:** HTTP 500 on database failure.

### `GET /staff/performance`
- **Purpose:** Return staff performance for a selected period.
- **Parameters / Props:** Optional `period` query.
- **Returns / Renders:** `{ performance, period }`.
- **Raises / Throws:** HTTP 500 on database failure.

### `GET /staff/rankings`
- **Purpose:** Return staff rankings based on transaction and fee aggregates.
- **Parameters / Props:** Authenticated manager request.
- **Returns / Renders:** Array of ranking rows.
- **Raises / Throws:** HTTP 500 on database failure.

## 3. Dependency Mapping

### Upstream Dependencies
- **Calling Modules/Services:** `backend/server.js`, admin HTML pages, `web-app/api.js`.
- **Input Data Contracts / Schemas:** Session cookie, CSRF token for mutations, staff payloads, payment payloads, and query/path parameters.

### Downstream Dependencies
- **Called Modules/Services:** `backend/models/database.js`, `backend/middleware/auth.js`.
- **Output Data Contracts / Schemas:** Admin HTML pages, staff summary payloads, staff payment rows, outstanding-fee payloads, performance/ranking rows.

## 4. Bug & Resolution History

### Missing Users Page Route (2026-07-14)
- **Bug Summary:** `admin-users.html` linked to `/api/admin/users-page`, but the admin router did not serve that page.
- **Validated Hypothesis:** The router had page routes for staff, services, reports, and payment types only.
- **Resolution:** Added `GET /users-page` with the same manager-only CSRF-injected page-serving contract.

