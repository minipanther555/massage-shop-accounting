# Rate Limiting Middleware Documentation

## Overview
This module provides configurable rate limiting for API endpoints using environment variables. It prevents abuse while allowing normal business operations.

## Configuration

### Environment Variables
- **RATE_LIMIT_WINDOW_MS**: Time window in milliseconds (default: 60000 = 60 seconds)
- **RATE_LIMIT_MAX**: Maximum requests per window (default: 2000)

### Production Settings
```bash
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=2000
```

## Rate Limiters

### apiRateLimiter
- **Purpose**: General API rate limiting for all endpoints
- **Configuration**: Environment-driven with generous defaults
- **Bypass**: PWTEST mode for testing
- **Trust Proxy**: Enabled for correct IP detection

### loginRateLimiter  
- **Purpose**: Login attempt rate limiting (5 attempts per 15 minutes)
- **Configuration**: Hardcoded for security
- **Bypass**: Development-only header `x-dev-bypass`; production ignores the bypass header.

## Implementation Details

### Environment-Driven Configuration
```javascript
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_REQS = Number(process.env.RATE_LIMIT_MAX || 2000);
```

### Trust Proxy Support
- Server proxy trust is disabled by default and enabled only when `TRUST_PROXY_HOPS` is explicitly set.
- Rate limiter uses `req.ip` for client identification.
- Proxy/CDN environments must set `TRUST_PROXY_HOPS` to the exact trusted hop count; direct/local deployments should leave it unset so client-supplied `X-Forwarded-For` cannot spoof rate-limit identity.

## Testing
- **PWTEST Bypass**: Complete rate limiting bypass for tests
- **Regression Test**: `tests/regression/no429_staff_burst.test.js`
  - Uses `tests/helpers/requestWithCsrf.js`, which returns a native fetch `Response`; tests must parse `await response.json()` instead of reading Axios-style `response.data`.
  - Asserts the burst produces zero `429` responses. It does not require every concurrent write to return `200`, because this guard is specifically about rate-limit regression rather than staff-roster concurrency semantics.
- **CI Gate**: Rejects hardcoded limits

## Troubleshooting
- **429 Errors**: Check environment variables are set
- **IP Issues**: Verify trust proxy configuration
- **Testing**: Use PWTEST bypass for test scenarios

## Bug & Resolution History

### Production PWTEST and Proxy Trust Hardening (2026-07-13)
- **Bug Summary:** Checkpoint security review found that preview/test bypass and unconditional proxy trust could be unsafe if deployed unchanged.
- **Validated Hypothesis:** Server-level rate-limit bypass relied on PWTEST mode and `app.set('trust proxy', 1)` was always active.
- **Resolution:** PWTEST bypass is now controlled by `server.js` through `isPwtestAllowed()`, which refuses PWTEST in production. Proxy trust is deployment-configured with `TRUST_PROXY_HOPS` instead of being enabled by default.

### Development Header Bypass Production Guard (2026-07-14)
- **Bug Summary:** The login limiter's `x-dev-bypass: reset-rate-limit` skip predicate did not check `NODE_ENV`.
- **Validated Hypothesis:** Source inspection showed the skip predicate only checked the header value.
- **Resolution:** The skip predicate now requires `process.env.NODE_ENV !== 'production'` before honoring the development bypass header.
