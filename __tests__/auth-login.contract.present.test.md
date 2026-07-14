# `__tests__/auth-login.contract.present.test.js`

## 1. Header Section

**Overall Purpose:** This test guards the login/auth contract. It verifies that the login page still composes branch-scoped usernames from branch and role selections, that visible seed passwords stay out of the login page, that auth metadata returns the stored display name, and that development rate-limit bypasses are blocked in production.

**End-to-End Data Flow:** The test reads `web-app/login.html`, `backend/routes/auth.js`, `backend/middleware/rate-limiter.js`, and `backend/routes/auth.md` as source text. It asserts branch options, username composition, API login usage, production guards, display-name consistency, and documentation expectations.

## 2. Module API & Logic Breakdown

### Jest suite `login and auth contract`

- **Purpose:** Preserve login/auth behavior discovered during the whole-app audit.
- **Parameters / Props:** None.
- **Returns / Renders:** Jest pass/fail result.
- **Raises / Throws:** Fails if branch login composition breaks, seed passwords reappear in the login UI, user-info regresses to username display, production reset/bypass guards are removed, or auth docs drift.
- **Usage & Logic Notes:** Static coverage complements in-process auth route tests.

## 3. Dependency Mapping

### Upstream Dependencies (Inputs)

- **Calling Modules/Services:** Jest test runner.
- **Input Data Contracts / Schemas:** Source text from login/auth/rate-limit files.

### Downstream Dependencies (Outputs)

- **Called Modules/Services:** Node filesystem APIs and Jest assertions.
- **Output Data Contracts / Schemas:** Test status.

## 4. Bug & Resolution History

- **Bug Summary:** `/api/auth/user-info` returned `displayName: session.username`, and the login rate-limit dev bypass was not production-gated at the skip predicate.
- **Validated Hypothesis:** Source inspection showed the wrong display field and `x-dev-bypass` skip without `NODE_ENV !== 'production'`.
- **Invalidated Hypotheses:** The branch login model itself was not missing; the page already composes `${role}_${branch}`.
- **Resolution:** Return `session.displayName`, gate reset/bypass paths in production, document the login page, and add this guard.
