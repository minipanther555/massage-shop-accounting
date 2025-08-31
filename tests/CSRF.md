# CSRF Testing Guide

This document details how to properly test CSRF-protected endpoints in this application.

## 1. CSRF Flow

The application uses a **cookie-mode CSRF** implementation:

1.  **Client requests CSRF token:** `GET /csrf`
2.  **Server responds with:** `{ "token": "..." }` and sets `_csrf` cookie
3.  **Client makes protected request:** `POST /api/auth/login` with:
    -   `X-CSRF-Token: <token>` header
    -   `Cookie: _csrf=<secret>` (automatically managed by browser/helper)

## 2. Testing Helpers

### Jest Integration Tests

Use `tests/helpers/requestWithCsrf.js`:

```javascript
const { requestWithCsrf } = require('./helpers/requestWithCsrf');

// Example: Login test
const response = await requestWithCsrf({
  url: '/api/auth/login',
  method: 'POST',
  body: { username: 'manager', password: 'manager456' }
});
```

### Playwright E2E Tests

Use `tests/e2e/helpers/authFlow.ts`:

```typescript
import { postWithCsrf } from './helpers/authFlow';

// Example: Login test
const response = await postWithCsrf(page, '/api/auth/login', {
  username: 'manager',
  password: 'manager456'
});
```

## 3. Manual Testing (if needed)

```bash
# 1. Get CSRF token
curl -c cookies.txt http://localhost:3000/csrf

# 2. Extract token from response JSON
TOKEN=$(curl -s -b cookies.txt http://localhost:3000/csrf | jq -r '.token')

# 3. Make protected request
curl -b cookies.txt -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"manager456"}' \
  http://localhost:3000/api/auth/login
```

## 4. Common Mistakes

-   **Don't** import `app` from `backend/server.js` in tests
-   **Don't** use `supertest(app)` - use live server URL instead
-   **Don't** forget to include the `X-CSRF-Token` header
-   **Don't** forget to include cookies (handled automatically by helpers)
