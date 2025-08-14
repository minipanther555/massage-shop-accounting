#!/usr/bin/env node

/**
 * Authentication System Debugging Script
 * Tests all 5 hypotheses simultaneously with comprehensive logging
 * 
 * This script investigates why the authentication system is rejecting
 * all login attempts with 401 Unauthorized responses.
 */

const http = require('http');
const https = require('https');

console.log('🔐 AUTHENTICATION SYSTEM DEBUGGING SCRIPT STARTING');
console.log('🔐 Testing all 5 hypotheses simultaneously with comprehensive logging');
console.log('🔐 Target: http://109.123.238.197/api/auth/login');
console.log('🔐 Time:', new Date().toISOString());
console.log('');

// Configuration
const TARGET_URL = 'http://109.123.238.197';
const LOGIN_ENDPOINT = '/api/auth/login';
const HEALTH_ENDPOINT = '/health';
const SESSION_ENDPOINT = '/api/auth/session';

// Test Results Storage
const testResults = {
    hypothesis1: { name: 'Hardcoded Users Array Issue', status: 'UNKNOWN', details: [] },
    hypothesis2: { name: 'Rate Limiter Blocking', status: 'UNKNOWN', details: [] },
    hypothesis3: { name: 'Request Body Parsing', status: 'UNKNOWN', details: [] },
    hypothesis4: { name: 'Environment Configuration', status: 'UNKNOWN', details: [] },
    hypothesis5: { name: 'Database Dependency', status: 'UNKNOWN', details: [] }
};

// Utility function for making HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 10000
        };

        console.log(`🌐 Making ${requestOptions.method} request to: ${url}`);
        console.log(`🌐 Request options:`, JSON.stringify(requestOptions, null, 2));

        const req = client.request(requestOptions, (res) => {
            console.log(`📡 Response received: ${res.statusCode} ${res.statusMessage}`);
            console.log(`📡 Response headers:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
                console.log(`📡 Data chunk received: ${chunk.length} bytes`);
            });
            
            res.on('end', () => {
                console.log(`📡 Response complete. Total data: ${data.length} bytes`);
                console.log(`📡 Response body preview:`, data.substring(0, 200) + (data.length > 200 ? '...' : ''));
                
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    url: url
                });
            });
        });

        req.on('error', (error) => {
            console.error(`🚨 Request error:`, error.message);
            reject(error);
        });

        req.on('timeout', () => {
            console.error(`⏰ Request timeout after 10 seconds`);
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            console.log(`📤 Sending request body:`, options.body);
            req.write(options.body);
        }

        req.end();
    });
}

// Test 1: Hardcoded Users Array Issue
async function testHypothesis1() {
    console.log('\n🔍 TESTING HYPOTHESIS 1: Hardcoded Users Array Issue');
    console.log('🔍 Checking if the hardcoded users array is working correctly');
    
    try {
        // Test with the actual hardcoded credentials from auth.js
        const validCredentials = [
            { username: 'reception', password: 'reception123' },
            { username: 'manager', password: 'manager456' }
        ];
        
        for (const creds of validCredentials) {
            console.log(`🔍 Testing with hardcoded credentials: ${creds.username}/${creds.password}`);
            
            const response = await makeRequest(`${TARGET_URL}${LOGIN_ENDPOINT}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            
            if (response.statusCode === 200) {
                console.log(`✅ HYPOTHESIS 1: Login successful with ${creds.username}`);
                testResults.hypothesis1.status = 'PASSED';
                testResults.hypothesis1.details.push(`Login successful with ${creds.username}`);
                
                // Check if response contains expected data
                try {
                    const data = JSON.parse(response.body);
                    if (data.success && data.sessionId && data.user) {
                        console.log(`✅ HYPOTHESIS 1: Response data structure correct`);
                        testResults.hypothesis1.details.push('Response data structure correct');
                    } else {
                        console.log(`⚠️ HYPOTHESIS 1: Response data structure unexpected`);
                        testResults.hypothesis1.details.push('Response data structure unexpected');
                    }
                } catch (parseError) {
                    console.log(`⚠️ HYPOTHESIS 1: Response not valid JSON`);
                    testResults.hypothesis1.details.push('Response not valid JSON');
                }
                
                // Test successful - no need to test other credentials
                break;
                
            } else if (response.statusCode === 401) {
                console.log(`❌ HYPOTHESIS 1: Login failed with ${creds.username} - Status: 401`);
                testResults.hypothesis1.details.push(`Login failed with ${creds.username} (401)`);
                
                // Check error message
                try {
                    const errorData = JSON.parse(response.body);
                    if (errorData.error === 'Invalid username or password') {
                        console.log(`🔍 HYPOTHESIS 1: Expected error message received`);
                        testResults.hypothesis1.details.push('Expected error message received');
                    } else {
                        console.log(`⚠️ HYPOTHESIS 1: Unexpected error message: ${errorData.error}`);
                        testResults.hypothesis1.details.push(`Unexpected error message: ${errorData.error}`);
                    }
                } catch (parseError) {
                    console.log(`⚠️ HYPOTHESIS 1: Error response not valid JSON`);
                    testResults.hypothesis1.details.push('Error response not valid JSON');
                }
                
            } else {
                console.log(`⚠️ HYPOTHESIS 1: Unexpected status with ${creds.username}: ${response.statusCode}`);
                testResults.hypothesis1.details.push(`Unexpected status: ${response.statusCode}`);
            }
        }
        
        // Determine overall status
        if (testResults.hypothesis1.details.some(detail => detail.includes('Login successful'))) {
            testResults.hypothesis1.status = 'PASSED';
        } else {
            testResults.hypothesis1.status = 'FAILED';
        }
        
    } catch (error) {
        console.error(`🚨 HYPOTHESIS 1 TEST FAILED:`, error.message);
        testResults.hypothesis1.status = 'ERROR';
        testResults.hypothesis1.details.push(`Test error: ${error.message}`);
    }
}

// Test 2: Rate Limiter Blocking
async function testHypothesis2() {
    console.log('\n🔍 TESTING HYPOTHESIS 2: Rate Limiter Blocking');
    console.log('🔍 Checking if rate limiting is blocking login attempts');
    
    try {
        // Test multiple rapid login attempts to see if rate limiting kicks in
        console.log(`🔍 Testing rate limiting with multiple rapid attempts`);
        
        const testCredentials = { username: 'test', password: 'test' };
        const attempts = [];
        
        // Make 6 rapid attempts (should trigger rate limiting after 5)
        for (let i = 1; i <= 6; i++) {
            console.log(`🔍 Rate limit test attempt ${i}/6`);
            
            try {
                const response = await makeRequest(`${TARGET_URL}${LOGIN_ENDPOINT}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testCredentials)
                });
                
                attempts.push({
                    attempt: i,
                    statusCode: response.statusCode,
                    body: response.body
                });
                
                console.log(`📊 Attempt ${i} result: ${response.statusCode}`);
                
                // Check for rate limiting
                if (response.statusCode === 429) {
                    console.log(`✅ HYPOTHESIS 2: Rate limiting triggered on attempt ${i}`);
                    testResults.hypothesis2.status = 'PASSED';
                    testResults.hypothesis2.details.push(`Rate limiting triggered on attempt ${i}`);
                    
                    // Check rate limit headers
                    const rateLimitHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'];
                    rateLimitHeaders.forEach(header => {
                        if (response.headers[header]) {
                            console.log(`📊 Rate limit header ${header}: ${response.headers[header]}`);
                            testResults.hypothesis2.details.push(`${header}: ${response.headers[header]}`);
                        }
                    });
                    
                    break;
                }
                
                // Small delay between attempts
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`🚨 Rate limit test attempt ${i} failed:`, error.message);
                attempts.push({ attempt: i, error: error.message });
            }
        }
        
        // Analyze results
        const rateLimitTriggered = attempts.some(attempt => attempt.statusCode === 429);
        const allFailed = attempts.every(attempt => attempt.statusCode === 401);
        
        if (rateLimitTriggered) {
            console.log(`✅ HYPOTHESIS 2: Rate limiting is working correctly`);
            testResults.hypothesis2.details.push('Rate limiting functional');
        } else if (allFailed) {
            console.log(`❌ HYPOTHESIS 2: All attempts failed with 401 - rate limiting not the issue`);
            testResults.hypothesis2.status = 'FAILED';
            testResults.hypothesis2.details.push('All attempts failed with 401 - not rate limiting');
        } else {
            console.log(`⚠️ HYPOTHESIS 2: Mixed results - rate limiting may be partially working`);
            testResults.hypothesis2.details.push('Mixed results from rate limit testing');
        }
        
        console.log(`📊 Rate limit test summary:`, attempts);
        
    } catch (error) {
        console.error(`🚨 HYPOTHESIS 2 TEST FAILED:`, error.message);
        testResults.hypothesis2.status = 'ERROR';
        testResults.hypothesis2.details.push(`Test error: ${error.message}`);
    }
}

// Test 3: Request Body Parsing
async function testHypothesis3() {
    console.log('\n🔍 TESTING HYPOTHESIS 3: Request Body Parsing');
    console.log('🔍 Checking if request body parsing is working correctly');
    
    try {
        // Test various request body formats to see if parsing is the issue
        const testCases = [
            {
                name: 'Valid JSON with reception credentials',
                body: JSON.stringify({ username: 'reception', password: 'reception123' }),
                headers: { 'Content-Type': 'application/json' }
            },
            {
                name: 'Valid JSON with manager credentials',
                body: JSON.stringify({ username: 'manager', password: 'manager456' }),
                headers: { 'Content-Type': 'application/json' }
            },
            {
                name: 'Missing Content-Type header',
                body: JSON.stringify({ username: 'reception', password: 'reception123' }),
                headers: {}
            },
            {
                name: 'Invalid JSON format',
                body: '{"username": "reception", "password": "reception123"', // Missing closing brace
                headers: { 'Content-Type': 'application/json' }
            },
            {
                name: 'Empty body',
                body: '',
                headers: { 'Content-Type': 'application/json' }
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`🔍 Testing: ${testCase.name}`);
            
            try {
                const response = await makeRequest(`${TARGET_URL}${LOGIN_ENDPOINT}`, {
                    method: 'POST',
                    headers: testCase.headers,
                    body: testCase.body
                });
                
                console.log(`📊 Result: ${response.statusCode} - ${response.statusMessage}`);
                
                if (testCase.name.includes('Valid JSON') && response.statusCode === 200) {
                    console.log(`✅ HYPOTHESIS 3: Valid JSON parsing working`);
                    testResults.hypothesis3.details.push(`${testCase.name}: Success (200)`);
                } else if (testCase.name.includes('Invalid JSON') && response.statusCode === 400) {
                    console.log(`✅ HYPOTHESIS 3: Invalid JSON properly rejected`);
                    testResults.hypothesis3.details.push(`${testCase.name}: Properly rejected (400)`);
                } else if (testCase.name.includes('Empty body') && response.statusCode === 400) {
                    console.log(`✅ HYPOTHESIS 3: Empty body properly rejected`);
                    testResults.hypothesis3.details.push(`${testCase.name}: Properly rejected (400)`);
                } else {
                    console.log(`⚠️ HYPOTHESIS 3: Unexpected response for ${testCase.name}`);
                    testResults.hypothesis3.details.push(`${testCase.name}: ${response.statusCode}`);
                }
                
            } catch (error) {
                console.error(`🚨 Test case failed: ${testCase.name}`, error.message);
                testResults.hypothesis3.details.push(`${testCase.name}: Error - ${error.message}`);
            }
        }
        
        // Determine overall status
        const validJsonTests = testCases.filter(tc => tc.name.includes('Valid JSON'));
        const validJsonResults = validJsonTests.map(tc => 
            testResults.hypothesis3.details.find(detail => detail.includes(tc.name))
        );
        
        if (validJsonResults.some(result => result && result.includes('Success'))) {
            testResults.hypothesis3.status = 'PASSED';
        } else {
            testResults.hypothesis3.status = 'FAILED';
        }
        
    } catch (error) {
        console.error(`🚨 HYPOTHESIS 3 TEST FAILED:`, error.message);
        testResults.hypothesis3.status = 'ERROR';
        testResults.hypothesis3.details.push(`Test error: ${error.message}`);
    }
}

// Test 4: Environment Configuration
async function testHypothesis4() {
    console.log('\n🔍 TESTING HYPOTHESIS 4: Environment Configuration');
    console.log('🔍 Checking if environment configuration is causing authentication issues');
    
    try {
        // Test if the system is running in the expected environment
        console.log(`🔍 Testing environment-dependent behavior`);
        
        // Test health endpoint to see environment info
        console.log(`🔍 Testing health endpoint for environment info`);
        const healthResponse = await makeRequest(`${TARGET_URL}${HEALTH_ENDPOINT}`);
        
        if (healthResponse.statusCode === 200) {
            console.log(`✅ HYPOTHESIS 4: Health endpoint accessible`);
            testResults.hypothesis4.details.push('Health endpoint accessible');
            
            // Check for environment-specific headers
            const securityHeaders = [
                'content-security-policy',
                'strict-transport-security',
                'x-frame-options',
                'x-content-type-options'
            ];
            
            securityHeaders.forEach(header => {
                if (healthResponse.headers[header]) {
                    console.log(`🔒 Security header ${header}: ${response.headers[header]}`);
                    testResults.hypothesis4.details.push(`Security header ${header} present`);
                }
            });
            
            // Check for rate limiting headers
            if (healthResponse.headers['x-ratelimit-limit']) {
                console.log(`📊 Rate limit header present: ${healthResponse.headers['x-ratelimit-limit']}`);
                testResults.hypothesis4.details.push('Rate limiting configured');
            }
            
        } else {
            console.log(`❌ HYPOTHESIS 4: Health endpoint not accessible - Status: ${healthResponse.statusCode}`);
            testResults.hypothesis4.status = 'FAILED';
            testResults.hypothesis4.details.push(`Health endpoint returned ${healthResponse.statusCode}`);
        }
        
        // Test if authentication endpoint has different behavior
        console.log(`🔍 Testing authentication endpoint for environment differences`);
        const authResponse = await makeRequest(`${TARGET_URL}${LOGIN_ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test', password: 'test' })
        });
        
        if (authResponse.statusCode === 401) {
            console.log(`✅ HYPOTHESIS 4: Authentication endpoint responding (expected 401)`);
            testResults.hypothesis4.details.push('Authentication endpoint responding');
            
            // Check for environment-specific headers in auth response
            const authHeaders = Object.keys(authResponse.headers);
            console.log(`📊 Authentication response headers:`, authHeaders);
            
            // Check if this is production environment
            if (authResponse.headers['strict-transport-security']) {
                console.log(`🏭 HYPOTHESIS 4: Production environment detected (HSTS header)`);
                testResults.hypothesis4.details.push('Production environment detected');
            } else {
                console.log(`🔧 HYPOTHESIS 4: Development environment detected (no HSTS)`);
                testResults.hypothesis4.details.push('Development environment detected');
            }
            
        } else {
            console.log(`⚠️ HYPOTHESIS 4: Authentication endpoint unexpected response: ${authResponse.statusCode}`);
            testResults.hypothesis4.details.push(`Unexpected auth response: ${authResponse.statusCode}`);
        }
        
        // Determine overall status
        if (testResults.hypothesis4.status === 'UNKNOWN') {
            testResults.hypothesis4.status = 'PASSED';
        }
        
    } catch (error) {
        console.error(`🚨 HYPOTHESIS 4 TEST FAILED:`, error.message);
        testResults.hypothesis4.status = 'ERROR';
        testResults.hypothesis4.details.push(`Test error: ${error.message}`);
    }
}

// Test 5: Database Dependency
async function testHypothesis5() {
    console.log('\n🔍 TESTING HYPOTHESIS 5: Database Dependency');
    console.log('🔍 Checking if database issues are causing authentication problems');
    
    try {
        // Test if the system is trying to use database authentication
        console.log(`🔍 Testing database dependency for authentication`);
        
        // The auth.js file shows hardcoded users, but let's test if there are any database calls
        // Test with invalid credentials to see if database errors occur
        console.log(`🔍 Testing with invalid credentials to check for database errors`);
        
        const invalidCredentials = [
            { username: 'nonexistent', password: 'wrongpassword' },
            { username: '', password: 'test' },
            { username: 'test', password: '' }
        ];
        
        for (const creds of invalidCredentials) {
            console.log(`🔍 Testing invalid credentials: ${JSON.stringify(creds)}`);
            
            try {
                const response = await makeRequest(`${TARGET_URL}${LOGIN_ENDPOINT}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(creds)
                });
                
                console.log(`📊 Result: ${response.statusCode}`);
                
                if (response.statusCode === 400) {
                    console.log(`✅ HYPOTHESIS 5: Validation error (400) - no database dependency`);
                    testResults.hypothesis5.details.push(`${JSON.stringify(creds)}: Validation error (400)`);
                } else if (response.statusCode === 401) {
                    console.log(`✅ HYPOTHESIS 5: Authentication error (401) - no database dependency`);
                    testResults.hypothesis5.details.push(`${JSON.stringify(creds)}: Auth error (401)`);
                } else if (response.statusCode === 500) {
                    console.log(`❌ HYPOTHESIS 5: Server error (500) - possible database issue`);
                    testResults.hypothesis5.status = 'FAILED';
                    testResults.hypothesis5.details.push(`${JSON.stringify(creds)}: Server error (500)`);
                } else {
                    console.log(`⚠️ HYPOTHESIS 5: Unexpected status: ${response.statusCode}`);
                    testResults.hypothesis5.details.push(`${JSON.stringify(creds)}: Status ${response.statusCode}`);
                }
                
            } catch (error) {
                console.error(`🚨 Invalid credentials test failed:`, error.message);
                testResults.hypothesis5.details.push(`Test error: ${error.message}`);
            }
        }
        
        // Test if there are any database-related endpoints
        console.log(`🔍 Testing for database-related endpoints`);
        
        // Check if there's a database health endpoint
        try {
            const dbHealthResponse = await makeRequest(`${TARGET_URL}/api/db/health`);
            console.log(`🔍 Database health endpoint: ${dbHealthResponse.statusCode}`);
            testResults.hypothesis5.details.push(`Database health endpoint: ${dbHealthResponse.statusCode}`);
        } catch (error) {
            console.log(`🔍 No database health endpoint found (expected)`);
            testResults.hypothesis5.details.push('No database health endpoint (expected)');
        }
        
        // Determine overall status
        if (testResults.hypothesis5.status === 'UNKNOWN') {
            testResults.hypothesis5.status = 'PASSED';
        }
        
    } catch (error) {
        console.error(`🚨 HYPOTHESIS 5 TEST FAILED:`, error.message);
        testResults.hypothesis5.status = 'ERROR';
        testResults.hypothesis5.details.push(`Test error: ${error.message}`);
    }
}

// Main execution function
async function runAllTests() {
    console.log('🚀 STARTING COMPREHENSIVE AUTHENTICATION SYSTEM INVESTIGATION');
    console.log('🚀 Testing all 5 hypotheses simultaneously with extensive logging');
    console.log('');
    
    try {
        // Run all tests
        await testHypothesis1();
        await testHypothesis2();
        await testHypothesis3();
        await testHypothesis4();
        await testHypothesis5();
        
        // Generate comprehensive report
        console.log('\n' + '='.repeat(80));
        console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
        console.log('='.repeat(80));
        
        Object.entries(testResults).forEach(([key, result]) => {
            const statusIcon = result.status === 'PASSED' ? '✅' : 
                              result.status === 'FAILED' ? '❌' : 
                              result.status === 'ERROR' ? '🚨' : '⚠️';
            
            console.log(`\n${statusIcon} ${result.name}: ${result.status}`);
            result.details.forEach(detail => {
                console.log(`   • ${detail}`);
            });
        });
        
        // Root cause analysis
        console.log('\n' + '='.repeat(80));
        console.log('🔍 ROOT CAUSE ANALYSIS');
        console.log('='.repeat(80));
        
        const failedHypotheses = Object.entries(testResults).filter(([key, result]) => result.status === 'FAILED');
        const errorHypotheses = Object.entries(testResults).filter(([key, result]) => result.status === 'ERROR');
        
        if (failedHypotheses.length > 0) {
            console.log('\n❌ FAILED HYPOTHESES (Most likely root causes):');
            failedHypotheses.forEach(([key, result]) => {
                console.log(`   • ${result.name}`);
                console.log(`     Details: ${result.details.join(', ')}`);
            });
        }
        
        if (errorHypotheses.length > 0) {
            console.log('\n🚨 ERROR HYPOTHESES (Testing issues):');
            errorHypotheses.forEach(([key, result]) => {
                console.log(`   • ${result.name}`);
                console.log(`     Details: ${result.details.join(', ')}`);
            });
        }
        
        if (failedHypotheses.length === 0 && errorHypotheses.length === 0) {
            console.log('\n✅ ALL HYPOTHESES PASSED - Authentication system should be working');
            console.log('🔍 If authentication still not working, the issue may be:');
            console.log('   • Client-side JavaScript errors');
            console.log('   • Network connectivity problems');
            console.log('   • Browser-specific issues');
        }
        
        // Recommended next steps
        console.log('\n' + '='.repeat(80));
        console.log('📋 RECOMMENDED NEXT STEPS');
        console.log('='.repeat(80));
        
        if (failedHypotheses.length > 0) {
            console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
            failedHypotheses.forEach(([key, result]) => {
                if (key === 'hypothesis1') {
                    console.log('   • Check hardcoded users array in auth.js');
                    console.log('   • Verify user credentials are correct');
                    console.log('   • Check if auth.js file is properly loaded');
                } else if (key === 'hypothesis2') {
                    console.log('   • Review rate limiter configuration');
                    console.log('   • Check if rate limiting is too aggressive');
                    console.log('   • Verify rate limiter middleware setup');
                } else if (key === 'hypothesis3') {
                    console.log('   • Check request body parsing middleware');
                    console.log('   • Verify Content-Type header handling');
                    console.log('   • Test JSON parsing configuration');
                } else if (key === 'hypothesis4') {
                    console.log('   • Review environment variable configuration');
                    console.log('   • Check production vs development settings');
                    console.log('   • Verify authentication configuration');
                } else if (key === 'hypothesis5') {
                    console.log('   • Check database connection and configuration');
                    console.log('   • Verify authentication table structure');
                    console.log('   • Test database connectivity');
                }
            });
        } else {
            console.log('\n✅ No immediate actions required - all tests passed');
            console.log('🔍 If authentication still not working, investigate client-side issues');
        }
        
    } catch (error) {
        console.error('\n🚨 CRITICAL ERROR DURING TESTING:', error.message);
        console.error('🚨 Stack trace:', error.stack);
    }
}

// Run the comprehensive investigation
runAllTests().catch(error => {
    console.error('\n🚨 FATAL ERROR:', error.message);
    process.exit(1);
});
