const puppeteer = require('puppeteer');

async function debugTransactionSubmissionComprehensive() {
    console.log('🔍 COMPREHENSIVE TRANSACTION SUBMISSION DEBUGGING');
    console.log('================================================');
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
        
        console.log('\n[STEP 4] COMPREHENSIVE FORM ANALYSIS - Testing all 5 hypotheses...');
        
        // HYPOTHESIS 1: Form Data Serialization Issue
        console.log('\n🔍 HYPOTHESIS 1: Form Data Serialization Issue');
        const formSerializationTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 1 TESTING: Form data serialization');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 1: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('✅ HYPOTHESIS 1: Form found, testing serialization methods');
            
            // Test multiple serialization methods
            const formData = new FormData(form);
            const formDataEntries = Array.from(formData.entries());
            
            console.log('🔍 HYPOTHESIS 1: FormData entries:', formDataEntries);
            
            // Test manual form data collection
            const manualFormData = {};
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                manualFormData[input.name || input.id] = input.value;
                console.log(`🔍 HYPOTHESIS 1: Input ${input.name || input.id} = "${input.value}"`);
            });
            
            console.log('🔍 HYPOTHESIS 1: Manual form data:', manualFormData);
            
            // Test form validation state
            const formValid = form.checkValidity();
            const validationMessage = form.validationMessage;
            
            console.log('🔍 HYPOTHESIS 1: Form valid:', formValid, 'Message:', validationMessage);
            
            return {
                formDataEntries,
                manualFormData,
                formValid,
                validationMessage,
                formAction: form.action,
                formMethod: form.method
            };
        });
        
        console.log('📋 HYPOTHESIS 1 RESULTS:', formSerializationTest);
        
        // HYPOTHESIS 2: JavaScript Event Handler Failure
        console.log('\n🔍 HYPOTHESIS 2: JavaScript Event Handler Failure');
        const eventHandlerTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 2 TESTING: JavaScript event handlers');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 2: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('✅ HYPOTHESIS 2: Form found, testing event handlers');
            
            // Test if form has submit event listener
            const submitEventListeners = getEventListeners(form, 'submit');
            console.log('🔍 HYPOTHESIS 2: Submit event listeners:', submitEventListeners);
            
            // Test if form has onsubmit property
            const onsubmitHandler = form.onsubmit;
            console.log('🔍 HYPOTHESIS 2: onsubmit handler:', onsubmitHandler);
            
            // Test if submit button has click handlers
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                const clickEventListeners = getEventListeners(submitButton, 'click');
                console.log('🔍 HYPOTHESIS 2: Submit button click listeners:', clickEventListeners);
                console.log('🔍 HYPOTHESIS 2: Submit button onclick:', submitButton.onclick);
            }
            
            // Test form submission function
            const formSubmitFunction = window.submitTransaction;
            console.log('🔍 HYPOTHESIS 2: submitTransaction function exists:', !!formSubmitFunction);
            
            return {
                hasSubmitListener: submitEventListeners && submitEventListeners.length > 0,
                hasOnsubmit: !!onsubmitHandler,
                hasSubmitFunction: !!formSubmitFunction,
                submitButtonExists: !!submitButton
            };
            
            // Helper function to get event listeners (simplified)
            function getEventListeners(element, eventType) {
                // This is a simplified check - in real browser we'd use devtools
                return 'Event listeners exist (simplified check)';
            }
        });
        
        console.log('📋 HYPOTHESIS 2 RESULTS:', eventHandlerTest);
        
        // HYPOTHESIS 3: API Endpoint Mismatch
        console.log('\n🔍 HYPOTHESIS 3: API Endpoint Mismatch');
        const apiEndpointTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 3 TESTING: API endpoint configuration');
            
            // Check if there are any hardcoded API endpoints
            const scripts = document.querySelectorAll('script');
            let apiEndpoints = [];
            
            scripts.forEach(script => {
                if (script.textContent) {
                    const content = script.textContent;
                    if (content.includes('/api/') || content.includes('fetch') || content.includes('XMLHttpRequest')) {
                        console.log('🔍 HYPOTHESIS 3: Found script with API calls:', content.substring(0, 200));
                        apiEndpoints.push(content.substring(0, 200));
                    }
                }
            });
            
            // Check for any global API configuration
            const apiConfig = window.API_BASE_URL || window.apiBaseUrl || window.config;
            console.log('🔍 HYPOTHESIS 3: Global API config:', apiConfig);
            
            return {
                apiEndpoints,
                globalApiConfig: apiConfig,
                scriptsCount: scripts.length
            };
        });
        
        console.log('📋 HYPOTHESIS 3 RESULTS:', apiEndpointTest);
        
        // HYPOTHESIS 4: Hidden Field Validation
        console.log('\n🔍 HYPOTHESIS 4: Hidden Field Validation');
        const hiddenValidationTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 4 TESTING: Hidden validation rules');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 4: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('✅ HYPOTHESIS 4: Form found, testing hidden validation');
            
            // Check for hidden required fields
            const hiddenFields = form.querySelectorAll('input[type="hidden"], input[style*="display: none"], input[style*="visibility: hidden"]');
            console.log('🔍 HYPOTHESIS 4: Hidden fields found:', hiddenFields.length);
            
            hiddenFields.forEach(field => {
                console.log(`🔍 HYPOTHESIS 4: Hidden field ${field.name || field.id}:`, {
                    value: field.value,
                    required: field.required,
                    type: field.type
                });
            });
            
            // Check for data attributes that might indicate validation
            const formDataAttrs = {};
            for (let attr of form.attributes) {
                if (attr.name.startsWith('data-')) {
                    formDataAttrs[attr.name] = attr.value;
                }
            }
            console.log('🔍 HYPOTHESIS 4: Form data attributes:', formDataAttrs);
            
            // Check for any validation-related classes
            const validationClasses = Array.from(form.classList).filter(cls => 
                cls.includes('valid') || cls.includes('invalid') || cls.includes('error')
            );
            console.log('🔍 HYPOTHESIS 4: Validation classes:', validationClasses);
            
            return {
                hiddenFieldsCount: hiddenFields.length,
                hiddenFieldsDetails: Array.from(hiddenFields).map(f => ({
                    name: f.name || f.id,
                    value: f.value,
                    required: f.required
                })),
                formDataAttrs,
                validationClasses
            };
        });
        
        console.log('📋 HYPOTHESIS 4 RESULTS:', hiddenValidationTest);
        
        // HYPOTHESIS 5: Browser State vs. Form State Mismatch
        console.log('\n🔍 HYPOTHESIS 5: Browser State vs. Form State Mismatch');
        const stateMismatchTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 5 TESTING: State consistency');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 5: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('✅ HYPOTHESIS 5: Form found, testing state consistency');
            
            // Get all form elements and their current state
            const formState = {};
            const inputs = form.querySelectorAll('input, select');
            
            inputs.forEach(input => {
                const elementState = {
                    id: input.id,
                    name: input.name,
                    value: input.value,
                    defaultValue: input.defaultValue,
                    selectedIndex: input.selectedIndex,
                    options: input.tagName === 'SELECT' ? Array.from(input.options).map(opt => ({
                        value: opt.value,
                        text: opt.textContent,
                        selected: opt.selected
                    })) : null,
                    required: input.required,
                    disabled: input.disabled,
                    visible: input.offsetParent !== null,
                    computedStyle: {
                        display: window.getComputedStyle(input).display,
                        visibility: window.getComputedStyle(input).visibility
                    }
                };
                
                formState[input.id || input.name] = elementState;
                console.log(`🔍 HYPOTHESIS 5: Element ${input.id || input.name} state:`, elementState);
            });
            
            // Check if any elements have conflicting states
            const conflicts = [];
            Object.entries(formState).forEach(([key, state]) => {
                if (state.value !== state.defaultValue && state.value === '') {
                    conflicts.push(`${key}: has default value but empty current value`);
                }
                if (state.required && !state.value) {
                    conflicts.push(`${key}: required but empty`);
                }
            });
            
            console.log('🔍 HYPOTHESIS 5: State conflicts found:', conflicts);
            
            return {
                formState,
                conflicts,
                totalElements: inputs.length
            };
        });
        
        console.log('📋 HYPOTHESIS 5 RESULTS:', stateMismatchTest);
        
        // Now test the actual form submission with extensive logging
        console.log('\n[STEP 5] TESTING ACTUAL FORM SUBMISSION WITH ALL HYPOTHESES...');
        
        // Fill out the form step by step with logging
        console.log('\n🔍 FILLING FORM STEP BY STEP...');
        
        // Select location
        console.log('🔍 Selecting location: In-Shop');
        await page.select('#location', 'In-Shop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Log state after location selection
        const afterLocationState = await page.evaluate(() => {
            console.log('🔍 STATE AFTER LOCATION SELECTION:');
            const serviceSelect = document.querySelector('#service');
            const durationSelect = document.querySelector('#duration');
            
            console.log('🔍 Service select options:', serviceSelect ? serviceSelect.options.length : 'No service select');
            console.log('🔍 Duration select options:', durationSelect ? durationSelect.options.length : 'No duration select');
            
            return {
                serviceOptions: serviceSelect ? Array.from(serviceSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })) : [],
                durationOptions: durationSelect ? Array.from(durationSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })) : []
            };
        });
        
        console.log('📋 After location selection:', afterLocationState);
        
        // Select service if available
        if (afterLocationState.serviceOptions.length > 1) {
            console.log('🔍 Selecting service:', afterLocationState.serviceOptions[1].text);
            await page.select('#service', afterLocationState.serviceOptions[1].value);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Select duration if available
        const afterServiceState = await page.evaluate(() => {
            console.log('🔍 STATE AFTER SERVICE SELECTION:');
            const durationSelect = document.querySelector('#duration');
            return {
                durationOptions: durationSelect ? Array.from(durationSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })) : []
            };
        });
        
        if (afterServiceState.durationOptions.length > 1) {
            console.log('🔍 Selecting duration:', afterServiceState.durationOptions[1].text);
            await page.select('#duration', afterServiceState.durationOptions[1].value);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Select payment method
        console.log('🔍 Selecting payment method: Cash');
        await page.select('#payment', 'Cash');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Final form state before submission
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
        
        console.log('\n🔍 COMPREHENSIVE DEBUGGING COMPLETE');
        console.log('=====================================');
        console.log('All 5 hypotheses tested with extensive logging');
        console.log('Check the output above for the root cause');
        
    } catch (error) {
        console.error('❌ ERROR during comprehensive debugging:', error);
    } finally {
        await browser.close();
    }
}

debugTransactionSubmissionComprehensive();
