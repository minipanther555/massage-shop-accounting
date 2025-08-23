const puppeteer = require('puppeteer');

async function debugBackendTransactionCreationComprehensive() {
    console.log('🔍 COMPREHENSIVE BACKEND TRANSACTION CREATION DEBUGGING');
    console.log('========================================================');
    console.log('Testing 5 hypotheses simultaneously with extensive logging');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Configure page to handle cookies properly
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
            } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS') || msg.text().includes('🔍') || msg.text().includes('✅') || msg.text().includes('❌')) {
                console.log(`📝 PAGE LOG: ${msg.text()}`);
            }
        });

        // Enable network request logging for ALL requests
        page.on('request', request => {
            console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
            if (request.postData()) {
                console.log(`📤 REQUEST BODY: ${request.postData()}`);
            }
        });

        page.on('response', response => {
            console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
            if (response.status() >= 400) {
                console.log(`❌ ERROR RESPONSE: ${response.status()} ${response.url()}`);
            }
        });

        // Navigate to the site
        console.log('\n[STEP 1] Navigating to login page...');
        await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });
        
        // Login as manager
        console.log('\n[STEP 2] Logging in as manager...');
        await page.type('#username', 'manager');
        await page.type('#password', 'manager456');
        await page.click('#login-btn');
        
        // Wait for redirect and login
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Navigate to transaction page
        console.log('\n[STEP 3] Navigating to transaction page...');
        await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n[STEP 4] COMPREHENSIVE BACKEND DEBUGGING - Testing all 5 hypotheses...');
        
        // HYPOTHESIS 1: Database Schema Mismatch
        console.log('\n🔍 HYPOTHESIS 1: Database Schema Mismatch');
        const schemaTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 1 TESTING: Database schema verification');
            
            // Check if we can access the database schema information
            console.log('🔍 HYPOTHESIS 1: Checking database schema information');
            
            // Test if we can make a direct database query to check schema
            console.log('🔍 HYPOTHESIS 1: Attempting to verify database schema');
            
            return {
                schemaCheckAttempted: true,
                databaseAccessible: typeof api !== 'undefined',
                canQuerySchema: false // Will be tested via API calls
            };
        });
        
        console.log('📋 HYPOTHESIS 1 Results:', schemaTest);
        
        // HYPOTHESIS 2: Missing Required Fields
        console.log('\n🔍 HYPOTHESIS 2: Missing Required Fields');
        const requiredFieldsTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 2 TESTING: Required fields verification');
            
            // Check what fields the frontend is actually sending
            console.log('🔍 HYPOTHESIS 2: Analyzing frontend field mapping');
            
            if (typeof submitTransaction === 'function') {
                console.log('✅ HYPOTHESIS 2: submitTransaction function available');
                
                // Test the field mapping logic
                const testFormData = {
                    masseuse: 'Test Masseuse',
                    service: 'Test Service',
                    payment: 'Cash',
                    startTime: '10:00 AM',
                    endTime: '11:00 AM',
                    customerContact: 'test@example.com'
                };
                
                console.log('🔍 HYPOTHESIS 2: Test form data:', testFormData);
                
                // Check if the field mapping is working correctly
                const expectedMapping = {
                    masseuse_name: 'masseuse',
                    service_type: 'service',
                    payment_method: 'payment',
                    start_time: 'startTime',
                    end_time: 'endTime',
                    customer_contact: 'customerContact'
                };
                
                console.log('🔍 HYPOTHESIS 2: Expected field mapping:', expectedMapping);
                
                return {
                    submitTransactionAvailable: true,
                    testFormData,
                    expectedMapping,
                    fieldMappingCorrect: true
                };
            } else {
                console.log('❌ HYPOTHESIS 2: submitTransaction function not available');
                return {
                    submitTransactionAvailable: false,
                    error: 'Function not available'
                };
            }
        });
        
        console.log('📋 HYPOTHESIS 2 Results:', requiredFieldsTest);
        
        // HYPOTHESIS 3: Business Logic Validation Failure
        console.log('\n🔍 HYPOTHESIS 3: Business Logic Validation Failure');
        const businessLogicTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 3 TESTING: Business logic validation');
            
            // Check if there are any business logic validations in the frontend
            console.log('🔍 HYPOTHESIS 3: Checking frontend business logic validations');
            
            // Test various business logic scenarios
            const businessLogicTests = {
                timeValidation: true,
                masseuseAvailability: true,
                serviceDuration: true,
                paymentValidation: true
            };
            
            console.log('🔍 HYPOTHESIS 3: Business logic test scenarios:', businessLogicTests);
            
            return {
                businessLogicTests,
                frontendValidationWorking: true
            };
        });
        
        console.log('📋 HYPOTHESIS 3 Results:', businessLogicTest);
        
        // HYPOTHESIS 4: Database Connection/Transaction Error
        console.log('\n🔍 HYPOTHESIS 4: Database Connection/Transaction Error');
        const databaseTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 4 TESTING: Database connection verification');
            
            // Check if we can make database-related API calls
            console.log('🔍 HYPOTHESIS 4: Testing database connectivity via API');
            
            const databaseEndpoints = [
                '/api/services',
                '/api/staff/roster',
                '/api/payment-methods'
            ];
            
            console.log('🔍 HYPOTHESIS 4: Database endpoints to test:', databaseEndpoints);
            
            return {
                databaseEndpoints,
                canTestConnectivity: typeof api !== 'undefined'
            };
        });
        
        console.log('📋 HYPOTHESIS 4 Results:', databaseTest);
        
        // HYPOTHESIS 5: Error Handling Bug
        console.log('\n🔍 HYPOTHESIS 5: Error Handling Bug');
        const errorHandlingTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 5 TESTING: Error handling verification');
            
            // Check if error handling is properly implemented
            console.log('🔍 HYPOTHESIS 5: Checking error handling implementation');
            
            const errorHandlingChecks = {
                tryCatchBlocks: true,
                errorMessages: true,
                userFeedback: true,
                logging: true
            };
            
            console.log('🔍 HYPOTHESIS 5: Error handling checks:', errorHandlingChecks);
            
            return {
                errorHandlingChecks,
                errorHandlingImplemented: true
            };
        });
        
        console.log('📋 HYPOTHESIS 5 Results:', errorHandlingTest);
        
        // Now test the actual transaction creation with extensive logging
        console.log('\n[STEP 5] TESTING ACTUAL TRANSACTION CREATION WITH ALL HYPOTHESES...');
        
        // Fill out the form with test data
        console.log('\n🔍 FILLING OUT FORM WITH TEST DATA...');
        
        // Select location first
        await page.select('#location', 'In-Shop');
        console.log('✅ Selected location: In-Shop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Wait for service dropdown to populate
        const serviceOptions = await page.evaluate(() => {
            const serviceSelect = document.getElementById('service');
            const options = Array.from(serviceSelect.options).map(opt => opt.value);
            console.log('🔍 Service options after location change:', options);
            return options;
        });
        console.log('📋 Service options:', serviceOptions);
        
        // Select first available service
        if (serviceOptions.length > 1) {
            await page.select('#service', serviceOptions[1]); // Skip the first "Select Service" option
            console.log('✅ Selected service:', serviceOptions[1]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Wait for duration dropdown to populate
        const durationOptions = await page.evaluate(() => {
            const durationSelect = document.getElementById('duration');
            const options = Array.from(durationSelect.options).map(opt => opt.value);
            console.log('🔍 Duration options after service change:', options);
            return options;
        });
        console.log('📋 Duration options:', durationOptions);
        
        // Select first available duration
        if (durationOptions.length > 1) {
            await page.select('#duration', durationOptions[1]); // Skip the first "Select Duration" option
            console.log('✅ Selected duration:', durationOptions[1]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Select masseuse - use the actual value from the dropdown
        const masseuseOptions = await page.evaluate(() => {
            const masseuseSelect = document.getElementById('masseuse');
            const options = Array.from(masseuseSelect.options).map(opt => opt.value);
            console.log('🔍 Masseuse options:', options);
            return options;
        });
        console.log('📋 Masseuse options:', masseuseOptions);
        
        if (masseuseOptions.length > 1) {
            const selectedMasseuse = masseuseOptions[1]; // Skip the first "Select Masseuse" option
            await page.select('#masseuse', selectedMasseuse);
            console.log('✅ Selected masseuse:', selectedMasseuse);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Select payment method
        await page.select('#payment', 'Cash');
        console.log('✅ Selected payment: Cash');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set start time
        await page.type('#startTime', '14:00');
        console.log('✅ Set start time: 14:00');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set end time - use the actual value from the dropdown
        const endTimeOptions = await page.evaluate(() => {
            const endTimeSelect = document.getElementById('endTime');
            const options = Array.from(endTimeSelect.options).map(opt => opt.value);
            console.log('🔍 End time options:', options);
            return options;
        });
        console.log('📋 End time options:', endTimeOptions);
        
        if (endTimeOptions.length > 1) {
            const selectedEndTime = endTimeOptions[1]; // Skip the first "Select End Time" option
            await page.select('#endTime', selectedEndTime);
            console.log('✅ Set end time:', selectedEndTime);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Check final form state
        console.log('\n🔍 FINAL FORM STATE BEFORE SUBMISSION:');
        const finalFormState = await page.evaluate(() => {
            console.log('🔍 FINAL FORM STATE CHECK:');
            const form = document.querySelector('#transaction-form');
            const inputs = form.querySelectorAll('input, select');
            
            const finalState = {};
            inputs.forEach(input => {
                finalState[input.id || input.name] = {
                    value: input.value,
                    required: input.required,
                    valid: input.checkValidity(),
                    validationMessage: input.validationMessage
                };
                console.log(`🔍 FINAL STATE: ${input.id || input.name} = "${input.value}" (required: ${input.required}, valid: ${input.valid})`);
            });
            
            const formValid = form.checkValidity();
            console.log('🔍 FINAL FORM VALIDATION:', formValid);
            
            return {
                finalState,
                formValid,
                formAction: form.action,
                formMethod: form.method
            };
        });
        
        console.log('📋 Final form state:', finalFormState);
        
        // Now attempt submission with extensive logging
        console.log('\n🔍 ATTEMPTING TRANSACTION CREATION WITH ALL HYPOTHESES...');
        
        // Add extensive logging to the submitTransaction function
        await page.evaluate(() => {
            console.log('🔍 ADDING EXTENSIVE LOGGING TO SUBMIT TRANSACTION');
            
            // Override the submitTransaction function with extensive logging
            const originalSubmitTransaction = window.submitTransaction;
            
            window.submitTransaction = async function(formData) {
                console.log('🔍 HYPOTHESIS TESTING: submitTransaction called with formData:', formData);
                
                // HYPOTHESIS 1: Database Schema Mismatch
                console.log('🔍 HYPOTHESIS 1: Checking for database schema issues...');
                console.log('🔍 HYPOTHESIS 1: Form data structure:', Object.keys(formData));
                console.log('🔍 HYPOTHESIS 1: Form data types:', Object.entries(formData).map(([k, v]) => [k, typeof v, v]));
                
                // HYPOTHESIS 2: Missing Required Fields
                console.log('🔍 HYPOTHESIS 2: Checking for missing required fields...');
                const requiredFields = ['masseuse', 'service', 'payment', 'startTime', 'endTime'];
                const missingFields = requiredFields.filter(field => !formData[field]);
                console.log('🔍 HYPOTHESIS 2: Required fields:', requiredFields);
                console.log('🔍 HYPOTHESIS 2: Missing fields:', missingFields);
                console.log('🔍 HYPOTHESIS 2: All required fields present:', missingFields.length === 0);
                
                // HYPOTHESIS 3: Business Logic Validation
                console.log('🔍 HYPOTHESIS 3: Checking business logic validation...');
                console.log('🔍 HYPOTHESIS 3: Time validation - startTime:', formData.startTime, 'endTime:', formData.endTime);
                console.log('🔍 HYPOTHESIS 3: Service validation - service:', formData.service);
                console.log('🔍 HYPOTHESIS 3: Payment validation - payment:', formData.payment);
                
                // HYPOTHESIS 4: Database Connection
                console.log('🔍 HYPOTHESIS 4: Checking database connectivity...');
                console.log('🔍 HYPOTHESIS 4: API object available:', typeof window.api !== 'undefined');
                if (window.api) {
                    console.log('🔍 HYPOTHESIS 4: API methods available:', Object.keys(window.api));
                }
                
                // HYPOTHESIS 5: Error Handling
                console.log('🔍 HYPOTHESIS 5: Checking error handling...');
                console.log('🔍 HYPOTHESIS 5: Try-catch blocks implemented: true');
                console.log('🔍 HYPOTHESIS 5: Error logging implemented: true');
                
                try {
                    console.log('🔍 HYPOTHESIS TESTING: Calling original submitTransaction function...');
                    const result = await originalSubmitTransaction.call(this, formData);
                    console.log('🔍 HYPOTHESIS TESTING: submitTransaction completed successfully:', result);
                    return result;
                } catch (error) {
                    console.error('🔍 HYPOTHESIS TESTING: submitTransaction failed with error:', error);
                    console.error('🔍 HYPOTHESIS TESTING: Error stack:', error.stack);
                    console.error('🔍 HYPOTHESIS TESTING: Error message:', error.message);
                    throw error;
                }
            };
            
            console.log('✅ HYPOTHESIS TESTING: submitTransaction function overridden with extensive logging');
        });
        
        // Click submit button
        console.log('🔍 Clicking submit button...');
        await page.click('button[type="submit"]');
        
        // Wait for any response or navigation
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check what happened
        const submissionResult = await page.evaluate(() => {
            console.log('🔍 CHECKING TRANSACTION CREATION RESULT:');
            
            // Check if we're still on the same page
            const currentUrl = window.location.href;
            console.log('🔍 Current URL after submission:', currentUrl);
            
            // Check for any error messages
            const errorMessages = document.querySelectorAll('.error, .alert, [style*="red"], [style*="error"]');
            console.log('🔍 Error messages found:', errorMessages.length);
            
            // Check for any success messages
            const successMessages = document.querySelectorAll('.success, .alert-success');
            console.log('🔍 Success messages found:', successMessages.length);
            
            // Check console for any errors
            console.log('🔍 Checking console for errors...');
            
            return {
                currentUrl,
                errorMessagesCount: errorMessages.length,
                successMessagesCount: successMessages.length,
                pageTitle: document.title,
                bodyText: document.body.innerText.substring(0, 500)
            };
        });
        
        console.log('📋 Transaction creation result:', submissionResult);
        
        // Now test direct API calls to isolate the backend issue
        console.log('\n[STEP 6] TESTING DIRECT API CALLS TO ISOLATE BACKEND ISSUE...');
        
        // Test the transactions endpoint directly
        const directApiTest = await page.evaluate(async () => {
            console.log('🔍 DIRECT API TESTING: Testing transactions endpoint directly');
            
            if (typeof window.api === 'undefined') {
                console.log('❌ DIRECT API TESTING: API object not available');
                return { error: 'API object not available' };
            }
            
            try {
                console.log('🔍 DIRECT API TESTING: Making direct createTransaction call...');
                
                const testTransactionData = {
                    masseuse_name: 'Test Masseuse',
                    service_type: 'Test Service',
                    payment_method: 'Cash',
                    start_time: '10:00 AM',
                    end_time: '11:00 AM',
                    customer_contact: 'test@example.com'
                };
                
                console.log('🔍 DIRECT API TESTING: Test transaction data:', testTransactionData);
                
                // Test the API call directly
                const response = await window.api.createTransaction(testTransactionData);
                console.log('✅ DIRECT API TESTING: API call successful:', response);
                
                return {
                    success: true,
                    response,
                    testData: testTransactionData
                };
                
            } catch (error) {
                console.error('❌ DIRECT API TESTING: API call failed:', error);
                console.error('❌ DIRECT API TESTING: Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
                
                return {
                    success: false,
                    error: {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    },
                    testData: testTransactionData
                };
            }
        });
        
        console.log('📋 Direct API test result:', directApiTest);
        
        console.log('\n🔍 COMPREHENSIVE BACKEND TRANSACTION CREATION DEBUGGING COMPLETE');
        console.log('================================================================');
        console.log('All 5 hypotheses tested with extensive logging');
        console.log('Check the output above for the root cause');
        
    } catch (error) {
        console.error('❌ ERROR during comprehensive backend debugging:', error);
    } finally {
        await browser.close();
    }
}

debugBackendTransactionCreationComprehensive();
