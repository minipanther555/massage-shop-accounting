# Stop 429 Rate Limiting Issues - Environment-Driven Configuration

**Date**: 2025-09-26  
**Status**: COMPLETED  
**Issue**: Staff roster operations triggered 429 "Too many requests" errors

## Problem Summary
- **Symptom**: 429 errors after ~31 API requests to staff endpoints
- **Root Cause**: Hardcoded strict rate limits (100 req/15min) in production
- **Impact**: Staff roster functionality unusable for normal business operations

## Solution Applied

### 1. Environment-Driven Configuration
**File**: `backend/middleware/rate-limiter.js`
```javascript
// Before (hardcoded)
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// After (environment-driven)
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000); // 60s
const MAX_REQS = Number(process.env.RATE_LIMIT_MAX || 2000);        // headroom
const apiRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQS,
});
```

### 2. Production Environment Variables
```bash
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=2000
```

### 3. Trust Proxy Configuration
**File**: `backend/server.js`
```javascript
const trustProxySetting = process.env.TRUST_PROXY_HOPS
  ? Number(process.env.TRUST_PROXY_HOPS)
  : false;
app.set('trust proxy', Number.isFinite(trustProxySetting) ? trustProxySetting : false);
```

`TRUST_PROXY_HOPS` must be set only by deployments that actually sit behind a trusted proxy/CDN. Direct local and direct production processes should leave it unset so client-supplied `X-Forwarded-For` headers cannot spoof the rate-limit identity.

## Testing Results

### Staging Test (50 requests)
- **Result**: 100% success rate (0×429 errors)
- **Status**: All requests returned 200 OK
- **Verification**: Fix works correctly

### Regression Test Created
**File**: `tests/regression/no429_staff_burst.test.js`
- Tests 50 rapid requests to staff endpoints
- Fails if any 429 errors occur
- Runs in CI pipeline
- Uses the fetch-based `requestWithCsrf()` helper, so login assertions parse `await response.json()` before checking `{ success: true }`.
- This guard is scoped to rate limiting only: concurrent write responses may expose separate roster-write behavior, but the regression fails only when any response is `429`.

## Deployment Process

Production code deployment must follow the project safety contract: code is shipped through Git and the governed deployment flow only. Do not use `scp`, `rsync`, `docker cp`, copied tarballs, or manual file sync to patch production code.

### Verification Before Deployment
```bash
PATH=/opt/homebrew/bin:$PATH npm run lint
PATH=/opt/homebrew/bin:$PATH ./node_modules/.bin/jest tests/regression/no429_staff_burst.test.js --runInBand --testEnvironment=node
```

### Production Deployment
Use the normal `/push` and deploy workflow from the current governed worktree. The server should receive the new code by checking out the pushed branch/commit, not by copying individual files.

## Prevention Measures

### 1. CI Gate Check
```bash
# Add to CI pipeline - reject hardcoded limits
if grep -E "(windowMs:|max:)" backend/middleware/rate-limiter.js; then
  echo "❌ REJECTED: Hardcoded rate limits detected"
  exit 1
fi
```

### 2. Environment Variable Requirements
- **RATE_LIMIT_WINDOW_MS**: Must be set in production
- **RATE_LIMIT_MAX**: Must be set in production
- **TRUST_PROXY_HOPS**: Set only when the deployment has a trusted proxy hop
- **Default Values**: Generous enough for business operations

### 3. Documentation Updates
- **Middleware Docs**: `backend/middleware/rate-limiter.js.md`
- **Deployment Docs**: Environment variable requirements
- **Testing Docs**: Regression test procedures

## Test Commands Used
- **Primary**: `npm run test:e2e` (Playwright + Docker)
- **Integration**: `npm run test:integration` (Jest + Live Server)
- **Regression**: `tests/regression/no429_staff_burst.test.js`

## Status: ✅ RESOLVED
- **Issue**: Fixed with environment-driven configuration
- **Testing**: Verified on staging server
- **Prevention**: CI gate and regression tests added
- **Documentation**: Updated with new configuration requirements
