// test-hypothesis-fix.js
// Comprehensive test suite to verify the middleware order fix for API routing conflicts

const assert = require('assert');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class HypothesisTestSuite {
    constructor() {
        this.baseUrl = 'http://109.123.238.197';
        this.testResults = [];
        this.serverProcess = null;
    }

    async runAllTests() {
        console.log('🔍 [HYPOTHESIS TEST SUITE] Starting comprehensive testing of all 5 hypotheses');
        console.log('🔍 [HYPOTHESIS TEST SUITE] ================================================');
        
        try {
            // Test 1: Verify server code is updated (Hypothesis 5)
            await this.testServerCodeUpdate();
            
            // Test 2: Verify API endpoints return JSON, not HTML (Hypothesis 2 & 3)
            await this.testApiEndpointsReturnJson();
            
            // Test 3: Verify frontend is still accessible (Hypothesis 4)
            await this.testFrontendAccessible();
            
            // Test 4: Verify middleware order is correct (Hypothesis 3)
            await this.testMiddlewareOrder();
            
            // Test 5: Verify no routing conflicts (Hypothesis 1-5 combined)
            await this.testNoRoutingConflicts();
            
            // Test 6: End-to-end integration test
            await this.testEndToEndIntegration();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        }
    }

    async testServerCodeUpdate() {
        console.log('\n🔍 [TEST 1] Testing Hypothesis 5: Server Code Not Updated');
        
        try {
            const response = await this.makeRequest('/health');
            const data = JSON.parse(response);
            
            // Verify the server has the new version identifier
            assert(data.version && data.version.includes('HYPOTHESIS-TESTING'), 
                'Server should have new version identifier');
            
            // Verify the server has the hypothesis testing endpoint
            const testResponse = await this.makeRequest('/api/test-hypotheses');
            const testData = JSON.parse(testResponse);
            
            assert(testData.message === 'Testing all 5 hypotheses simultaneously',
                'Server should have hypothesis testing endpoint');
            
            console.log('✅ Test 1 PASSED: Server code is updated with new debugging');
            this.testResults.push({ test: 'Server Code Update', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Test 1 FAILED:', error.message);
            this.testResults.push({ test: 'Server Code Update', status: 'FAILED', error: error.message });
            throw error;
        }
    }

    async testApiEndpointsReturnJson() {
        console.log('\n🔍 [TEST 2] Testing Hypothesis 2 & 3: API Endpoints Return JSON, Not HTML');
        
        const endpoints = [
            '/api/services',
            '/api/staff/roster',
            '/api/services/payment-methods'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint);
                
                // Verify response is JSON, not HTML
                assert(!response.includes('<!DOCTYPE html>'), 
                    `Endpoint ${endpoint} should not return HTML`);
                
                assert(!response.includes('<html'), 
                    `Endpoint ${endpoint} should not contain HTML tags`);
                
                // Verify response is valid JSON
                const data = JSON.parse(response);
                assert(Array.isArray(data), 
                    `Endpoint ${endpoint} should return an array`);
                
                assert(data.length > 0, 
                    `Endpoint ${endpoint} should return non-empty array`);
                
                console.log(`✅ ${endpoint} returns valid JSON array with ${data.length} items`);
                
            } catch (error) {
                console.log(`❌ ${endpoint} FAILED:`, error.message);
                throw error;
            }
        }
        
        console.log('✅ Test 2 PASSED: All API endpoints return JSON, not HTML');
        this.testResults.push({ test: 'API Endpoints Return JSON', status: 'PASSED' });
    }

    async testFrontendAccessible() {
        console.log('\n🔍 [TEST 3] Testing Hypothesis 4: Frontend Still Accessible');
        
        try {
            const response = await this.makeRequest('/');
            
            // Verify frontend is accessible
            assert(response.includes('<!DOCTYPE html>'), 
                'Frontend should return HTML');
            
            assert(response.includes('MASSAGE SHOP POS SYSTEM'), 
                'Frontend should contain expected content');
            
            assert(response.includes('api.js'), 
                'Frontend should include API client script');
            
            assert(response.includes('shared.js'), 
                'Frontend should include shared script');
            
            console.log('✅ Test 3 PASSED: Frontend is accessible and contains expected content');
            this.testResults.push({ test: 'Frontend Accessible', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Test 3 FAILED:', error.message);
            this.testResults.push({ test: 'Frontend Accessible', status: 'FAILED', error: error.message });
            throw error;
        }
    }

    async testMiddlewareOrder() {
        console.log('\n🔍 [TEST 4] Testing Hypothesis 3: Middleware Order Is Correct');
        
        try {
            // Test that API calls reach the backend (not intercepted by static serving)
            const response = await this.makeRequest('/api/test-hypotheses');
            const data = JSON.parse(response);
            
            // Verify the request reached the backend with proper routing
            assert(data.request.path === '/api/test-hypotheses', 
                'Request path should be preserved');
            
            assert(data.request.method === 'GET', 
                'Request method should be preserved');
            
            // Verify the response contains the expected debugging info
            assert(data.hypotheses.length === 5, 
                'Response should contain all 5 hypotheses');
            
            console.log('✅ Test 4 PASSED: Middleware order is correct, API calls reach backend');
            this.testResults.push({ test: 'Middleware Order', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Test 4 FAILED:', error.message);
            this.testResults.push({ test: 'Middleware Order', status: 'FAILED', error: error.message });
            throw error;
        }
    }

    async testNoRoutingConflicts() {
        console.log('\n🔍 [TEST 5] Testing All Hypotheses: No Routing Conflicts');
        
        try {
            // Test that API calls and frontend calls don't interfere
            const apiResponse = await this.makeRequest('/api/services');
            const frontendResponse = await this.makeRequest('/');
            
            // Verify API returns JSON
            assert(!apiResponse.includes('<!DOCTYPE html>'), 
                'API call should not return HTML');
            
            // Verify frontend returns HTML
            assert(frontendResponse.includes('<!DOCTYPE html>'), 
                'Frontend call should return HTML');
            
            // Verify they're completely different
            assert(apiResponse !== frontendResponse, 
                'API and frontend responses should be different');
            
            // Verify API response is valid JSON
            const apiData = JSON.parse(apiResponse);
            assert(Array.isArray(apiData), 
                'API response should be parseable as JSON array');
            
            console.log('✅ Test 5 PASSED: No routing conflicts between API and frontend');
            this.testResults.push({ test: 'No Routing Conflicts', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Test 5 FAILED:', error.message);
            this.testResults.push({ test: 'No Routing Conflicts', status: 'FAILED', error: error.message });
            throw error;
        }
    }

    async testEndToEndIntegration() {
        console.log('\n🔍 [TEST 6] Testing End-to-End Integration');
        
        try {
            // Simulate the exact flow that was failing in the browser
            const servicesResponse = await this.makeRequest('/api/services');
            const paymentMethodsResponse = await this.makeRequest('/api/services/payment-methods');
            const rosterResponse = await this.makeRequest('/api/staff/roster');
            
            // Parse all responses as JSON
            const services = JSON.parse(servicesResponse);
            const paymentMethods = JSON.parse(paymentMethodsResponse);
            const roster = JSON.parse(rosterResponse);
            
            // Verify all are arrays (this was the original bug)
            assert(Array.isArray(services), 'Services should be an array');
            assert(Array.isArray(paymentMethods), 'Payment methods should be an array');
            assert(Array.isArray(roster), 'Roster should be an array');
            
            // Verify they contain expected data structure
            assert(services.length > 0, 'Services should have items');
            assert(paymentMethods.length > 0, 'Payment methods should have items');
            assert(roster.length > 0, 'Roster should have items');
            
            // Verify services have expected properties
            const firstService = services[0];
            assert(firstService.service_name, 'Service should have service_name');
            assert(firstService.price, 'Service should have price');
            
            // Verify payment methods have expected properties
            const firstPaymentMethod = paymentMethods[0];
            assert(firstPaymentMethod.method_name, 'Payment method should have method_name');
            
            // Verify roster has expected properties
            const firstStaff = roster[0];
            assert(firstStaff.masseuse_name !== undefined, 'Staff should have masseuse_name');
            
            console.log('✅ Test 6 PASSED: End-to-end integration works correctly');
            this.testResults.push({ test: 'End-to-End Integration', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Test 6 FAILED:', error.message);
            this.testResults.push({ test: 'End-to-End Integration', status: 'FAILED', error: error.message });
            throw error;
        }
    }

    async makeRequest(path, method = 'GET') {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: '109.123.238.197',
                port: 80,
                path: path,
                method: method,
                headers: {
                    'User-Agent': 'HypothesisTestSuite/1.0',
                    'Accept': 'application/json, text/html, */*'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    printResults() {
        console.log('\n🔍 [HYPOTHESIS TEST SUITE] ================================================');
        console.log('🔍 [HYPOTHESIS TEST SUITE] TEST RESULTS SUMMARY');
        console.log('🔍 [HYPOTHESIS TEST SUITE] ================================================');
        
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASSED' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.status}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        console.log('\n🔍 [HYPOTHESIS TEST SUITE] ================================================');
        console.log(`🔍 [HYPOTHESIS TEST SUITE] TOTAL: ${passed} PASSED, ${failed} FAILED`);
        console.log('🔍 [HYPOTHESIS TEST SUITE] ================================================');
        
        if (failed > 0) {
            console.log('❌ SOME TESTS FAILED - The fix is NOT working correctly');
            process.exit(1);
        } else {
            console.log('✅ ALL TESTS PASSED - The fix is working correctly!');
            console.log('🎯 The middleware order fix has resolved the API routing conflict');
            console.log('🔧 Frontend API calls now return JSON instead of HTML');
            console.log('🐛 The services.map() error should be resolved');
        }
    }
}

// Run the test suite
async function main() {
    const testSuite = new HypothesisTestSuite();
    
    try {
        await testSuite.runAllTests();
    } catch (error) {
        console.error('❌ Test suite execution failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = HypothesisTestSuite;
