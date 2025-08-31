# authFlow.ts

## Overall Purpose
This module provides Playwright helper functions for making CSRF-protected API requests in end-to-end tests. It standardizes the CSRF token flow across all E2E tests, ensuring consistent security practices and preventing manual token management errors during browser automation.

## End-to-End Data Flow
1. **Input**: E2E test calls helper function with page object, endpoint URL, and payload
2. **Token Fetch**: Helper uses Playwright's `page.request.get('/csrf')` to obtain CSRF token
3. **Request Preparation**: Helper builds request with `X-CSRF-Token` header and proper content type
4. **Execution**: Helper makes the actual API request using Playwright's request API
5. **Output**: Returns Playwright APIResponse object for test assertions

## Module API & Logic Breakdown

### `postWithCsrf(page, url, payload)`
**Purpose**: Makes POST requests with CSRF token to protected endpoints
**Parameters**:
- `page` (Page, required): Playwright page object for making requests
- `url` (string, required): API endpoint path (e.g., '/api/auth/login')
- `payload` (Object, required): Request payload data

**Returns**: Promise<APIResponse> - Playwright API response object
**Raises**: Error if CSRF token fetch fails or request fails
**Usage & Logic Notes**: 
- Automatically fetches fresh CSRF token for each request
- Sets `Content-Type: application/json` header
- Uses Playwright's built-in request API for reliable testing

### `putWithCsrf(page, url, payload)`
**Purpose**: Makes PUT requests with CSRF token to protected endpoints
**Parameters**: Same as `postWithCsrf`
**Returns**: Promise<APIResponse>
**Usage & Logic Notes**: Identical to POST but uses PUT method

### `deleteWithCsrf(page, url)`
**Purpose**: Makes DELETE requests with CSRF token to protected endpoints
**Parameters**:
- `page` (Page, required): Playwright page object
- `url` (string, required): API endpoint path
**Returns**: Promise<APIResponse>
**Usage & Logic Notes**: Only sets CSRF token header, no body needed

## Dependency Mapping

### Upstream Dependencies (Inputs)
**Calling Modules/Services**: E2E test files that need to test CSRF-protected API endpoints
**Input Data Contracts / Schemas**: 
- Playwright Page object
- Endpoint URL string
- Request payload object (for POST/PUT)

### Downstream Dependencies (Outputs)
**Called Modules/Services**: 
- Playwright `page.request` API
- `/csrf` endpoint for token generation
**Output Data Contracts / Schemas**: Playwright APIResponse object

## Bug & Resolution History

### Bug Summary
**Issue**: E2E tests were not properly testing CSRF-protected API endpoints
**Root Cause**: Tests were either bypassing API testing or manually managing CSRF tokens inconsistently

### Validated Hypothesis
E2E tests need standardized helpers for CSRF-protected API requests to ensure security contract validation during browser automation.

### Invalidated Hypotheses
- E2E tests only need UI testing, not API testing
- Manual CSRF token handling would be sufficient
- Different E2E tests could implement CSRF differently

### Resolution
Created these helper functions that standardize CSRF handling across all E2E tests, ensuring consistent security practices and reliable API testing during browser automation.
