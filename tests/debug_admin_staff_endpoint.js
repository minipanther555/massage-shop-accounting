#!/usr/bin/env node

/**
 * Comprehensive Debugging Script for Admin Staff Endpoint
 * Tests all 5 hypotheses with extensive logging
 */

const http = require('http');

const BASE_URL = 'http://109.123.238.197';

// Test all 5 hypotheses with different request configurations
const TEST_SCENARIOS = [
    {
        name: "HYPOTHESIS 1: Authentication Context Test",
        description: "Test without vs with authentication headers",
        tests: [
            {
                name: "No Authentication (like my test script)",
                headers: { 'User-Agent': 'Test-Script' },
                expected: "Should work (like my test showed)"
            },
            {
                name: "With Authentication Headers (like browser)",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=test-session',
                    'Referer': 'http://109.123.238.197/admin-staff.html'
                },
                expected: "Should fail with 500 (like your browser)"
            }
        ]
    },
    {
        name: "HYPOTHESIS 2: Session/Cookie Issues Test",
        description: "Test different session states",
        tests: [
            {
                name: "No Session Cookie",
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should work or give 401"
            },
            {
                name: "Invalid Session Cookie",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=invalid-session-123'
                },
                expected: "Should fail with 500 if session validation fails"
            },
            {
                name: "Expired Session Cookie",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=expired-session-456'
                },
                expected: "Should fail with 500 if expired session handling fails"
            }
        ]
    },
    {
        name: "HYPOTHESIS 3: CSRF Token Problems Test",
        description: "Test CSRF token validation",
        tests: [
            {
                name: "No CSRF Token",
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should work if CSRF is optional"
            },
            {
                name: "Invalid CSRF Token",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'X-CSRF-Token': 'invalid-token-123'
                },
                expected: "Should fail with 500 if CSRF validation fails"
            },
            {
                name: "Valid CSRF Token Format",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'X-CSRF-Token': 'valid-token-format-456'
                },
                expected: "Should work or give specific CSRF error"
            }
        ]
    },
    {
        name: "HYPOTHESIS 4: Request Header Differences Test",
        description: "Test different header combinations",
        tests: [
            {
                name: "Minimal Headers (like my test script)",
                headers: { 'User-Agent': 'Test-Script' },
                expected: "Should work (baseline)"
            },
            {
                name: "Browser-like Headers",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                expected: "Should work or fail with specific error"
            },
            {
                name: "Full Browser Headers with Referer",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'http://109.123.238.197/admin-staff.html',
                    'Origin': 'http://109.123.238.197'
                },
                expected: "Should fail with 500 if referer/origin validation fails"
            }
        ]
    },
    {
        name: "HYPOTHESIS 5: Database Connection Issues Test",
        description: "Test if authenticated requests use different database path",
        tests: [
            {
                name: "Simple Request (no auth)",
                headers: { 'User-Agent': 'Test-Script' },
                expected: "Should work (uses default database connection)"
            },
            {
                name: "Authenticated Request Simulation",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=test-session',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                expected: "Should fail with 500 if authenticated DB path is wrong"
            }
        ]
    }
];

async function testEndpointWithHeaders(headers, testName) {
    return new Promise((resolve) => {
        console.log(`\n🔍 Testing: ${testName}`);
        console.log(`📋 Headers: ${JSON.stringify(headers, null, 2)}`);
        
        const options = {
            hostname: '109.123.238.197',
            port: 80,
            path: '/api/admin/staff',
            method: 'GET',
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const result = {
                    testName,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    error: res.statusCode >= 400 ? data : null,
                    headers: res.headers,
                    is500Error: res.statusCode === 500
                };
                
                console.log(`📊 Result: ${res.statusCode} ${res.statusText}`);
                if (result.error) {
                    console.log(`❌ Error Response: ${result.error.substring(0, 300)}${result.error.length > 300 ? '...' : ''}`);
                }
                if (result.is500Error) {
                    console.log(`🚨 500 ERROR DETECTED - This matches your browser experience!`);
                }
                
                resolve(result);
            });
        });

        req.on('error', (err) => {
            const result = {
                testName,
                status: 'ERROR',
                statusText: err.message,
                success: false,
                error: err.message,
                headers: {},
                is500Error: false
            };
            
            console.log(`❌ Request Error: ${err.message}`);
            resolve(result);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            const result = {
                testName,
                status: 'TIMEOUT',
                statusText: 'Request timeout',
                success: false,
                error: 'Request timeout after 10 seconds',
                headers: {},
                is500Error: false
            };
            
            console.log(`⏰ Request Timeout`);
            resolve(result);
        });

        req.end();
    });
}

async function runComprehensiveDebugging() {
    console.log('🚀 COMPREHENSIVE DEBUGGING: ADMIN STAFF ENDPOINT');
    console.log('================================================');
    console.log('Testing all 5 hypotheses with extensive logging\n');
    
    const allResults = [];
    
    for (const scenario of TEST_SCENARIOS) {
        console.log(`\n${scenario.name}`);
        console.log(`${scenario.description}`);
        console.log('='.repeat(scenario.name.length));
        
        for (const test of scenario.tests) {
            console.log(`\n📝 Test: ${test.name}`);
            console.log(`🎯 Expected: ${test.expected}`);
            
            const result = await testEndpointWithHeaders(test.headers, test.name);
            allResults.push(result);
            
            // Add delay between tests to avoid overwhelming server
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Comprehensive Analysis
    console.log('\n\n📊 COMPREHENSIVE DEBUGGING RESULTS');
    console.log('====================================');
    
    const totalTests = allResults.length;
    const successfulTests = allResults.filter(r => r.success).length;
    const failedTests = allResults.filter(r => !r.success).length;
    const testsWith500Error = allResults.filter(r => r.is500Error).length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Successful: ${successfulTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`🚨 500 Errors: ${testsWith500Error}`);
    
    if (testsWith500Error > 0) {
        console.log('\n🔴 TESTS THAT PRODUCED 500 ERRORS (Matching Your Browser):');
        allResults.filter(r => r.is500Error).forEach(result => {
            console.log(`• ${result.testName}: ${result.status} ${result.statusText}`);
        });
        
        console.log('\n🎯 HYPOTHESIS VALIDATION:');
        console.log('The 500 errors above confirm which hypothesis is correct.');
        console.log('Compare these results with your browser experience to identify the root cause.');
    }
    
    console.log('\n🔍 NEXT STEPS:');
    console.log('1. Compare the 500 error tests above with your browser experience');
    console.log('2. The matching test reveals which hypothesis is correct');
    console.log('3. Focus debugging efforts on that specific area');
}

// Run the comprehensive debugging
runComprehensiveDebugging().catch(console.error);
