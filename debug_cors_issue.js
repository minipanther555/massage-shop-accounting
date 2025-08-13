#!/usr/bin/env node

/**
 * Focused CORS Debugging Script
 * Tests CORS configuration in detail to identify the specific issue
 */

const http = require('http');

console.log('🔍 FOCUSED CORS DEBUGGING STARTING...\n');

const PRODUCTION_IP = '109.123.238.197';

// Test CORS configuration in detail
async function testCORS() {
    console.log('🧪 Testing CORS Configuration in Detail...\n');
    
    // Test 1: Simple GET request to see CORS headers
    console.log('1️⃣ Testing GET request to /health endpoint...');
    try {
        const response = await makeRequest(`http://${PRODUCTION_IP}/health`);
        console.log(`   Status: ${response.status}`);
        console.log(`   CORS Headers:`);
        Object.entries(response.headers).forEach(([key, value]) => {
            if (key.toLowerCase().includes('access-control') || key.toLowerCase().includes('cors')) {
                console.log(`     ${key}: ${value}`);
            }
        });
        
        if (response.headers['access-control-allow-origin']) {
            console.log('   ✅ CORS headers present');
        } else {
            console.log('   ❌ No CORS headers found');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
    
    // Test 2: CORS preflight request
    console.log('2️⃣ Testing CORS preflight request...');
    try {
        const preflightResponse = await makeRequest(`http://${PRODUCTION_IP}/api/auth/login`, {
            method: 'OPTIONS',
            headers: {
                'Origin': `http://${PRODUCTION_IP}`,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        
        console.log(`   Status: ${preflightResponse.status}`);
        console.log(`   CORS Headers:`);
        Object.entries(preflightResponse.headers).forEach(([key, value]) => {
            if (key.toLowerCase().includes('access-control') || key.toLowerCase().includes('cors')) {
                console.log(`     ${key}: ${value}`);
            }
        });
        
        // Check if CORS is properly configured
        const hasOrigin = preflightResponse.headers['access-control-allow-origin'];
        const hasMethods = preflightResponse.headers['access-control-allow-methods'];
        const hasHeaders = preflightResponse.headers['access-control-allow-headers'];
        
        if (hasOrigin && hasMethods && hasHeaders) {
            console.log('   ✅ CORS preflight properly configured');
        } else {
            console.log('   ❌ CORS preflight missing required headers');
            if (!hasOrigin) console.log('     Missing: access-control-allow-origin');
            if (!hasMethods) console.log('     Missing: access-control-allow-methods');
            if (!hasHeaders) console.log('     Missing: access-control-allow-headers');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
    
    // Test 3: Actual POST request to see if CORS blocks it
    console.log('3️⃣ Testing actual POST request...');
    try {
        const postResponse = await makeRequest(`http://${PRODUCTION_IP}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': `http://${PRODUCTION_IP}`
            },
            body: JSON.stringify({ username: 'test', password: 'test' })
        });
        
        console.log(`   Status: ${postResponse.status}`);
        console.log(`   Response: ${postResponse.data.substring(0, 200)}...`);
        
        if (postResponse.status === 401) {
            console.log('   ✅ Request reached backend (401 is expected for invalid credentials)');
        } else {
            console.log(`   ⚠️  Unexpected status: ${postResponse.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
    
    // Test 4: Check if the issue is with the specific domain
    console.log('4️⃣ Testing with different origin headers...');
    const testOrigins = [
        `http://${PRODUCTION_IP}`,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://example.com'
    ];
    
    for (const origin of testOrigins) {
        try {
            const response = await makeRequest(`http://${PRODUCTION_IP}/api/auth/login`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });
            
            const allowedOrigin = response.headers['access-control-allow-origin'];
            console.log(`   Origin: ${origin} -> Allowed: ${allowedOrigin || 'NOT SET'}`);
            
            if (allowedOrigin === origin || allowedOrigin === '*') {
                console.log(`     ✅ Origin ${origin} is allowed`);
            } else {
                console.log(`     ❌ Origin ${origin} is NOT allowed`);
            }
        } catch (error) {
            console.log(`   Origin: ${origin} -> Error: ${error.message}`);
        }
    }
}

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => req.destroy());
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// Run the CORS test
testCORS().catch(console.error);
