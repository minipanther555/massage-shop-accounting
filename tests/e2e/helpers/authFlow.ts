/**
 * Playwright helper for making CSRF-protected requests in E2E tests.
 * Automatically fetches CSRF token and includes it in the request.
 */

/**
 * Makes a POST request with CSRF token to a protected endpoint.
 * 
 * @param {Page} page - Playwright page object
 * @param {string} url - API endpoint (e.g., '/api/auth/login')
 * @param {Object} payload - Request payload
 * @returns {Promise<APIResponse>} - API response
 */
export async function postWithCsrf(page, url, payload) {
  // Step 1: Get CSRF token
  const csrfResponse = await page.request.get('/csrf');
  const { token } = await csrfResponse.json();
  
  // Step 2: Make POST request with CSRF token
  return page.request.post(url, {
    data: payload,
    headers: { 
      'X-CSRF-Token': token,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Makes a PUT request with CSRF token to a protected endpoint.
 * 
 * @param {Page} page - Playwright page object
 * @param {string} url - API endpoint
 * @param {Object} payload - Request payload
 * @returns {Promise<APIResponse>} - API response
 */
export async function putWithCsrf(page, url, payload) {
  const csrfResponse = await page.request.get('/csrf');
  const { token } = await csrfResponse.json();
  
  return page.request.put(url, {
    data: payload,
    headers: { 
      'X-CSRF-Token': token,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Makes a DELETE request with CSRF token to a protected endpoint.
 * 
 * @param {Page} page - Playwright page object
 * @param {string} url - API endpoint
 * @returns {Promise<APIResponse>} - API response
 */
export async function deleteWithCsrf(page, url) {
  const csrfResponse = await page.request.get('/csrf');
  const { token } = await csrfResponse.json();
  
  return page.request.delete(url, {
    headers: { 'X-CSRF-Token': token }
  });
}
