#!/usr/bin/env node

/**
 * Comprehensive Session Workflow Debugging
 * Tests the complete authentication flow: login -> navigation -> API call
 * Tests all 5 hypotheses with extensive logging at every step
 */

const http = require('http');

const BASE_URL = 'http://109.123.238.197';

// Test the complete user workflow with extensive logging
const WORKFLOW_TESTS = [
    {
        name: "HYPOTHESIS 1: CSRF Token Regeneration Test",
        description: "Test if new CSRF tokens are generated on each page load",
        steps: [
            {
                name: "Step 1: Login and get initial CSRF token",
                path: '/api/auth/login',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
                },
                body: '{"username":"manager","password":"manager456"}',
                expected: "Should return 200 with session token and CSRF token",
                logResponse: true
            },
            {
                name: "Step 2: Check session status (should be authenticated)",
                path: '/api/auth/session',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER' // Will be replaced with actual session
                },
                expected: "Should return 200 with user info",
                logResponse: true
            },
            {
                name: "Step 3: Load staff admin page (simulate navigation)",
                path: '/admin-staff.html',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER' // Will be replaced with actual session
                },
                expected: "Should return 200 HTML page",
                logResponse: false
            },
            {
                name: "Step 4: Check if CSRF token changed after page load",
                path: '/api/auth/session',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER' // Will be replaced with actual session
                },
                expected: "Should return 200, check if CSRF token is different",
                logResponse: true
            },
            {
                name: "Step 5: Try API call with original CSRF token",
                path: '/api/admin/staff',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER', // Will be replaced with actual session
                    'X-CSRF-Token': 'ORIGINAL_TOKEN' // Will be replaced with actual token
                },
                expected: "Should fail if CSRF token regeneration is the issue",
                logResponse: true
            }
        ]
    },
    {
        name: "HYPOTHESIS 2: Session Storage Corruption Test",
        description: "Test if session data is properly saved/retrieved between requests",
        steps: [
            {
                name: "Step 1: Login and verify session creation",
                path: '/api/auth/login',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
                },
                body: '{"username":"manager","password":"manager456"}',
                expected: "Should return 200 with valid session",
                logResponse: true
            },
            {
                name: "Step 2: Immediate session verification",
                path: '/api/auth/session',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER' // Will be replaced with actual session
                },
                expected: "Should return 200 immediately after login",
                logResponse: true
            },
            {
                name: "Step 3: Delayed session verification (simulate page navigation)",
                path: '/api/auth/session',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER' // Will be replaced with actual session
                },
                expected: "Should return 200 after delay, check if session data is consistent",
                logResponse: true,
                delay: 2000 // 2 second delay to simulate navigation
            }
        ]
    },
    {
        name: "HYPOTHESIS 3: Token Header Mismatch Test",
        description: "Test if CSRF tokens are properly included in API request headers",
        steps: [
            {
                name: "Step 1: Login and get CSRF token",
                path: '/api/auth/login',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
                },
                body: '{"username":"manager","password":"manager456"}',
                expected: "Should return 200 with CSRF token",
                logResponse: true
            },
            {
                name: "Step 2: API call with missing CSRF token",
                path: '/api/admin/staff',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER' // Will be replaced with actual session
                    // No X-CSRF-Token header
                },
                expected: "Should fail with CSRF error if token is required",
                logResponse: true
            },
            {
                name: "Step 3: API call with wrong header name",
                path: '/api/admin/staff',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER', // Will be replaced with actual session
                    'CSRF-Token': 'VALID_TOKEN' // Wrong header name
                },
                expected: "Should fail if header name is case-sensitive",
                logResponse: true
            }
        ]
    },
    {
        name: "HYPOTHESIS 4: User Permission Issues Test",
        description: "Test if non-root user can access session storage files/directories",
        steps: [
            {
                name: "Step 1: Login with detailed error logging",
                path: '/api/auth/login',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
                },
                body: '{"username":"manager","password":"manager456"}',
                expected: "Should return 200 or detailed error about permissions",
                logResponse: true
            },
            {
                name: "Step 2: Check server logs for permission errors",
                path: '/health',
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should work, then we check server logs manually",
                logResponse: false
            }
        ]
    },
    {
        name: "HYPOTHESIS 5: Token Expiration Test",
        description: "Test if CSRF tokens expire immediately or have extremely short lifetimes",
        steps: [
            {
                name: "Step 1: Login and get CSRF token",
                path: '/api/auth/login',
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
                },
                body: '{"username":"manager","password":"manager456"}',
                expected: "Should return 200 with CSRF token",
                logResponse: true
            },
            {
                name: "Step 2: Immediate API call with token",
                path: '/api/admin/staff',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER', // Will be replaced with actual session
                    'X-CSRF-Token': 'IMMEDIATE_TOKEN' // Will be replaced with actual token
                },
                expected: "Should work if token is valid",
                logResponse: true
            },
            {
                name: "Step 3: Delayed API call with same token",
                path: '/api/admin/staff',
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=PLACEHOLDER', // Will be replaced with actual session
                    'X-CSRF-Token': 'IMMEDIATE_TOKEN' // Same token after delay
                },
                expected: "Should fail if token expires quickly",
                logResponse: true,
                delay: 5000 // 5 second delay to test expiration
            }
        ]
    }
];

// Global variables to track session state between tests
let currentSession = null;
let currentCSRFToken = null;

async function executeWorkflowStep(step, testName) {
    return new Promise((resolve) => {
        console.log(`\n🔍 ${testName}: ${step.name}`);
        console.log(`📋 Path: ${step.path}`);
        console.log(`📋 Method: ${step.method}`);
        console.log(`📋 Headers: ${JSON.stringify(step.headers, null, 2)}`);
        if (step.body) {
            console.log(`📋 Body: ${step.body}`);
        }
        
        // Replace placeholders with actual values
        let finalHeaders = { ...step.headers };
        let finalBody = step.body;
        
        if (currentSession && finalHeaders.Cookie && finalHeaders.Cookie.includes('PLACEHOLDER')) {
            finalHeaders.Cookie = finalHeaders.Cookie.replace('PLACEHOLDER', currentSession);
        }
        
        if (currentCSRFToken && finalHeaders['X-CSRF-Token'] && finalHeaders['X-CSRF-Token'].includes('IMMEDIATE_TOKEN')) {
            finalHeaders['X-CSRF-Token'] = finalHeaders['X-CSRF-Token'].replace('IMMEDIATE_TOKEN', currentCSRFToken);
        }
        
        if (currentCSRFToken && finalHeaders['X-CSRF-Token'] && finalHeaders['X-CSRF-Token'].includes('ORIGINAL_TOKEN')) {
            finalHeaders['X-CSRF-Token'] = finalHeaders['X-CSRF-Token'].replace('ORIGINAL_TOKEN', currentCSRFToken);
        }
        
        if (currentCSRFToken && finalHeaders['X-CSRF-Token'] && finalHeaders['X-CSRF-Token'].includes('VALID_TOKEN')) {
            finalHeaders['X-CSRF-Token'] = finalHeaders['X-CSRF-Token'].replace('VALID_TOKEN', currentCSRFToken);
        }
        
        console.log(`🔧 Final Headers: ${JSON.stringify(finalHeaders, null, 2)}`);
        
        const options = {
            hostname: '109.123.238.197',
            port: 80,
            path: step.path,
            method: step.method,
            headers: finalHeaders
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const result = {
                    testName,
                    stepName: step.name,
                    path: step.path,
                    method: step.method,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    error: res.statusCode >= 400 ? data : null,
                    headers: res.headers,
                    body: data,
                    is500Error: res.statusCode === 500,
                    is401Error: res.statusCode === 401,
                    isCSRFError: data.includes('CSRF') || data.includes('csrf')
                };
                
                console.log(`📊 Result: ${res.statusCode} ${res.statusMessage}`);
                
                // Extract session and CSRF token from successful login
                if (step.path === '/api/auth/login' && res.statusCode === 200) {
                    try {
                        const responseData = JSON.parse(data);
                        if (responseData.session) {
                            currentSession = responseData.session;
                            console.log(`🔑 Session extracted: ${currentSession.substring(0, 20)}...`);
                        }
                        if (responseData.csrfToken) {
                            currentCSRFToken = responseData.csrfToken;
                            console.log(`🛡️ CSRF Token extracted: ${currentCSRFToken.substring(0, 20)}...`);
                        }
                        if (responseData.token) {
                            currentCSRFToken = responseData.token;
                            console.log(`🛡️ Token extracted: ${currentCSRFToken.substring(0, 20)}...`);
                        }
                    } catch (e) {
                        console.log(`⚠️ Could not parse login response: ${e.message}`);
                    }
                }
                
                if (result.error) {
                    console.log(`❌ Error Response: ${result.error.substring(0, 300)}${result.error.length > 300 ? '...' : ''}`);
                }
                
                if (result.is500Error) {
                    console.log(`🚨 500 ERROR DETECTED - This matches your browser experience!`);
                }
                
                if (result.isCSRFError) {
                    console.log(`🛡️ CSRF ERROR DETECTED - Token validation issue confirmed!`);
                }
                
                if (step.logResponse) {
                    console.log(`📄 Full Response: ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}`);
                }
                
                resolve(result);
            });
        });

        req.on('error', (err) => {
            const result = {
                testName,
                stepName: step.name,
                path: step.path,
                method: step.method,
                status: 'ERROR',
                statusText: err.message,
                success: false,
                error: err.message,
                headers: {},
                body: '',
                is500Error: false,
                is401Error: false,
                isCSRFError: false
            };
            
            console.log(`❌ Request Error: ${err.message}`);
            resolve(result);
        });

        req.setTimeout(15000, () => {
            req.destroy();
            const result = {
                testName,
                stepName: step.name,
                path: step.path,
                method: step.method,
                status: 'TIMEOUT',
                statusText: 'Request timeout',
                success: false,
                error: 'Request timeout after 15 seconds',
                headers: {},
                body: '',
                is500Error: false,
                is401Error: false,
                isCSRFError: false
            };
            
            console.log(`⏰ Request Timeout`);
            resolve(result);
        });

        if (finalBody) {
            req.write(finalBody);
        }
        req.end();
    });
}

async function runComprehensiveWorkflowDebugging() {
    console.log('🚀 COMPREHENSIVE SESSION WORKFLOW DEBUGGING');
    console.log('============================================');
    console.log('Testing complete authentication flow with extensive logging\n');
    
    const allResults = [];
    
    for (const workflow of WORKFLOW_TESTS) {
        console.log(`\n${workflow.name}`);
        console.log(`${workflow.description}`);
        console.log('='.repeat(workflow.name.length));
        
        for (const step of workflow.steps) {
            const result = await executeWorkflowStep(step, workflow.name);
            allResults.push(result);
            
            // Add delay if specified
            if (step.delay) {
                console.log(`⏳ Waiting ${step.delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, step.delay));
            }
            
            // Add delay between all steps to avoid overwhelming server
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Comprehensive Analysis
    console.log('\n\n📊 COMPREHENSIVE WORKFLOW DEBUGGING RESULTS');
    console.log('=============================================');
    
    const totalSteps = allResults.length;
    const successfulSteps = allResults.filter(r => r.success).length;
    const failedSteps = allResults.filter(r => !r.success).length;
    const stepsWith500Error = allResults.filter(r => r.is500Error).length;
    const stepsWithCSRFError = allResults.filter(r => r.isCSRFError).length;
    
    console.log(`Total Steps: ${totalSteps}`);
    console.log(`✅ Successful: ${successfulSteps}`);
    console.log(`❌ Failed: ${failedSteps}`);
    console.log(`🚨 500 Errors: ${stepsWith500Error}`);
    console.log(`🛡️ CSRF Errors: ${stepsWithCSRFError}`);
    
    if (stepsWith500Error > 0) {
        console.log('\n🔴 STEPS THAT PRODUCED 500 ERRORS (Matching Your Browser):');
        allResults.filter(r => r.is500Error).forEach(result => {
            console.log(`• ${result.testName}: ${result.stepName} - ${result.path}`);
        });
    }
    
    if (stepsWithCSRFError > 0) {
        console.log('\n🛡️ STEPS THAT PRODUCED CSRF ERRORS:');
        allResults.filter(r => r.isCSRFError).forEach(result => {
            console.log(`• ${result.testName}: ${result.stepName} - ${result.path}`);
        });
    }
    
    console.log('\n🔍 SESSION STATE TRACKING:');
    console.log(`Session: ${currentSession ? currentSession.substring(0, 20) + '...' : 'None'}`);
    console.log(`CSRF Token: ${currentCSRFToken ? currentCSRFToken.substring(0, 20) + '...' : 'None'}`);
    
    console.log('\n🎯 NEXT STEPS:');
    if (stepsWith500Error > 0) {
        console.log('1. The 500 errors above reveal the root cause');
        console.log('2. Focus debugging efforts on that specific workflow step');
        console.log('3. Check server logs for detailed error information');
    } else if (stepsWithCSRFError > 0) {
        console.log('1. CSRF errors detected - token management is the issue');
        console.log('2. Focus on CSRF token generation, storage, and validation');
        console.log('3. Check if tokens are being regenerated or expired');
    } else {
        console.log('1. No 500 or CSRF errors detected');
        console.log('2. The issue may be in browser-side session management');
        console.log('3. Check browser developer tools for session/cookie issues');
    }
}

// Run the comprehensive workflow debugging
runComprehensiveWorkflowDebugging().catch(console.error);
