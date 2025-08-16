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
        return; // Stop execution if login fails
    }

    // --- Step 2: GET Admin Staff Page to receive CSRF Token ---
    try {
        console.log('[STEP 2/4] Requesting admin staff page to get CSRF token...');
        const pageResponse = await agent.get(STAFF_PAGE_URL, {
            headers: {
                'Authorization': `Bearer ${sessionId}`
            }
        });

        csrfToken = pageResponse.headers['x-csrf-token'];

        if (!csrfToken) {
            throw new Error('Failed to get CSRF token from page headers.');
        }

        console.log('✅ [SUCCESS] Received CSRF Token.');
        console.log(`   - Status Code: ${pageResponse.status}`);
        console.log(`   - X-CSRF-Token: ${csrfToken}`);
        console.log('-------------------------------------------------');

    } catch (error) {
        console.error('❌ [FAILURE] Step 2: Failed to get CSRF token.');
        console.error(`   - URL: ${STAFF_PAGE_URL}`);
        console.error(`   - Error: ${error.response ? `Status ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message}`);
        if(error.response) console.error('   - Response Headers:', error.response.headers);
        return;
    }

    // --- Step 3: POST to Add New Staff with CSRF Token ---
    try {
        console.log(`[STEP 3/4] Attempting to add new staff member '${newStaffData.masseuse_name}'...`);
        const addStaffResponse = await agent.post(ADD_STAFF_URL, newStaffData, {
            headers: {
                'Authorization': `Bearer ${sessionId}`,
                'X-CSRF-Token': csrfToken
            }
        });

        console.log('✅ [SUCCESS] Staff member added successfully.');
        console.log(`   - Status Code: ${addStaffResponse.status}`);
        console.log('   - Response Data:', JSON.stringify(addStaffResponse.data, null, 2));
        console.log('-------------------------------------------------');

    } catch (error) {
        console.error('❌ [FAILURE] Step 3: Failed to add new staff member.');
        console.error(`   - URL: ${ADD_STAFF_URL}`);
        console.error(`   - Error: ${error.response ? `Status ${error.response.status} - ${JSON.stringify(error.response.data)}` : error.message}`);
        return;
    }

    // --- Step 4: Final Confirmation ---
    console.log('[STEP 4/4] Verification complete.');
    console.log('🎉🎉🎉 The CSRF fix appears to be working correctly! 🎉🎉🎉');
    console.log('A new staff member was successfully created using the token obtained from the backend-served page.');
}

validateCsrfFix();
