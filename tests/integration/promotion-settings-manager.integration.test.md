# `promotion-settings-manager.integration.test.js`

## Overall Purpose

This permanent integration test verifies manager-only, branch-local time-window promotion configuration through the real Express authentication, request-scoped database routing, and services route stack.

## End-to-End Data Flow

The test signs in Top Thai 43 and Top Thai 49 managers, requests `/api/services/promotion-settings`, changes only the 43 row, and proves the 49 row remains unchanged. It also signs in a 43 reception user and proves that role cannot read or write the settings endpoint.

## Coverage

- Branch 43 first-use default is enabled from 10:00 through `24:00` (`1440`).
- Branch 49 first-use default is enabled from 10:00 through 18:00 (`1080`).
- A manager writes only the database selected by their authenticated branch session.
- Reception receives `403` for both read and write routes.

## Dependencies

- `backend/server.js` mounts authenticated request routing.
- `backend/routes/services.js` owns the manager-only endpoints.
- `backend/models/database.js` provisions branch-local defaults for isolated test files.
