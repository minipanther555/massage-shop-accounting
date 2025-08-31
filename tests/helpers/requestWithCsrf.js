const fetch = require('node-fetch');

/**
 * Helper function for making CSRF-protected requests in Jest integration tests.
 * Automatically fetches CSRF token and includes it in the request.
 * 
 * @param {Object} options - Request options
 * @param {string} options.url - API endpoint (e.g., '/api/auth/login')
 * @param {string} [options.method='POST'] - HTTP method
 * @param {Object} [options.body] - Request body
 * @param {Object} [options.headers={}] - Additional headers
 * @param {string} [options.base='http://localhost:3000'] - Base URL
 * @returns {Promise<Response>} - Fetch response
 */
async function requestWithCsrf({ url, method = 'POST', body, headers = {}, base = 'http://localhost:3000' }) {
  // Step 1: Get CSRF token and cookie
  const csrfResponse = await fetch(`${base}/csrf`, { 
    method: 'GET',
    credentials: 'include'
  });
  
  if (!csrfResponse.ok) {
    throw new Error(`Failed to fetch CSRF token: ${csrfResponse.status}`);
  }
  
  const { token } = await csrfResponse.json();
  const cookies = csrfResponse.headers.get('set-cookie');
  
  // Step 2: Make the actual request with CSRF token
  const requestOptions = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      ...headers
    }
  };
  
  if (body) {
    requestOptions.body = JSON.stringify(body);
  }
  
  // Include cookies from CSRF request
  if (cookies) {
    requestOptions.headers.Cookie = cookies;
  }
  
  return fetch(`${base}${url}`, requestOptions);
}

module.exports = { requestWithCsrf };
