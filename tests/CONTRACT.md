# Test Suite Contract

This document outlines the mandatory contract for all tests in this repository.

## 1. Testing Tiers & Patterns

-   **Unit Tests (`/tests/unit`):** Test pure functions or classes in complete isolation. All external dependencies (modules, APIs, database) **MUST** be mocked.
-   **Integration Tests (`/tests/integration`):** Test the interaction between modules against a live, containerized server.
    -   All integration tests **MUST** make real HTTP requests to the running server (`http://localhost:3000`).
    -   Tests **MUST NOT** import the `app` object from `backend/server.js`. The `supertest(app)` pattern is forbidden.
    -   Authentication and CSRF-protected requests **MUST** use the dedicated helpers.
-   **End-to-End Tests (`/tests/e2e`):** Test full user flows via browser automation.
    -   These tests **MUST** be written using Playwright.
    -   Jest **MUST** be configured to ignore the `/tests/e2e` directory.

## 2. CSRF Contract in Tests

-   Any test making a state-changing request (POST, PUT, DELETE, PATCH) to a protected route **MUST** use the `requestWithCsrf` helper (for Jest) or `postWithCsrf` (for Playwright).
-   These helpers correctly perform the `GET /csrf` flow to retrieve a token and attach it to the subsequent request.

## 3. Environment

-   All tests run against a Dockerized environment managed by `docker-compose.yml`.
-   The database is ephemeral and seeded for each test run where necessary.
