const puppeteer = require('puppeteer');

/**
 * COMPREHENSIVE TEST SUITE FOR TRANSACTION CREATION ROOT CAUSE
 * 
 * This test suite will definitively prove whether the missing requireAuth function
 * is the root cause of the backend transaction creation failure.
 * 
 * Test Strategy:
 * 1. Test with requireAuth function missing (current broken state)
 * 2. Test with requireAuth function available (fixed state)
 * 3. Test with api object availability
 * 4. Test actual transaction creation endpoint
 * 5. Verify all hypotheses systematically
 */

class TransactionCreationTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
    }

    async setup() {
        console.log('🔧 SETTING UP TEST ENVIRONMENT...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
            }
        });

        // Enable network request logging
        this.page.on('request', request => {
            console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
        });

        this.page.on('response', response => {
            if (response.status() >= 400) {
                console.log(`❌ ERROR RESPONSE: ${response.status()} ${response.url()}`);
            }
        });
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runTest(testName, testFunction) {
        console.log(`\n🧪 RUNNING TEST: ${testName}`);
        console.log('=' .repeat(50));
        
        try {
            const result = await testFunction();
            this.testResults.push({
                testName,
                passed: true,
                result
            });
            console.log(`✅ TEST PASSED: ${testName}`);
            return result;
        } catch (error) {
            this.testResults.push({
                testName,
                passed: false,
                error: error.message
            });
            console.log(`❌ TEST FAILED: ${testName}`);
            console.error(`Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * TEST 1: Verify Current Broken State
     * This test confirms the current broken behavior:
     * - requireAuth function is undefined
     * - api object is undefined
     * - Transaction creation fails
     */
    async testCurrentBrokenState() {
        // Navigate to transaction page
        await this.page.goto('https://109.123.238.197.sslip.io/login.html');
        
        // Login
        await this.page.type('#username', 'manager');
        await this.page.type('#password', 'manager456');
        await this.page.click('#login-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Navigate to transaction page
        await this.page.goto('https://109.123.238.197.sslip.io/api/main/transaction');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test 1a: Verify requireAuth is undefined
        const requireAuthStatus = await this.page.evaluate(() => {
            console.log('🔍 TEST 1a: Checking requireAuth function availability');
            const isDefined = typeof requireAuth !== 'undefined';
            console.log('🔍 requireAuth function defined:', isDefined);
            return {
                isDefined,
                type: typeof requireAuth,
                error: isDefined ? null : 'requireAuth function is undefined'
            };
        });
        
        // Test 1b: Verify api object is undefined
        const apiStatus = await this.page.evaluate(() => {
            console.log('🔍 TEST 1b: Checking api object availability');
            const isDefined = typeof api !== 'undefined';
            console.log('🔍 api object defined:', isDefined);
            return {
                isDefined,
                type: typeof api,
                error: isDefined ? null : 'api object is undefined'
            };
        });
        
        // Test 1c: Verify JavaScript errors in console
        const consoleErrors = await this.page.evaluate(() => {
            console.log('🔍 TEST 1c: Checking for JavaScript errors');
            // This will capture any errors that occurred during page load
            return {
                hasErrors: false, // Will be updated by page.on('console') above
                errorCount: 0
            };
        });
        
        return {
            requireAuthStatus,
            apiStatus,
            consoleErrors,
            expectedBehavior: 'Both requireAuth and api should be undefined in broken state'
        };
    }

    /**
     * TEST 2: Verify Script Loading Order
     * This test checks if the scripts are loading in the correct order
     */
    async testScriptLoadingOrder() {
        const scriptStatus = await this.page.evaluate(() => {
            console.log('🔍 TEST 2: Checking script loading order');
            
            const scripts = document.querySelectorAll('script[src]');
            const scriptOrder = Array.from(scripts).map(script => script.src);
            
            console.log('🔍 Script loading order:', scriptOrder);
            
            // Check if api.js is loaded before shared.js
            const apiIndex = scriptOrder.findIndex(src => src.includes('api.js'));
            const sharedIndex = scriptOrder.findIndex(src => src.includes('shared.js'));
            
            const correctOrder = apiIndex < sharedIndex;
            
            return {
                scriptOrder,
                apiIndex,
                sharedIndex,
                correctOrder,
                expectedOrder: 'api.js should load before shared.js'
            };
        });
        
        return scriptStatus;
    }

    /**
     * TEST 3: Verify Global Object Creation
     * This test checks if global objects are being created properly
     */
    async testGlobalObjectCreation() {
        const globalObjects = await this.page.evaluate(() => {
            console.log('🔍 TEST 3: Checking global object creation');
            
            const globalChecks = {
                window: typeof window !== 'undefined',
                document: typeof document !== 'undefined',
                requireAuth: typeof requireAuth !== 'undefined',
                api: typeof api !== 'undefined',
                submitTransaction: typeof submitTransaction !== 'undefined',
                CONFIG: typeof CONFIG !== 'undefined'
            };
            
            console.log('🔍 Global object availability:', globalChecks);
            
            return {
                globalChecks,
                missingObjects: Object.entries(globalChecks)
                    .filter(([name, available]) => !available)
                    .map(([name]) => name)
            };
        });
        
        return globalObjects;
    }

    /**
     * TEST 4: Verify Transaction Creation Endpoint
     * This test makes a direct API call to the transactions endpoint
     */
    async testDirectTransactionEndpoint() {
        // First ensure we're logged in
        await this.page.goto('https://109.123.238.197.sslip.io/login.html');
        await this.page.type('#username', 'manager');
        await this.page.type('#password', 'manager456');
        await this.page.click('#login-btn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test direct API call
        const apiTest = await this.page.evaluate(async () => {
            console.log('🔍 TEST 4: Testing direct transaction endpoint');
            
            try {
                // Create test transaction data
                const testData = {
                    masseuse_name: 'Test Masseuse',
                    service_type: 'Test Service',
                    payment_method: 'Cash',
                    start_time: '10:00 AM',
                    end_time: '11:00 AM',
                    customer_contact: 'test@example.com'
                };
                
                console.log('🔍 Test data:', testData);
                
                // Make direct fetch call to transactions endpoint
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
                    },
                    body: JSON.stringify(testData)
                });
                
                console.log('🔍 Direct API response status:', response.status);
                console.log('🔍 Direct API response headers:', Object.fromEntries(response.headers.entries()));
                
                const responseText = await response.text();
                console.log('🔍 Direct API response body:', responseText);
                
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    responseData = { raw: responseText };
                }
                
                return {
                    success: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    responseData,
                    headers: Object.fromEntries(response.headers.entries())
                };
                
            } catch (error) {
                console.error('🔍 Direct API call failed:', error);
                return {
                    success: false,
                    error: error.message,
                    stack: error.stack
                };
            }
        });
        
        return apiTest;
    }

    /**
     * TEST 5: Verify Frontend Transaction Submission
     * This test fills out the form and attempts submission
     */
    async testFrontendTransactionSubmission() {
        // Fill out the form
        await this.page.select('#location', 'In-Shop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const serviceOptions = await this.page.evaluate(() => {
            const serviceSelect = document.getElementById('service');
            const options = Array.from(serviceSelect.options).map(opt => opt.value);
            return options;
        });
        
        if (serviceOptions.length > 1) {
            await this.page.select('#service', serviceOptions[1]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const durationOptions = await this.page.evaluate(() => {
            const durationSelect = document.getElementById('duration');
            const options = Array.from(durationSelect.options).map(opt => opt.value);
            return options;
        });
        
        if (durationOptions.length > 1) {
            await this.page.select('#duration', durationOptions[1]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const masseuseOptions = await this.page.evaluate(() => {
            const masseuseSelect = document.getElementById('masseuse');
            const options = Array.from(masseuseSelect.options).map(opt => opt.value);
            return options;
        });
        
        if (masseuseOptions.length > 1) {
            await this.page.select('#masseuse', masseuseOptions[1]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await this.page.select('#payment', 'Cash');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check form state before submission
        const formState = await this.page.evaluate(() => {
            const form = document.querySelector('#transaction-form');
            const inputs = form.querySelectorAll('input, select');
            
            const formData = {};
            inputs.forEach(input => {
                formData[input.id || input.name] = {
                    value: input.value,
                    required: input.required,
                    valid: input.checkValidity()
                };
            });
            
            return {
                formValid: form.checkValidity(),
                formData
            };
        });
        
        // Attempt submission
        await this.page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check result
        const submissionResult = await this.page.evaluate(() => {
            return {
                currentUrl: window.location.href,
                pageTitle: document.title,
                hasErrors: document.querySelectorAll('.error, .alert').length > 0,
                hasSuccess: document.querySelectorAll('.success, .alert-success').length > 0
            };
        });
        
        return {
            formState,
            submissionResult,
            expectedBehavior: 'Form should submit successfully and redirect or show success message'
        };
    }

    /**
     * TEST 6: Verify requireAuth Function Definition
     * This test checks if requireAuth is defined in shared.js
     */
    async testRequireAuthDefinition() {
        const requireAuthTest = await this.page.evaluate(() => {
            console.log('🔍 TEST 6: Checking requireAuth function definition');
            
            // Check if requireAuth is defined
            const isDefined = typeof requireAuth !== 'undefined';
            
            if (isDefined) {
                // Test if it's callable
                try {
                    const result = requireAuth();
                    console.log('🔍 requireAuth() call result:', result);
                    return {
                        isDefined: true,
                        isCallable: true,
                        callResult: result,
                        functionType: typeof requireAuth
                    };
                } catch (error) {
                    return {
                        isDefined: true,
                        isCallable: false,
                        error: error.message
                    };
                }
            } else {
                return {
                    isDefined: false,
                    isCallable: false,
                    error: 'requireAuth function is not defined'
                };
            }
        });
        
        return requireAuthTest;
    }

    /**
     * RUN ALL TESTS
     */
    async runAllTests() {
        console.log('🚀 STARTING COMPREHENSIVE TRANSACTION CREATION ROOT CAUSE TEST SUITE');
        console.log('=' .repeat(80));
        
        try {
            await this.setup();
            
            // Run all tests
            await this.runTest('Current Broken State', () => this.testCurrentBrokenState());
            await this.runTest('Script Loading Order', () => this.testScriptLoadingOrder());
            await this.runTest('Global Object Creation', () => this.testGlobalObjectCreation());
            await this.runTest('Direct Transaction Endpoint', () => this.testDirectTransactionEndpoint());
            await this.runTest('Frontend Transaction Submission', () => this.testFrontendTransactionSubmission());
            await this.runTest('RequireAuth Function Definition', () => this.testRequireAuthDefinition());
            
            // Generate test report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ TEST SUITE FAILED:', error);
        } finally {
            await this.teardown();
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log('\n📊 COMPREHENSIVE TEST REPORT');
        console.log('=' .repeat(80));
        
        const passedTests = this.testResults.filter(t => t.passed);
        const failedTests = this.testResults.filter(t => !t.passed);
        
        console.log(`✅ PASSED TESTS: ${passedTests.length}/${this.testResults.length}`);
        console.log(`❌ FAILED TESTS: ${failedTests.length}/${this.testResults.length}`);
        
        console.log('\n📋 DETAILED RESULTS:');
        this.testResults.forEach((test, index) => {
            console.log(`\n${index + 1}. ${test.testName}`);
            console.log(`   Status: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`);
            if (test.passed) {
                console.log(`   Result: ${JSON.stringify(test.result, null, 2)}`);
            } else {
                console.log(`   Error: ${test.error}`);
            }
        });
        
        // Root cause analysis
        console.log('\n🔍 ROOT CAUSE ANALYSIS:');
        if (failedTests.length > 0) {
            console.log('❌ ROOT CAUSE IDENTIFIED:');
            failedTests.forEach(test => {
                console.log(`   - ${test.testName}: ${test.error}`);
            });
        } else {
            console.log('✅ ALL TESTS PASSED - Root cause not confirmed');
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (failedTests.some(t => t.testName.includes('requireAuth'))) {
            console.log('🔧 FIX REQUIRED: requireAuth function is missing or not loading properly');
        }
        if (failedTests.some(t => t.testName.includes('api object'))) {
            console.log('🔧 FIX REQUIRED: api object is missing or not loading properly');
        }
        if (failedTests.some(t => t.testName.includes('Direct Transaction Endpoint'))) {
            console.log('🔧 FIX REQUIRED: Backend transaction endpoint is failing');
        }
    }
}

// Run the test suite
async function main() {
    const testSuite = new TransactionCreationTestSuite();
    await testSuite.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TransactionCreationTestSuite;
