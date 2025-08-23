const axios = require('axios');

// =============================================================================
// CONFIGURATION
// =============================================================================
const BASE_URL = 'http://109.123.238.197'; // Use the production server IP
const LOGIN_URL = `${BASE_URL}/api/auth/login`;
const STAFF_PAGE_URL = `${BASE_URL}/api/admin/staff-page`; // The new backend route for the page
const ADD_STAFF_URL = `${BASE_URL}/api/admin/staff`;

// Manager credentials
const credentials = {
  username: 'manager',
  password: 'manager456'
};

// Data for the new staff member (using a unique name to avoid conflicts)
const newStaffData = {
  masseuse_name: `TestStaff_${Date.now()}`,
  hire_date: new Date().toISOString().split('T')[0],
  notes: 'This is a test staff member created by a diagnostic script.'
};

// =============================================================================
// DIAGNOSTIC WORKFLOW
// =============================================================================

async function validateCsrfFix() {
  console.log('🚀 STARTING CSRF FIX VALIDATION WORKFLOW 🚀');
  console.log('-------------------------------------------------');

  const agent = axios.create();
  let sessionId;
  let csrfToken;

  // --- Step 1: Login as Manager ---
  try {
    console.log(`[STEP 1/4] Logging in as '${credentials.username}'...`);
    const loginResponse = await agent.post(LOGIN_URL, credentials);
    sessionId = loginResponse.data.sessionId;

    if (!sessionId) {
      throw new Error('Login failed: No sessionId received.');
    }

    console.log('✅ [SUCCESS] Login successful.');
    console.log(`   - Session ID: ${sessionId}`);
    console.log('-------------------------------------------------');
  } catch (error) {
    console.error('❌ [FAILURE] Step 1: Login Failed.');
    console.error(`   - URL: ${LOGIN_URL}`);
    console.error(`   - Error: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    // Stop execution if login fails
  }

  // --- Script will now stop after logging in for command-line testing ---
}

validateCsrfFix();
