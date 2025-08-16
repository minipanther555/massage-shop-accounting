const http = require('http');

const HOST = '109.123.238.197';
const PORT = 80;

// Helper function for making HTTP requests and returning the full response
function makeRequest(path, method, headers, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'User-Agent': 'CSRF-Diagnostic-Test/1.0',
                ...headers,
            },
        };

        console.log(`\n🚀 Making ${method} request to http://${HOST}:${PORT}${path}`);
        console.log('   Headers:', options.headers);
        if (body) console.log('   Body:', body);

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                console.log(`   ✅ Response Status: ${res.statusCode}`);
                console.log('   Response Headers:', res.headers);
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                });
            });
        });

        req.on('error', (e) => {
            console.error(`   ❌ Request failed: ${e.message}`);
            reject(e);
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

async function runDiagnosticTest() {
    console.log('--- Starting CSRF POST Workflow Diagnostic Test ---');
    let sessionId = null;
    let csrfToken = null;

    try {
        // --- Step 1: Authenticate and get session ID ---
        console.log('\n--- STEP 1: Authenticating Manager ---');
        const loginBody = JSON.stringify({
            username: 'manager',
            password: 'manager456',
        });
        const loginResponse = await makeRequest('/api/auth/login', 'POST', {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginBody),
        }, loginBody);

        if (loginResponse.statusCode !== 200 || !loginResponse.body) {
            throw new Error('Login failed. Cannot proceed.');
        }
        const loginData = JSON.parse(loginResponse.body);
        sessionId = loginData.sessionId;
        if (!sessionId) {
            throw new Error('Session ID not found in login response.');
        }
        console.log(`   🔑 Successfully authenticated. Session ID: ${sessionId.substring(0, 10)}...`);

        // --- Step 2: Load staff page and capture CSRF token from headers ---
        console.log('\n--- STEP 2: Loading /api/admin/staff-page to get CSRF token ---');
        const pageLoadResponse = await makeRequest('/api/admin/staff-page', 'GET', {
            'Authorization': `Bearer ${sessionId}`,
            'Accept': 'text/html',
        });

        csrfToken = pageLoadResponse.headers['x-csrf-token'];
        if (!csrfToken) {
            console.log('   ❌ CRITICAL FAILURE: Server did NOT provide an X-CSRF-Token on page load.');
            console.log('   This is likely the root cause. The addCSRFToken middleware is not working as expected.');
        } else {
            console.log(`   🛡️ Successfully captured CSRF Token: ${csrfToken.substring(0, 10)}...`);
        }
        
        // Even if token is missing, we proceed to see the server's response.
        const tokenToSend = csrfToken || 'dummy-token-because-none-was-provided';


        // --- Step 3: Simulate form submission with captured tokens ---
        console.log('\n--- STEP 3: Simulating Add Staff POST request ---');
        const addStaffBody = JSON.stringify({
            masseuse_name: 'Diagnostic Test Staff',
            hire_date: '2025-01-01',
            notes: 'Created by diagnostic script.'
        });

        const addStaffResponse = await makeRequest('/api/admin/staff', 'POST', {
            'Authorization': `Bearer ${sessionId}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(addStaffBody),
            'X-CSRF-Token': tokenToSend,
        }, addStaffBody);

        console.log('\n--- STEP 4: Analyzing the Result ---');
        if (addStaffResponse.statusCode === 200 || addStaffResponse.statusCode === 201) {
            console.log('\n✅ SUCCESS: The POST request was successful (200/201 OK).');
            console.log('   This proves the server-side CSRF mechanism is working correctly.');
            console.log('   The server provided a token, and it successfully validated it.');
            console.log('   CONCLUSION: The bug is almost certainly in the frontend JavaScript (api.js), which is failing to read the token from headers and send it with the POST request.');
        } else {
            console.log(`\n❌ FAILURE: The POST request failed with status ${addStaffResponse.statusCode}.`);
            console.log('   Response Body:', addStaffResponse.body);
            if (!csrfToken) {
                 console.log('   DIAGNOSIS: The failure was expected because the server never sent a CSRF token in the first place (see Step 2). The issue is in the `addCSRFToken` middleware or its placement.');
            } else {
                 console.log('   DIAGNOSIS: The server provided a CSRF token, but the POST request still failed. This points to a problem in the `validateCSRFToken` logic on the server.');
            }
        }

    } catch (error) {
        console.error('\n🚨 An error occurred during the diagnostic test:', error);
    } finally {
        console.log('\n--- Diagnostic Test Finished ---');
    }
}

runDiagnosticTest();
