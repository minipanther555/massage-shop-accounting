#!/usr/bin/env node

/**
 * Comprehensive Authentication System Debugging
 * Tests all 5 hypotheses with extensive logging
 */

const http = require('http');

const BASE_URL = 'http://109.123.238.197';

// Test all 5 authentication hypotheses systematically
const AUTH_HYPOTHESES = [
    {
        name: "HYPOTHESIS 1: CSRF Token Validation Failure",
        description: "Test if CSRF token validation is causing the crash",
        tests: [
            {
                name: "No CSRF Token",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=test-session'
                },
                expected: "Should fail with 401 or 500 if CSRF validation crashes"
            },
            {
                name: "Invalid CSRF Token",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=test-session',
                    'X-CSRF-Token': 'invalid-token-123'
                },
                expected: "Should fail with 500 if CSRF validation crashes"
            },
            {
                name: "Valid CSRF Token Format",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=test-session',
                    'X-CSRF-Token': 'valid-token-format-456'
                },
                expected: "Should fail with 500 if CSRF validation crashes"
            }
        ]
    },
    {
        name: "HYPOTHESIS 2: Session Storage Issues",
        description: "Test if session storage system is corrupted",
        tests: [
            {
                name: "No Session Cookie",
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should give 401, not 500"
            },
            {
                name: "Invalid Session Format",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=invalid-format-123'
                },
                expected: "Should give 401, not 500"
            },
            {
                name: "Malformed Session Cookie",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Cookie': 'session=; malformed; cookie'
                },
                expected: "Should give 401, not 500"
            }
        ]
    },
    {
        name: "HYPOTHESIS 3: Authentication Middleware Crash",
        description: "Test if the middleware itself has JavaScript errors",
        tests: [
            {
                name: "Basic Request (should trigger middleware)",
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should give 401, not 500"
            },
            {
                name: "Request with Accept Header (triggers different middleware path)",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Accept': 'application/json'
                },
                expected: "Should give 401, not 500"
            },
            {
                name: "Request with Content-Type (triggers body parsing)",
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Content-Type': 'application/json'
                },
                expected: "Should give 401, not 500"
            }
        ]
    },
    {
        name: "HYPOTHESIS 4: Database Authentication Table Issues",
        description: "Test if auth system can't access its own tables",
        tests: [
            {
                name: "Simple Auth Endpoint Test",
                path: '/api/auth/session',
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should give 401, not 500"
            },
            {
                name: "Login Endpoint Test",
                path: '/api/auth/login',
                method: 'POST',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
                    'Content-Type': 'application/json'
                },
                body: '{"username":"test","password":"test"}',
                expected: "Should give 400 or 401, not 500"
            }
        ]
    },
    {
        name: "HYPOTHESIS 5: Permission/File Access Issues",
        description: "Test if user permissions are blocking auth system",
        tests: [
            {
                name: "Health Check (no auth required)",
                path: '/health',
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should work (200 OK)"
            },
            {
                name: "Public API Endpoint",
                path: '/api/staff/roster',
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should work (200 OK)"
            },
            {
                name: "Admin Endpoint (auth required)",
                path: '/api/admin/staff',
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)' },
                expected: "Should give 401, not 500"
            }
        ]
    }
];

async function testEndpointWithConfig(config, testName) {
    return new Promise((resolve) => {
        console.log(`\n🔍 Testing: ${testName}`);
        console.log(`📋 Path: ${config.path || '/api/admin/staff'}`);
        console.log(`📋 Method: ${config.method || 'GET'}`);
        console.log(`📋 Headers: ${JSON.stringify(config.headers, null, 2)}`);
        if (config.body) {
            console.log(`📋 Body: ${config.body}`);
        }
        
        const options = {
            hostname: '109.123.238.197',
            port: 80,
            path: config.path || '/api/admin/staff',
            method: config.method || 'GET',
            headers: config.headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const result = {
                    testName,
                    path: config.path || '/api/admin/staff',
                    method: config.method || 'GET',
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    error: res.statusCode >= 400 ? data : null,
                    headers: res.headers,
                    is500Error: res.statusCode === 500,
                    is401Error: res.statusCode === 401
                };
                
                console.log(`📊 Result: ${res.statusCode} ${res.statusText}`);
                if (result.error) {
                    console.log(`❌ Error Response: ${result.error.substring(0, 300)}${result.error.length > 300 ? '...' : ''}`);
                }
                if (result.is500Error) {
                    console.log(`🚨 500 ERROR DETECTED - This matches your browser experience!`);
                }
                if (result.is401Error) {
                    console.log(`🔐 401 AUTHENTICATION ERROR - Expected behavior for unauthenticated requests`);
                }
                
                resolve(result);
            });
        });

        req.on('error', (err) => {
            const result = {
                testName,
                path: config.path || '/api/admin/staff',
                method: config.method || 'GET',
                status: 'ERROR',
                statusText: err.message,
                success: false,
                error: err.message,
                headers: {},
                is500Error: false,
                is401Error: false
            };
            
            console.log(`❌ Request Error: ${err.message}`);
            resolve(result);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            const result = {
                testName,
                path: config.path || '/api/admin/staff',
                method: config.method || 'GET',
                status: 'TIMEOUT',
                statusText: 'Request timeout',
                success: false,
                error: 'Request timeout after 10 seconds',
                headers: {},
                is500Error: false,
                is401Error: false
            };
            
            console.log(`⏰ Request Timeout`);
            resolve(result);
        });

        if (config.body) {
            req.write(config.body);
        }
        req.end();
    });
}

async function runComprehensiveAuthDebugging() {
    console.log('🚀 COMPREHENSIVE AUTHENTICATION SYSTEM DEBUGGING');
    console.log('================================================');
    console.log('Testing all 5 authentication hypotheses with extensive logging\n');
    
    const allResults = [];
    
    for (const hypothesis of AUTH_HYPOTHESES) {
        console.log(`\n${hypothesis.name}`);
        console.log(`${hypothesis.description}`);
        console.log('='.repeat(hypothesis.name.length));
        
        for (const test of hypothesis.tests) {
            console.log(`\n📝 Test: ${test.name}`);
            console.log(`🎯 Expected: ${test.expected}`);
            
            const result = await testEndpointWithConfig(test, test.name);
            allResults.push(result);
            
            // Add delay between tests to avoid overwhelming server
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Comprehensive Analysis
    console.log('\n\n📊 COMPREHENSIVE AUTHENTICATION DEBUGGING RESULTS');
    console.log('====================================================');
    
    const totalTests = allResults.length;
    const successfulTests = allResults.filter(r => r.success).length;
    const failedTests = allResults.filter(r => !r.success).length;
    const testsWith500Error = allResults.filter(r => r.is500Error).length;
    const testsWith401Error = allResults.filter(r => r.is401Error).length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Successful: ${successfulTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`🚨 500 Errors: ${testsWith500Error}`);
    console.log(`🔐 401 Errors: ${testsWith401Error}`);
    
    if (testsWith500Error > 0) {
        console.log('\n🔴 TESTS THAT PRODUCED 500 ERRORS (Matching Your Browser):');
        allResults.filter(r => r.is500Error).forEach(result => {
            console.log(`• ${result.testName}: ${result.path} - ${result.status} ${result.statusText}`);
        });
        
        console.log('\n🎯 HYPOTHESIS VALIDATION:');
        console.log('The 500 errors above confirm which hypothesis is correct.');
        console.log('This reveals the root cause of your authentication system failure.');
    }
    
    if (testsWith401Error > 0) {
        console.log('\n🔐 TESTS THAT PRODUCED 401 ERRORS (Expected Behavior):');
        allResults.filter(r => r.is401Error).forEach(result => {
            console.log(`• ${result.testName}: ${result.path} - ${result.status} ${result.statusText}`);
        });
        
        console.log('\n✅ AUTHENTICATION SYSTEM WORKING:');
        console.log('These 401 errors show the authentication system is working correctly.');
        console.log('It\'s properly rejecting unauthenticated requests.');
    }
    
    console.log('\n🔍 NEXT STEPS:');
    if (testsWith500Error > 0) {
        console.log('1. The 500 errors above reveal the root cause');
        console.log('2. Focus debugging efforts on that specific hypothesis');
        console.log('3. Check server logs for detailed error information');
        } else {
        console.log('1. No 500 errors detected - authentication system may be working');
        console.log('2. The issue may be in the browser session management');
        console.log('3. Check if you\'re actually logged in with valid credentials');
    }
}

// Run the comprehensive authentication debugging
runComprehensiveAuthDebugging().catch(console.error);
