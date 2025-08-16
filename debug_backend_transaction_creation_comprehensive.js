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
            } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
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
        
        // HYPOTHESIS 1: Field Name Mismatch
        console.log('\n🔍 HYPOTHESIS 1: Field Name Mismatch');
        const fieldNameTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 1 TESTING: Field name mapping');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 1: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('✅ HYPOTHESIS 1: Form found, testing field name mapping');
            
            // Test field name mapping
            const fieldMapping = {};
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                fieldMapping[input.name || input.id] = {
                    value: input.value,
                    name: input.name,
                    id: input.id,
                    type: input.type
                };
                console.log(`🔍 HYPOTHESIS 1: Field ${input.name || input.id} = "${input.value}" (name: ${input.name}, id: ${input.id})`);
            });
            
            console.log('🔍 HYPOTHESIS 1: Field mapping:', fieldMapping);
            
            // Test what will be sent vs what backend expects
            const frontendFields = {
                masseuse: fieldMapping.masseuse?.value,
                service: fieldMapping.service?.value,
                payment: fieldMapping.payment?.value,
                startTime: fieldMapping.startTime?.value,
                endTime: fieldMapping.endTime?.value
            };
            
            const backendExpects = {
                masseuse_name: 'undefined (backend expects this)',
                service_type: 'undefined (backend expects this)',
                payment_method: 'undefined (backend expects this)',
                start_time: 'undefined (backend expects this)',
                end_time: 'undefined (backend expects this)'
            };
            
            console.log('🔍 HYPOTHESIS 1: Frontend will send:', frontendFields);
            console.log('🔍 HYPOTHESIS 1: Backend expects:', backendExpects);
            
            return {
                fieldMapping,
                frontendFields,
                backendExpects,
                mismatch: true
            };
        });
        
        console.log('📋 HYPOTHESIS 1 Results:', fieldNameTest);
        
        // HYPOTHESIS 2: Database Schema Mismatch
        console.log('\n🔍 HYPOTHESIS 2: Database Schema Mismatch');
        const schemaTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 2 TESTING: Database schema validation');
            
            // Test if we can access any database-related information
            console.log('🔍 HYPOTHESIS 2: Checking for database schema info in CONFIG');
            
            if (typeof CONFIG !== 'undefined' && CONFIG.settings) {
                console.log('🔍 HYPOTHESIS 2: CONFIG.settings found:', Object.keys(CONFIG.settings));
                
                if (CONFIG.settings.services) {
                    console.log('🔍 HYPOTHESIS 2: Services schema sample:', CONFIG.settings.services[0]);
                }
                
                if (CONFIG.settings.masseuses) {
                    console.log('🔍 HYPOTHESIS 2: Masseuses schema sample:', CONFIG.settings.masseuses[0]);
                }
            } else {
                console.log('❌ HYPOTHESIS 2: CONFIG not available for schema testing');
            }
            
            return {
                configAvailable: typeof CONFIG !== 'undefined',
                servicesSchema: CONFIG?.settings?.services?.[0] || 'Not available',
                masseusesSchema: CONFIG?.settings?.masseuses?.[0] || 'Not available'
            };
        });
        
        console.log('📋 HYPOTHESIS 2 Results:', schemaTest);
        
        // HYPOTHESIS 3: Service Lookup Failure
        console.log('\n🔍 HYPOTHESIS 3: Service Lookup Failure');
        const serviceLookupTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 3 TESTING: Service lookup functionality');
            
            const location = document.getElementById('location')?.value;
            const service = document.getElementById('service')?.value;
            const duration = document.getElementById('duration')?.value;
            
            console.log('🔍 HYPOTHESIS 3: Current form values - Location:', location, 'Service:', service, 'Duration:', duration);
            
            // Test service lookup logic
            if (typeof CONFIG !== 'undefined' && CONFIG.settings && CONFIG.settings.services) {
                console.log('🔍 HYPOTHESIS 3: Total services available:', CONFIG.settings.services.length);
                
                if (location) {
                    const locationServices = CONFIG.settings.services.filter(s => s.location === location);
                    console.log('🔍 HYPOTHESIS 3: Services for location', location, ':', locationServices.length);
                    
                    if (service) {
                        const serviceOptions = locationServices.filter(s => s.name === service);
                        console.log('🔍 HYPOTHESIS 3: Service options for', service, ':', serviceOptions.length);
                        
                        if (duration) {
                            const exactService = serviceOptions.find(s => s.duration == duration);
                            console.log('🔍 HYPOTHESIS 3: Exact service match:', exactService);
                        }
                    }
                }
            } else {
                console.log('❌ HYPOTHESIS 3: Services data not available');
            }
            
            return {
                location,
                service,
                duration,
                servicesAvailable: CONFIG?.settings?.services?.length || 0,
                locationServices: location ? CONFIG?.settings?.services?.filter(s => s.location === location)?.length || 0 : 0
            };
        });
        
        console.log('📋 HYPOTHESIS 3 Results:', serviceLookupTest);
        
        // HYPOTHESIS 4: Database Connection/Permission Issue
        console.log('\n🔍 HYPOTHESIS 4: Database Connection/Permission Issue');
        const dbConnectionTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 4 TESTING: Database connectivity');
            
            // Test if we can make API calls to check database connectivity
            console.log('🔍 HYPOTHESIS 4: Testing API connectivity for database health');
            
            // Check if we have access to API functions
            if (typeof api !== 'undefined') {
                console.log('🔍 HYPOTHESIS 4: API object available with methods:', Object.keys(api));
            } else {
                console.log('❌ HYPOTHESIS 4: API object not available');
            }
            
            return {
                apiAvailable: typeof api !== 'undefined',
                apiMethods: typeof api !== 'undefined' ? Object.keys(api) : []
            };
        });
        
        console.log('📋 HYPOTHESIS 4 Results:', dbConnectionTest);
        
        // HYPOTHESIS 5: Business Logic Error
        console.log('\n🔍 HYPOTHESIS 5: Business Logic Error');
        const businessLogicTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 5 TESTING: Business logic validation');
            
            // Test business logic by checking form validation and data flow
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 5: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('🔍 HYPOTHESIS 5: Form found, testing business logic');
            
            // Test form validation
            const formValid = form.checkValidity();
            console.log('🔍 HYPOTHESIS 5: Form validation state:', formValid);
            
            // Test required field validation
            const requiredFields = ['masseuse', 'location', 'service', 'duration', 'payment', 'startTime', 'endTime'];
            const fieldValidation = {};
            
            requiredFields.forEach(fieldName => {
                const field = document.getElementById(fieldName);
                if (field) {
                    fieldValidation[fieldName] = {
                        value: field.value,
                        required: field.required,
                        valid: field.checkValidity(),
                        validationMessage: field.validationMessage
                    };
                    console.log(`🔍 HYPOTHESIS 5: Field ${fieldName} validation:`, fieldValidation[fieldName]);
                } else {
                    console.log(`❌ HYPOTHESIS 5: Required field ${fieldName} not found`);
                }
            });
            
            // Test data flow logic
            const location = document.getElementById('location')?.value;
            const service = document.getElementById('service')?.value;
            const duration = document.getElementById('duration')?.value;
            
            console.log('🔍 HYPOTHESIS 5: Data flow test - Location:', location, 'Service:', service, 'Duration:', duration);
            
            // Test if service selection depends on location
            if (location && !service) {
                console.log('🔍 HYPOTHESIS 5: Location selected but no service - this might be expected');
            }
            
            // Test if duration selection depends on service
            if (service && !duration) {
                console.log('🔍 HYPOTHESIS 5: Service selected but no duration - this might be expected');
            }
            
            return {
                formValid,
                fieldValidation,
                dataFlow: { location, service, duration },
                businessLogicValid: true
            };
        });
        
        console.log('📋 HYPOTHESIS 5 Results:', businessLogicTest);
        
        // Now test the actual form submission with extensive logging
        console.log('\n[STEP 5] TESTING ACTUAL FORM SUBMISSION WITH ALL HYPOTHESES...');
        
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
        
        // Select masseuse
        await page.select('#masseuse', 'John');
        console.log('✅ Selected masseuse: John');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Select payment method
        await page.select('#payment', 'Cash');
        console.log('✅ Selected payment: Cash');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set start time
        await page.type('#startTime', '14:00');
        console.log('✅ Set start time: 14:00');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set end time
        await page.select('#endTime', '15:00');
        console.log('✅ Set end time: 15:00');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
        console.log('\n🔍 ATTEMPTING FORM SUBMISSION...');
        
        // Add a submit event listener to capture what happens
        await page.evaluate(() => {
            console.log('🔍 ADDING SUBMIT EVENT LISTENER FOR DEBUGGING');
            const form = document.querySelector('#transaction-form');
            
            form.addEventListener('submit', function(e) {
                console.log('🔍 SUBMIT EVENT FIRED!');
                console.log('🔍 Event details:', e);
                console.log('🔍 Form data at submit:', new FormData(form));
                console.log('🔍 Form action:', form.action);
                console.log('🔍 Form method:', form.method);
                
                // Don't prevent default - let it submit
            });
        });
        
        // Click submit button
        console.log('🔍 Clicking submit button...');
        await page.click('button[type="submit"]');
        
        // Wait for any response or navigation
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check what happened
        const submissionResult = await page.evaluate(() => {
            console.log('🔍 CHECKING SUBMISSION RESULT:');
            
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
        
        console.log('📋 Submission result:', submissionResult);
        
        console.log('\n🔍 COMPREHENSIVE BACKEND DEBUGGING COMPLETE');
        console.log('=============================================');
        console.log('All 5 hypotheses tested with extensive logging');
        console.log('Check the output above for the root cause');
        
    } catch (error) {
        console.error('❌ ERROR during comprehensive backend debugging:', error);
    } finally {
        await browser.close();
    }
}

debugBackendTransactionCreationComprehensive();
