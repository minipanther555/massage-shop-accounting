const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const API_BASE_URL = 'http://localhost:3000'; // Base URL now includes the non /api part

/**
 * Creates a fully authenticated axios instance for making API requests.
 * It logs in, manages session cookies, and handles CSRF tokens.
 *
 * @returns {Promise<axios.AxiosInstance>} An axios instance ready for authenticated requests.
 */
async function getAuthenticatedClient() {
  try {
    // Step 1: Create a stateful axios instance with a cookie jar.
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, baseURL: API_BASE_URL }));

    // Step 2: Log in. The cookie jar will store the session cookie.
    await client.post('/api/auth/login', {
      username: 'manager',
      password: 'manager456'
    });

    // Step 3: Fetch a protected page to get a CSRF token.
    const pageResponse = await client.get('/api/admin/staff-page');
    const html = pageResponse.data;

    // Step 4: Scrape the CSRF token from the meta tag in the HTML.
    const match = html.match(/<meta name="csrf-token" content="([^"]+)">/);
    if (!match || !match[1]) {
      throw new Error('Could not find CSRF token on the admin page.');
    }
    const csrfToken = match[1];

    // Step 5: Configure the client to include the CSRF token in the headers
    // for all subsequent requests.
    client.defaults.headers.common['X-CSRF-Token'] = csrfToken;

    console.log('✅ Auth fixture created successfully (including CSRF token).');
    return client;
  } catch (error) {
    console.error('❌ Failed to create authenticated client fixture:');
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', error.response.data);
    } else {
      console.error('   - Error:', error.message);
    }
    throw new Error('Could not create authenticated client.');
  }
}

module.exports = { getAuthenticatedClient };
