# `__tests__/admin-services.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This test guards the manager-only Services and Pricing page contract. It verifies that the page reads and mutates the real `services` table through the shared CSRF-aware API client, that service strings rendered into HTML templates are escaped, and that the backend services router registers the bulk update route before the parameterized service-id route.

**End-to-End Data Flow:** The test reads `web-app/admin-services.html`, `web-app/api.js`, and `backend/routes/services.js` as source text. It asserts that the UI calls `api.getServices({ includeInactive: true })`, `api.createService()`, `api.updateService()`, and `api.deleteService()` instead of raw mutation `fetch` calls; that the shared client exposes the matching wrappers; and that `PATCH /api/services/bulk/update` is reachable before `PATCH /api/services/:id`.

## 2. Module API & Logic Breakdown

### Jest suite `admin services page API/database contract`

- **Purpose:** Preserve the discovered Services and Pricing UI/database contract.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail result.
- **Raises / Throws:** Fails when the services page drifts back to raw mutation fetches, unsafe string rendering, missing API wrappers, or unreachable backend bulk route ordering.
- **Usage & Logic Notes:** This is a static contract test. It complements integration/browser checks by catching obvious route/client wiring regressions quickly.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** Jest test runner.
- **Input Data Contracts / Schemas:** Source text from `web-app/admin-services.html`, `web-app/api.js`, and `backend/routes/services.js`.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** Node filesystem APIs and Jest assertions.
- **Output Data Contracts / Schemas:** Test status.

## 4. Bug & Resolution History

- **Bug Summary:** `admin-services.html` used raw `fetch` for service POST/PATCH/DELETE mutations, directly interpolated service strings into `innerHTML`, and `backend/routes/services.js` declared `PATCH /bulk/update` after `PATCH /:id`, making the bulk route unreachable.
- **Validated Hypothesis:** Static source inspection showed the UI bypassed the CSRF-aware `api.js` client and the backend parameter route appeared before the literal bulk route.
- **Invalidated Hypotheses:** The edit/toggle route was not missing; `backend/routes/services.js` already had `PATCH /:id`.
- **Resolution:** Added shared API wrappers, moved service page mutations onto the shared client, escaped rendered service strings, moved `/bulk/update` before `/:id`, and added this guard.
