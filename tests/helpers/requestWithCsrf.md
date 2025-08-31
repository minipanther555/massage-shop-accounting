# requestWithCsrf.js

## Overall Purpose
This module provides a standardized helper function for making CSRF-protected HTTP requests in Jest integration tests. It automatically handles the CSRF token flow (fetch token → attach to request) to ensure all protected endpoint tests are properly secured without manual token management.

## End-to-End Data Flow
1. **Input**: Test calls `requestWithCsrf()` with endpoint URL and request options
2. **Token Fetch**: Helper makes `GET /csrf` request to obtain CSRF token and cookies
3. **Request Preparation**: Helper builds request configuration with `X-CSRF-Token` header and cookie credentials
4. **Execution**: Helper makes the actual HTTP request to the protected endpoint
5. **Output**: Returns fetch Response object for test assertions

## Module API & Logic Breakdown

### `requestWithCsrf(options)`
**Purpose**: Makes CSRF-protected HTTP requests with automatic token management
**Parameters**:
- `options.url` (string, required): API endpoint path (e.g., '/api/auth/login')
- `options.method` (string, optional): HTTP method, defaults to 'POST'
- `options.body` (Object, optional): Request payload for POST/PUT requests
- `options.headers` (Object, optional): Additional headers to include
- `options.base` (string, optional): Base URL, defaults to 'http://localhost:3000'

**Returns**: Promise<Response> - Fetch Response object
**Raises**: Error if CSRF token fetch fails or request fails
**Usage & Logic Notes**: 
- Automatically fetches fresh CSRF token for each request
- Includes `credentials: 'include'` for cookie handling
- Sets `Content-Type: application/json` by default
- Manages cookie headers automatically from CSRF response

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**: Integration test files that need to test CSRF-protected endpoints
**Input Data Contracts / Schemas**: 
- `options` object with URL, method, body, headers, base
- CSRF endpoint response: `{ token: string }` + `set-cookie` headers

### Downstream Dependencies (Outputs)
**Called Modules/Services**: 
- `fetch()` API for HTTP requests
- `/csrf` endpoint for token generation
**Output Data Contracts / Schemas**: Standard fetch Response object

## Bug & Resolution History

### Bug Summary
**Issue**: Integration tests were failing with 403 Forbidden errors when testing CSRF-protected endpoints
**Root Cause**: Tests were making direct HTTP requests without CSRF tokens, violating the application's security contract

### Validated Hypothesis
The application requires CSRF tokens for all non-GET requests to protected endpoints, but tests were not implementing this flow.

### Invalidated Hypotheses
- Tests could bypass CSRF validation in test environment
- Manual token management would be sufficient
- Different testing patterns could coexist

### Resolution
Created this helper function that automatically handles the complete CSRF flow, ensuring all integration tests properly validate the security contract while maintaining test readability and reliability.
