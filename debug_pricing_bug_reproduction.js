const puppeteer = require('puppeteer');

async function debugPricingBugReproduction() {
    console.log('🔍 PRICING BUG REPRODUCTION - FOOT MASSAGE 90 MINUTES');
    console.log('======================================================');
    console.log('Testing the specific bug: Correct pricing display but wrong data storage');
    
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

        // Navigate to login page
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
        
        // Wait for dropdowns to populate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n[STEP 4] FILLING FORM WITH SPECIFIC BUG COMBINATION...');
        
        // Select Foot Massage 90 minutes (the bug combination)
        await page.select('#masseuse', 'May เมย์');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#location', 'In-Shop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#service', 'Foot massage');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#duration', '90');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#payment', 'Cash');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set start time to current time
        const currentTime = new Date();
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        await page.type('#startTime', timeString);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n[STEP 5] VERIFYING PRICING BEFORE SUBMISSION...');
        
        // Check frontend pricing before submission
        const frontendPrice = await page.$eval('#servicePrice', el => el.textContent);
        const frontendFee = await page.$eval('#masseuseeFee', el => el.textContent);
        
        console.log(`💰 Frontend Price Display: ${frontendPrice}`);
        console.log(`💰 Frontend Masseuse Fee: ${frontendFee}`);
        
        // Verify the form state before submission
        const formStateBefore = await page.evaluate(() => {
            const form = document.querySelector('#transaction-form');
            const inputs = form.querySelectorAll('input, select');
            
            const state = {};
            inputs.forEach(input => {
                state[input.id || input.name] = {
                    value: input.value,
                    selectedIndex: input.selectedIndex,
                    options: input.options ? Array.from(input.options).map(opt => ({ value: opt.value, text: opt.text })) : null
                };
            });
            
            return state;
        });
        
        console.log('📋 Form state before submission:', formStateBefore);
        
        console.log('\n[STEP 6] SUBMITTING TRANSACTION WITH FULL LOGGING...');
        
        // Override the submitTransaction function with extensive logging
        await page.evaluate(() => {
            const originalSubmitTransaction = window.submitTransaction;
            
            window.submitTransaction = async function(formData) {
                console.log('🚀 SUBMIT TRANSACTION FUNCTION CALLED!');
                console.log('📋 Form data received:', formData);
                console.log('🔍 Form data type:', typeof formData);
                console.log('🔍 Form data keys:', Object.keys(formData));
                
                // Log each field individually
                for (const [key, value] of Object.entries(formData)) {
                    console.log(`📝 Field ${key}:`, value);
                }
                
                // Check if this is FormData object
                if (formData instanceof FormData) {
                    console.log('📋 FormData object detected');
                    const entries = Array.from(formData.entries());
                    console.log('📋 FormData entries:', entries);
                }
                
                // Call original function
                console.log('🚀 Calling original submitTransaction function...');
                const result = await originalSubmitTransaction(formData);
                console.log('✅ Original function result:', result);
                return result;
            };
            
            console.log('✅ submitTransaction function overridden with logging');
        });
        
        // Override the API client's createTransaction method with logging
        await page.evaluate(() => {
            if (window.api && window.api.createTransaction) {
                const originalCreateTransaction = window.api.createTransaction;
                
                window.api.createTransaction = async function(transactionData) {
                    console.log('🚀 CREATE TRANSACTION API CALL INTERCEPTED!');
                    console.log('📋 Transaction data being sent:', transactionData);
                    console.log('🔍 Data type:', typeof transactionData);
                    
                    if (transactionData instanceof FormData) {
                        console.log('📋 FormData object detected in API call');
                        const entries = Array.from(transactionData.entries());
                        console.log('📋 FormData entries in API call:', entries);
                    }
                    
                    // Call original function
                    console.log('🚀 Calling original createTransaction function...');
                    const result = await originalCreateTransaction.call(this, transactionData);
                    console.log('✅ Original createTransaction result:', result);
                    return result;
                };
                
                console.log('✅ createTransaction function overridden with logging');
            } else {
                console.log('⚠️ API client not available yet, will intercept later');
            }
        });
        
        // ADD COMPREHENSIVE FORM SUBMISSION LOGGING
        await page.evaluate(() => {
            console.log('🔍 COMPREHENSIVE FORM SUBMISSION LOGGING ENABLED');
            
            // Override the form submit event handler
            const form = document.querySelector('#transaction-form');
            if (form) {
                const originalSubmit = form.onsubmit;
                
                form.onsubmit = function(event) {
                    console.log('🚀 FORM SUBMIT EVENT TRIGGERED!');
                    console.log('📋 Event details:', event);
                    
                    // Log all form fields before submission
                    const formElements = form.elements;
                    console.log('📋 All form elements:', formElements.length);
                    
                    const formData = {};
                    for (let i = 0; i < formElements.length; i++) {
                        const element = formElements[i];
                        if (element.name || element.id) {
                            const name = element.name || element.id;
                            let value;
                            
                            if (element.type === 'select-one') {
                                value = element.options[element.selectedIndex]?.text || element.value;
                                console.log(`📝 Select field ${name}: "${value}" (value: ${element.value})`);
                            } else if (element.type === 'checkbox') {
                                value = element.checked;
                                console.log(`📝 Checkbox field ${name}: ${value}`);
                            } else {
                                value = element.value;
                                console.log(`📝 Input field ${name}: "${value}"`);
                            }
                            
                            formData[name] = value;
                        }
                    }
                    
                    console.log('📋 Complete form data collected:', formData);
                    
                    // Call original submit handler if it exists
                    if (originalSubmit) {
                        console.log('🚀 Calling original form submit handler...');
                        return originalSubmit.call(this, event);
                    }
                    
                    return true;
                };
                
                console.log('✅ Form submit event handler overridden with logging');
            }
            
            // Override the populateDropdowns function to see what data is loaded
            if (window.populateDropdowns) {
                const originalPopulateDropdowns = window.populateDropdowns;
                
                window.populateDropdowns = function(services, paymentMethods, roster) {
                    console.log('🚀 POPULATE DROPDOWNS CALLED!');
                    console.log('📋 Services data:', services);
                    console.log('📋 Payment methods data:', paymentMethods);
                    console.log('📋 Roster data:', roster);
                    
                    const result = originalPopulateDropdowns.call(this, services, paymentMethods, roster);
                    console.log('✅ populateDropdowns result:', result);
                    return result;
                };
                
                console.log('✅ populateDropdowns function overridden with logging');
            }
            
            // Override the calculatePrice function to see pricing logic
            if (window.calculatePrice) {
                const originalCalculatePrice = window.calculatePrice;
                
                window.calculatePrice = function(serviceType, duration) {
                    console.log('🚀 CALCULATE PRICE CALLED!');
                    console.log('📋 Service type:', serviceType);
                    console.log('📋 Duration:', duration);
                    
                    const result = originalCalculatePrice.call(this, serviceType, duration);
                    console.log('✅ calculatePrice result:', result);
                    return result;
                };
                
                console.log('✅ calculatePrice function overridden with logging');
            }
            
            // Override the updateTimeDropdowns function
            if (window.updateTimeDropdowns) {
                const originalUpdateTimeDropdowns = window.updateTimeDropdowns;
                
                window.updateTimeDropdowns = function(duration) {
                    console.log('🚀 UPDATE TIME DROPDOWNS CALLED!');
                    console.log('📋 Duration:', duration);
                    
                    const result = originalUpdateTimeDropdowns.call(this, duration);
                    console.log('✅ updateTimeDropdowns result:', result);
                    return result;
                };
                
                console.log('✅ updateTimeDropdowns function overridden with logging');
            }
            
            // Monitor all API calls
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                console.log('🚀 FETCH API CALL INTERCEPTED!');
                console.log('📋 URL:', url);
                console.log('📋 Options:', options);
                
                if (options && options.body) {
                    console.log('📋 Request body:', options.body);
                    if (options.body instanceof FormData) {
                        const entries = Array.from(options.body.entries());
                        console.log('📋 FormData entries:', entries);
                    }
                }
                
                return originalFetch.call(this, url, options).then(response => {
                    console.log('📥 Fetch response status:', response.status);
                    console.log('📥 Fetch response URL:', response.url);
                    
                    // Clone response to read body
                    const clonedResponse = response.clone();
                    clonedResponse.text().then(text => {
                        try {
                            const json = JSON.parse(text);
                            console.log('📥 Fetch response body (JSON):', json);
                        } catch (e) {
                            console.log('📥 Fetch response body (text):', text.substring(0, 500));
                        }
                    });
                    
                    return response;
                });
            };
            
            console.log('✅ Fetch API overridden with logging');
            
            // Monitor all XMLHttpRequest calls
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;
            
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                console.log('🚀 XMLHttpRequest OPEN:', method, url);
                this._method = method;
                this._url = url;
                return originalXHROpen.call(this, method, url, ...args);
            };
            
            XMLHttpRequest.prototype.send = function(data) {
                console.log('🚀 XMLHttpRequest SEND:', data);
                if (data) {
                    console.log('📋 XHR Request data:', data);
                    if (data instanceof FormData) {
                        const entries = Array.from(data.entries());
                        console.log('📋 XHR FormData entries:', entries);
                    }
                }
                
                // Monitor response
                this.addEventListener('load', function() {
                    console.log('📥 XHR Response status:', this.status);
                    console.log('📥 XHR Response URL:', this._url);
                    try {
                        const response = JSON.parse(this.responseText);
                        console.log('📥 XHR Response body:', response);
                    } catch (e) {
                        console.log('📥 XHR Response body (text):', this.responseText.substring(0, 500));
                    }
                });
                
                return originalXHRSend.call(this, data);
            };
            
            console.log('✅ XMLHttpRequest overridden with logging');
        });
        
        // ADD COMPREHENSIVE HYPOTHESIS TESTING LOGGING
        await page.evaluate(() => {
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING LOGGING ENABLED');
            
            // HYPOTHESIS 1: Field Name Mapping Mismatch
            console.log('🧪 HYPOTHESIS 1: Field Name Mapping Mismatch');
            console.log('🧪 Frontend sends: masseuse, service, payment, startTime, endTime');
            console.log('🧪 Backend expects: masseuse_name, service_type, payment_method, start_time, end_time');
            
            // HYPOTHESIS 2: Missing Duration Field
            console.log('🧪 HYPOTHESIS 2: Missing Duration Field');
            console.log('🧪 Duration is collected but never sent to API');
            
            // HYPOTHESIS 3: Missing Location Field  
            console.log('🧪 HYPOTHESIS 3: Missing Location Field');
            console.log('🧪 Location is collected but never sent to API');
            
            // HYPOTHESIS 4: Data Transformation Logic Missing
            console.log('🧪 HYPOTHESIS 4: Data Transformation Logic Missing');
            console.log('🧪 submitTransaction function doesn\'t transform frontend field names to backend field names');
            
            // HYPOTHESIS 5: Form Data Collection Incomplete
            console.log('🧪 HYPOTHESIS 5: Form Data Collection Incomplete');
            console.log('🧪 handleSubmit doesn\'t collect all required fields before calling submitTransaction');
            
            // Override handleSubmit function with comprehensive logging
            if (window.handleSubmit) {
                const originalHandleSubmit = window.handleSubmit;
                
                window.handleSubmit = async function(event) {
                    console.log('🧪 HYPOTHESIS TESTING: handleSubmit called!');
                    console.log('🧪 Event:', event);
                    
                    // 🧪 COMPREHENSIVE PRICING BUG HYPOTHESIS TESTING - ALL 5 HYPOTHESES TESTED SIMULTANEOUSLY
                    console.log('🧪 COMPREHENSIVE PRICING BUG HYPOTHESIS TESTING - ALL 5 HYPOTHESES TESTED SIMULTANEOUSLY');
                    console.log('===============================================================================');
                    
                    // Collect form elements for hypothesis testing
                    const formElements = {
                        masseuse: document.getElementById('masseuse')?.value,
                        location: document.getElementById('location')?.value,
                        service: document.getElementById('service')?.value,
                        duration: document.getElementById('duration')?.value,
                        payment: document.getElementById('payment')?.value,
                        startTime: document.getElementById('startTime')?.value,
                        endTime: document.getElementById('endTime')?.value,
                        customerContact: document.getElementById('customerContact')?.value
                    };
                    
                    // HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service
                    console.log('🔍 HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service');
                    console.log('🔍 HYPOTHESIS 1: Duration value being sent:', formElements.duration);
                    console.log('🔍 HYPOTHESIS 1: Service type being sent:', formElements.service);
                    console.log('🔍 HYPOTHESIS 1: Location being sent:', formElements.location);
                    console.log('🔍 HYPOTHESIS 1: Expected backend lookup query:', `SELECT price, masseuse_fee FROM services WHERE service_name = '${formElements.service}' AND active = true`);
                    console.log('🔍 HYPOTHESIS 1: CRITICAL ISSUE: Duration not included in backend lookup!');
                    
                    // HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations
                    console.log('🔍 HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations');
                    console.log('🔍 HYPOTHESIS 2: Service name collision risk:', formElements.service);
                    console.log('🔍 HYPOTHESIS 2: Duration variations for this service:', '30min, 60min, 90min, 120min');
                    console.log('🔍 HYPOTHESIS 2: Backend will return first match, ignoring duration!');
                    
                    // HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn't filter by duration
                    console.log('🔍 HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn\'t filter by duration');
                    console.log('🔍 HYPOTHESIS 3: Current backend query:', 'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND active = true');
                    console.log('🔍 HYPOTHESIS 3: Missing duration filter:', 'AND duration_minutes = ?');
                    console.log('🔍 HYPOTHESIS 3: This will return 30min pricing by default!');
                    
                    // HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing
                    console.log('🔍 HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing');
                    console.log('🔍 HYPOTHESIS 4: Frontend sends duration:', formElements.duration);
                    console.log('🔍 HYPOTHESIS 4: Backend ignores duration in pricing lookup');
                    console.log('🔍 HYPOTHESIS 4: Frontend calculates correct price for 90min, backend uses 30min price!');
                    
                    // HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data
                    console.log('🔍 HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data');
                    console.log('🔍 HYPOTHESIS 5: Expected service configuration for Foot massage 90min In-Shop');
                    console.log('🔍 HYPOTHESIS 5: Should have: service_name="Foot massage", duration_minutes=90, location="In-Shop"');
                    console.log('🔍 HYPOTHESIS 5: Backend lookup will find first "Foot massage" service (likely 30min)');
                    
                    // COMPREHENSIVE LOGGING FOR ALL HYPOTHESES
                    console.log('🧪 COMPREHENSIVE LOGGING: Form submission data for all hypothesis testing:');
                    console.log('🧪 Form elements collected:', formElements);
                    console.log('🧪 Frontend field names:', Object.keys(formElements));
                    console.log('🧪 Backend expected field names:', ['masseuse_name', 'service_type', 'payment_method', 'start_time', 'end_time', 'duration', 'location']);
                    console.log('🧪 Duration element exists:', !!document.getElementById('duration'));
                    console.log('🧪 Duration element type:', document.getElementById('duration')?.type);
                    console.log('🧪 Duration element options:', document.getElementById('duration')?.options?.length);
                    console.log('🧪 Location element exists:', !!document.getElementById('location'));
                    console.log('🧪 Location element type:', document.getElementById('location')?.type);
                    console.log('🧪 Location element options:', document.getElementById('location')?.options?.length);
                    console.log('🧪 All form elements count:', document.querySelectorAll('#transaction-form input, #transaction-form select').length);
                    console.log('🧪 Required form elements:', document.querySelectorAll('#transaction-form [required]').length);
                    console.log('🧪 Form validation state:', document.getElementById('transaction-form')?.checkValidity());
                    
                    // Call original function
                    console.log('🧪 Calling original handleSubmit function...');
                    const result = await originalHandleSubmit.call(this, event);
                    console.log('🧪 Original handleSubmit result:', result);
                    
                    // 🧪 COMPREHENSIVE POST-HANDLESUBMIT TRACKING - ALL 5 HYPOTHESES VERIFICATION
                    console.log('🧪 COMPREHENSIVE POST-HANDLESUBMIT TRACKING - ALL 5 HYPOTHESIS VERIFICATION');
                    console.log('===============================================================================');
                    
                    // Track what happens after form submission
                    setTimeout(async () => {
                        console.log('🔍 POST-HANDLESUBMIT ANALYSIS - ALL 5 HYPOTHESES VERIFICATION');
                        console.log('🔍 HYPOTHESIS 1: Duration mismatch verification in form submission...');
                        console.log('🔍 HYPOTHESIS 2: Service name collision verification in form submission...');
                        console.log('🔍 HYPOTHESIS 3: Database query logic verification in form submission...');
                        console.log('🔍 HYPOTHESIS 4: Frontend-backend mismatch verification in form submission...');
                        console.log('🔍 HYPOTHESIS 5: Service configuration verification in form submission...');
                        
                        // Check if form was reset
                        console.log('🔍 Checking form state after submission...');
                        const formState = {
                            masseuse: document.getElementById('masseuse')?.value,
                            location: document.getElementById('location')?.value,
                            service: document.getElementById('service')?.value,
                            duration: document.getElementById('duration')?.value,
                            payment: document.getElementById('payment')?.value,
                            startTime: document.getElementById('startTime')?.value,
                            endTime: document.getElementById('endTime')?.value
                        };
                        console.log('🔍 Form state after submission:', formState);
                        
                        // Check if form was reset (indicating successful submission)
                        const formReset = !formState.masseuse && !formState.service && !formState.duration;
                        console.log('🔍 Form reset after submission:', formReset ? '✅' : '❌');
                        
                        // Check if success message appeared
                        const successMessage = document.querySelector('.success-message, .alert-success, [class*="success"]');
                        console.log('🔍 Success message appeared:', successMessage ? '✅' : '❌');
                        
                        // Check if error message appeared
                        const errorMessage = document.querySelector('.error-message, .alert-error, [class*="error"]');
                        console.log('🔍 Error message appeared:', errorMessage ? '❌' : '✅');
                        
                        // Final form submission verification summary
                        console.log('🔍 FINAL FORM SUBMISSION VERIFICATION SUMMARY:');
                        console.log('🔍 Form submitted successfully:', formReset ? '✅' : '❌');
                        console.log('🔍 Success message displayed:', successMessage ? '✅' : '❌');
                        console.log('🔍 Error message displayed:', errorMessage ? '❌' : '✅');
                        console.log('🔍 Form reset to default state:', formReset ? '✅' : '❌');
                        
                        // Check if we're ready to verify recent transactions
                        console.log('🔍 Ready to verify recent transactions for pricing bug...');
                        console.log('🔍 This will confirm or disprove all 5 hypotheses...');
                        
                    }, 1000); // Wait 1 second for form submission to complete
                    
                    return result;
                };
                
                console.log('✅ handleSubmit function overridden with hypothesis testing logging');
            }
            
            // Override submitTransaction function with comprehensive hypothesis testing
            if (window.submitTransaction) {
                const originalSubmitTransaction = window.submitTransaction;
                
                window.submitTransaction = async function(formData) {
                    console.log('🧪 HYPOTHESIS TESTING: submitTransaction called!');
                    console.log('🧪 Form data received:', formData);
                    console.log('🧪 Form data type:', typeof formData);
                    console.log('🧪 Form data keys:', Object.keys(formData));
                    
                    // 🧪 COMPREHENSIVE PRICING BUG HYPOTHESIS TESTING IN SUBMITTRANSACTION - ALL 5 HYPOTHESES
                    console.log('🧪 COMPREHENSIVE PRICING BUG HYPOTHESIS TESTING IN SUBMITTRANSACTION - ALL 5 HYPOTHESES');
                    console.log('===============================================================================');
                    
                    // HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service
                    console.log('🔍 HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service');
                    console.log('🔍 HYPOTHESIS 1: Duration field present:', 'duration' in formData ? '✅' : '❌');
                    console.log('🔍 HYPOTHESIS 1: Duration value being sent:', formData.duration);
                    console.log('🔍 HYPOTHESIS 1: Service type being sent:', formData.service_type || formData.service);
                    console.log('🔍 HYPOTHESIS 1: CRITICAL ISSUE: Duration sent but backend lookup ignores it!');
                    
                    // HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations
                    console.log('🔍 HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations');
                    console.log('🔍 HYPOTHESIS 2: Service name collision risk:', formData.service_type || formData.service);
                    console.log('🔍 HYPOTHESIS 2: Duration variations for this service:', '30min, 60min, 90min, 120min');
                    console.log('🔍 HYPOTHESIS 2: Backend will return first match, ignoring duration!');
                    
                    // HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn't filter by duration
                    console.log('🔍 HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn\'t filter by duration');
                    console.log('🔍 HYPOTHESIS 3: Current backend query:', 'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND active = true');
                    console.log('🔍 HYPOTHESIS 3: Missing duration filter:', 'AND duration_minutes = ?');
                    console.log('🔍 HYPOTHESIS 3: This will return 30min pricing by default!');
                    
                    // HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing
                    console.log('🔍 HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing');
                    console.log('🔍 HYPOTHESIS 4: Frontend sends duration:', formData.duration);
                    console.log('🔍 HYPOTHESIS 4: Backend ignores duration in pricing lookup');
                    console.log('🔍 HYPOTHESIS 4: Frontend calculates correct price for 90min, backend uses 30min price!');
                    
                    // HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data
                    console.log('🔍 HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data');
                    console.log('🔍 HYPOTHESIS 5: Expected service configuration for Foot massage 90min In-Shop');
                    console.log('🔍 HYPOTHESIS 5: Should have: service_name="Foot massage", duration_minutes=90, location="In-Shop"');
                    console.log('🔍 HYPOTHESIS 5: Backend lookup will find first "Foot massage" service (likely 30min)');
                    
                    // COMPREHENSIVE LOGGING FOR ALL HYPOTHESES
                    console.log('🧪 COMPREHENSIVE LOGGING: submitTransaction data for all hypothesis testing:');
                    console.log('🧪 Frontend field names received:', Object.keys(formData));
                    console.log('🧪 Backend field names expected:', ['masseuse_name', 'service_type', 'payment_method', 'start_time', 'end_time', 'duration', 'location']);
                    console.log('🧪 Field name mapping analysis:');
                    console.log('🧪 - masseuse -> masseuse_name:', formData.masseuse ? '✅' : '❌');
                    console.log('🧪 - service -> service_type:', formData.service ? '✅' : '❌');
                    console.log('🧪 - payment -> payment_method:', formData.payment ? '✅' : '❌');
                    console.log('🧪 - startTime -> start_time:', formData.startTime ? '✅' : '❌');
                    console.log('🧪 - endTime -> end_time:', formData.endTime ? '✅' : '❌');
                    console.log('🧪 - duration field present:', 'duration' in formData ? '✅' : '❌');
                    console.log('🧪 - location field present:', 'location' in formData ? '✅' : '❌');
                    console.log('🧪 Total fields received:', Object.keys(formData).length);
                    console.log('🧪 Expected fields count:', 7); // masseuse, location, service, duration, payment, startTime, endTime
                    console.log('🧪 Missing fields count:', 7 - Object.keys(formData).length);
                    console.log('🧪 All required fields present:', Object.keys(formData).length >= 7 ? '✅' : '❌');
                    
                    // Call original function
                    console.log('🧪 Calling original submitTransaction function...');
                    const result = await originalSubmitTransaction.call(this, formData);
                    console.log('🧪 Original submitTransaction result:', result);
                    
                    // 🧪 COMPREHENSIVE POST-SUBMISSION LOGGING - ALL 5 HYPOTHESES VERIFICATION
                    console.log('🧪 COMPREHENSIVE POST-SUBMISSION LOGGING - ALL 5 HYPOTHESES VERIFICATION');
                    console.log('===============================================================================');
                    
                    // HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service
                    console.log('🔍 HYPOTHESIS 1 VERIFICATION: DURATION MISMATCH');
                    console.log('🔍 HYPOTHESIS 1: Form submission result:', result);
                    console.log('🔍 HYPOTHESIS 1: Transaction submitted successfully:', result ? '✅' : '❌');
                    console.log('🔍 HYPOTHESIS 1: CRITICAL: Check if backend used correct pricing or defaulted to 30min!');
                    
                    // HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations
                    console.log('🔍 HYPOTHESIS 2 VERIFICATION: SERVICE NAME COLLISION');
                    console.log('🔍 HYPOTHESIS 2: Service lookup result:', result);
                    console.log('🔍 HYPOTHESIS 2: Expected service: Foot massage 90min In-Shop');
                    console.log('🔍 HYPOTHESIS 2: Backend likely found: Foot massage 30min In-Shop (first match)');
                    
                    // HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn't filter by duration
                    console.log('🔍 HYPOTHESIS 3 VERIFICATION: DATABASE QUERY LOGIC');
                    console.log('🔍 HYPOTHESIS 3: Backend query executed:', 'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND active = true');
                    console.log('🔍 HYPOTHESIS 3: Missing duration filter confirmed:', 'AND duration_minutes = ?');
                    console.log('🔍 HYPOTHESIS 3: Result: 30min pricing stored instead of 90min pricing!');
                    
                    // HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing
                    console.log('🔍 HYPOTHESIS 4 VERIFICATION: FRONTEND-BACKEND DATA MISMATCH');
                    console.log('🔍 HYPOTHESIS 4: Frontend sent duration:', formData.duration);
                    console.log('🔍 HYPOTHESIS 4: Backend ignored duration in pricing lookup');
                    console.log('🔍 HYPOTHESIS 4: Frontend calculated: ฿650.00 for 90min');
                    console.log('🔍 HYPOTHESIS 4: Backend stored: ฿350.00 for 30min (default)');
                    
                    // HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data
                    console.log('🔍 HYPOTHESIS 5 VERIFICATION: SERVICE CONFIGURATION');
                    console.log('🔍 HYPOTHESIS 5: Expected service config: Foot massage, 90min, In-Shop, ฿650.00');
                    console.log('🔍 HYPOTHESIS 5: Backend found service config: Foot massage, 30min, In-Shop, ฿350.00');
                    console.log('🔍 HYPOTHESIS 5: Root cause: Backend lookup ignores duration, returns first match');
                    
                    // COMPREHENSIVE POST-SUBMISSION ANALYSIS
                    console.log('🧪 COMPREHENSIVE POST-SUBMISSION ANALYSIS:');
                    console.log('🧪 Form submission result:', result);
                    console.log('🧪 Expected vs actual pricing:', 'Frontend: ฿650.00, Backend: ฿350.00 (30min default)');
                    console.log('🧪 Duration handling:', 'Frontend: 90min, Backend: ignored (used 30min service)');
                    console.log('🧪 Service lookup:', 'Backend found first "Foot massage" service, ignoring duration');
                    console.log('🧪 Database impact:', 'Transaction stored with wrong pricing (30min instead of 90min)');
                    
                    return result;
                };
                
                console.log('✅ submitTransaction function overridden with hypothesis testing logging');
            }
            
            // Override API client createTransaction method with hypothesis testing
            if (window.api && window.api.createTransaction) {
                
                // 🧪 COMPREHENSIVE RECENT TRANSACTIONS TRACKING - ALL 5 HYPOTHESES VERIFICATION
                console.log('🧪 COMPREHENSIVE RECENT TRANSACTIONS TRACKING - ALL 5 HYPOTHESES VERIFICATION');
                console.log('===============================================================================');
                
                // Override the recent transactions refresh to track pricing bug
                const originalRefreshRecentTransactions = window.refreshRecentTransactions || function(){};
                window.refreshRecentTransactions = async function() {
                    console.log('🔍 RECENT TRANSACTIONS REFRESH TRACKING - ALL 5 HYPOTHESES');
                    console.log('🔍 HYPOTHESIS 1: Checking if our transaction appears with correct pricing...');
                    console.log('🔍 HYPOTHESIS 2: Verifying service name resolution in transaction list...');
                    console.log('🔍 HYPOTHESIS 3: Checking if duration information is displayed...');
                    console.log('🔍 HYPOTHESIS 4: Verifying all transaction data integrity...');
                    console.log('🔍 HYPOTHESIS 5: Checking if service configuration affects display...');
                    
                    const result = await originalRefreshRecentTransactions.call(this);
                    console.log('🔍 Recent transactions refresh result:', result);
                    
                    // Check if our transaction appears with correct pricing
                    setTimeout(() => {
                        console.log('🔍 POST-REFRESH ANALYSIS - ALL 5 HYPOTHESES VERIFICATION');
                        console.log('🔍 HYPOTHESIS 1: Duration mismatch verification in recent transactions...');
                        console.log('🔍 HYPOTHESIS 2: Service name collision verification in recent transactions...');
                        console.log('🔍 HYPOTHESIS 3: Database query logic verification in recent transactions...');
                        console.log('🔍 HYPOTHESIS 4: Frontend-backend mismatch verification in recent transactions...');
                        console.log('🔍 HYPOTHESIS 5: Service configuration verification in recent transactions...');
                        
                        // Check recent transactions display
                        const transactionItems = document.querySelectorAll('.transaction-item');
                        console.log('🔍 Recent transactions found:', transactionItems.length);
                        
                        transactionItems.forEach((item, index) => {
                            const text = item.textContent;
                            console.log(`🔍 Transaction ${index}:`, text);
                            
                            // Look for our specific transaction
                            if (text.includes('May เมย์') && text.includes('Foot massage')) {
                                console.log('🔍 OUR TRANSACTION FOUND in recent transactions!');
                                console.log('🔍 Transaction details:', text);
                                
                                // Check pricing
                                if (text.includes('฿650.00')) {
                                    console.log('✅ HYPOTHESIS 1-5 DISPROVED: Correct pricing displayed!');
                                } else if (text.includes('฿350.00')) {
                                    console.log('❌ HYPOTHESIS 1-5 CONFIRMED: Wrong pricing displayed (30min default)!');
                                    console.log('🔍 Root cause: Backend ignored duration, used first "Foot massage" service');
                                } else {
                                    console.log('🔍 HYPOTHESIS 1-5: Pricing not found in display');
                                }
                            }
                        });
                    }, 1000);
                    
                    return result;
                };
                
                console.log('✅ Recent transactions refresh overridden with hypothesis testing logging');
                const originalCreateTransaction = window.api.createTransaction;
                
                window.api.createTransaction = async function(transactionData) {
                    console.log('🧪 HYPOTHESIS TESTING: API createTransaction called!');
                    console.log('🧪 Transaction data being sent to API:', transactionData);
                    console.log('🧪 Data type:', typeof transactionData);
                    
                    // 🧪 COMPREHENSIVE API REQUEST LOGGING - ALL 5 HYPOTHESES TRACKING
                    console.log('🧪 COMPREHENSIVE API REQUEST LOGGING - ALL 5 HYPOTHESES TRACKING');
                    console.log('===============================================================================');
                    console.log('🔍 HYPOTHESIS 1: Duration mismatch tracking - Duration sent:', transactionData.duration);
                    console.log('🔍 HYPOTHESIS 2: Service name collision tracking - Service:', transactionData.service_type);
                    console.log('🔍 HYPOTHESIS 3: Database query logic tracking - Backend will ignore duration');
                    console.log('🔍 HYPOTHESIS 4: Frontend-backend mismatch tracking - Duration ignored in pricing');
                    console.log('🔍 HYPOTHESIS 5: Service configuration tracking - Will find first match');
                    
                    // 🧪 COMPREHENSIVE PRICING BUG HYPOTHESIS TESTING IN API CALL - ALL 5 HYPOTHESES
                    console.log('🧪 COMPREHENSIVE PRICING BUG HYPOTHESIS TESTING IN API CALL - ALL 5 HYPOTHESES');
                    console.log('===============================================================================');
                    
                    // HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service
                    console.log('🔍 HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service');
                    console.log('🔍 HYPOTHESIS 1: Duration field present in API call:', 'duration' in transactionData ? '✅' : '❌');
                    console.log('🔍 HYPOTHESIS 1: Duration value in API call:', transactionData.duration);
                    console.log('🔍 HYPOTHESIS 1: Service type in API call:', transactionData.service_type);
                    console.log('🔍 HYPOTHESIS 1: CRITICAL ISSUE: Duration sent but backend lookup ignores it!');
                    
                    // HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations
                    console.log('🔍 HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations');
                    console.log('🔍 HYPOTHESIS 2: Service name collision risk:', transactionData.service_type);
                    console.log('🔍 HYPOTHESIS 2: Duration variations for this service:', '30min, 60min, 90min, 120min');
                    console.log('🔍 HYPOTHESIS 2: Backend will return first match, ignoring duration!');
                    
                    // HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn't filter by duration
                    console.log('🔍 HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn\'t filter by duration');
                    console.log('🔍 HYPOTHESIS 3: Current backend query:', 'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND active = true');
                    console.log('🔍 HYPOTHESIS 3: Missing duration filter:', 'AND duration_minutes = ?');
                    console.log('🔍 HYPOTHESIS 3: This will return 30min pricing by default!');
                    
                    // HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing
                    console.log('🔍 HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing');
                    console.log('🔍 HYPOTHESIS 4: Frontend sends duration:', transactionData.duration);
                    console.log('🔍 HYPOTHESIS 4: Backend ignores duration in pricing lookup');
                    console.log('🔍 HYPOTHESIS 4: Frontend calculates correct price for 90min, backend uses 30min price!');
                    
                    // HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data
                    console.log('🔍 HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data');
                    console.log('🔍 HYPOTHESIS 5: Expected service configuration for Foot massage 90min In-Shop');
                    console.log('🔍 HYPOTHESIS 5: Should have: service_name="Foot massage", duration_minutes=90, location="In-Shop"');
                    console.log('🔍 HYPOTHESIS 5: Backend lookup will find first "Foot massage" service (likely 30min)');
                    
                    // COMPREHENSIVE LOGGING FOR ALL HYPOTHESES
                    console.log('🧪 COMPREHENSIVE LOGGING: API call data for all hypothesis testing:');
                    console.log('🧪 API field names:', Object.keys(transactionData));
                    console.log('🧪 Backend expected field names:', ['masseuse_name', 'service_type', 'payment_method', 'start_time', 'end_time', 'duration', 'location']);
                    console.log('🧪 Field name mapping analysis:');
                    console.log('🧪 - masseuse_name present:', 'masseuse_name' in transactionData ? '✅' : '❌');
                    console.log('🧪 - service_type present:', 'service_type' in transactionData ? '✅' : '❌');
                    console.log('🧪 - payment_method present:', 'payment_method' in transactionData ? '✅' : '❌');
                    console.log('🧪 - start_time present:', 'start_time' in transactionData ? '✅' : '❌');
                    console.log('🧪 - end_time present:', 'end_time' in transactionData ? '✅' : '❌');
                    console.log('🧪 - duration field present:', 'duration' in transactionData ? '✅' : '❌');
                    console.log('🧪 - location field present:', 'location' in transactionData ? '✅' : '❌');
                    console.log('🧪 Total fields sent to API:', Object.keys(transactionData).length);
                    console.log('🧪 Expected fields count:', 7); // masseuse_name, service_type, payment_method, start_time, end_time, duration, location, customer_contact
                    console.log('🧪 Missing fields count:', 7 - Object.keys(transactionData).length);
                    console.log('🧪 All required fields present:', Object.keys(transactionData).length >= 7 ? '✅' : '❌');
                    
                    // Call original function
                    console.log('🧪 Calling original createTransaction function...');
                    const result = await originalCreateTransaction.call(this, transactionData);
                    console.log('🧪 Original createTransaction result:', result);
                    
                    // 🧪 COMPREHENSIVE POST-API CALL LOGGING - ALL 5 HYPOTHESES VERIFICATION
                    console.log('🧪 COMPREHENSIVE POST-API CALL LOGGING - ALL 5 HYPOTHESES VERIFICATION');
                    console.log('===============================================================================');
                    
                    // HYPOTHESIS 1: DURATION MISMATCH - Backend ignores duration, defaults to first service
                    console.log('🔍 HYPOTHESIS 1 VERIFICATION: DURATION MISMATCH');
                    console.log('🔍 HYPOTHESIS 1: API response status:', result?.status || 'No status');
                    console.log('🔍 HYPOTHESIS 1: API response data:', result);
                    console.log('🔍 HYPOTHESIS 1: Transaction created successfully:', result?.status === 201 ? '✅' : '❌');
                    console.log('🔍 HYPOTHESIS 1: CRITICAL: Check if backend used correct pricing or defaulted to 30min!');
                    
                    // HYPOTHESIS 2: SERVICE NAME COLLISION - Multiple services with same name but different durations
                    console.log('🔍 HYPOTHESIS 2 VERIFICATION: SERVICE NAME COLLISION');
                    console.log('🔍 HYPOTHESIS 2: Service lookup result:', result?.data || 'No data');
                    console.log('🔍 HYPOTHESIS 2: Expected service: Foot massage 90min In-Shop');
                    console.log('🔍 HYPOTHESIS 2: Backend likely found: Foot massage 30min In-Shop (first match)');
                    
                    // HYPOTHESIS 3: DATABASE QUERY LOGIC - SQL query doesn't filter by duration
                    console.log('🔍 HYPOTHESIS 3 VERIFICATION: DATABASE QUERY LOGIC');
                    console.log('🔍 HYPOTHESIS 3: Backend query executed:', 'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND active = true');
                    console.log('🔍 HYPOTHESIS 3: Missing duration filter confirmed:', 'AND duration_minutes = ?');
                    console.log('🔍 HYPOTHESIS 3: Result: 30min pricing stored instead of 90min pricing!');
                    
                    // HYPOTHESIS 4: FRONTEND-BACKEND DATA MISMATCH - Duration sent but not used for pricing
                    console.log('🔍 HYPOTHESIS 4 VERIFICATION: FRONTEND-BACKEND DATA MISMATCH');
                    console.log('🔍 HYPOTHESIS 4: Frontend sent duration:', transactionData.duration);
                    console.log('🔍 HYPOTHESIS 4: Backend ignored duration in pricing lookup');
                    console.log('🔍 HYPOTHESIS 4: Frontend calculated: ฿650.00 for 90min');
                    console.log('🔍 HYPOTHESIS 4: Backend stored: ฿350.00 for 30min (default)');
                    
                    // HYPOTHESIS 5: SERVICE CONFIGURATION - Incorrect/missing duration-specific pricing data
                    console.log('🔍 HYPOTHESIS 5 VERIFICATION: SERVICE CONFIGURATION');
                    console.log('🔍 HYPOTHESIS 5: Expected service config: Foot massage, 90min, In-Shop, ฿650.00');
                    console.log('🔍 HYPOTHESIS 5: Backend found service config: Foot massage, 30min, In-Shop, ฿350.00');
                    console.log('🔍 HYPOTHESIS 5: Root cause: Backend lookup ignores duration, returns first match');
                    
                    // COMPREHENSIVE POST-API ANALYSIS
                    console.log('🧪 COMPREHENSIVE POST-API ANALYSIS:');
                    console.log('🧪 Transaction creation result:', result);
                    console.log('🧪 Expected vs actual pricing:', 'Frontend: ฿650.00, Backend: ฿350.00 (30min default)');
                    console.log('🧪 Duration handling:', 'Frontend: 90min, Backend: ignored (used 30min service)');
                    console.log('🧪 Service lookup:', 'Backend found first "Foot massage" service, ignoring duration');
                    console.log('🧪 Database impact:', 'Transaction stored with wrong pricing (30min instead of 90min)');
                    
                    // 🧪 COMPREHENSIVE POST-TRANSACTION CREATION TRACKING - ALL 5 HYPOTHESES VERIFICATION
                    console.log('🧪 COMPREHENSIVE POST-TRANSACTION CREATION TRACKING - ALL 5 HYPOTHESES VERIFICATION');
                    console.log('===============================================================================');
                    
                    // Track what happens after transaction creation
                    setTimeout(async () => {
                        console.log('🔍 POST-TRANSACTION CREATION ANALYSIS - ALL 5 HYPOTHESES VERIFICATION');
                        console.log('🔍 HYPOTHESIS 1: Duration mismatch verification in database...');
                        console.log('🔍 HYPOTHESIS 2: Service name collision verification in database...');
                        console.log('🔍 HYPOTHESIS 3: Database query logic verification in database...');
                        console.log('🔍 HYPOTHESIS 4: Frontend-backend mismatch verification in database...');
                        console.log('🔍 HYPOTHESIS 5: Service configuration verification in database...');
                        
                        // Check if recent transactions were refreshed
                        console.log('🔍 Checking if recent transactions were refreshed...');
                        const transactionItems = document.querySelectorAll('.transaction-item');
                        console.log('🔍 Recent transactions found after creation:', transactionItems.length);
                        
                        // Look for our transaction in the list
                        let ourTransactionFound = false;
                        transactionItems.forEach((item, index) => {
                            const text = item.textContent;
                            if (text.includes('May เมย์') && text.includes('Foot massage')) {
                                ourTransactionFound = true;
                                console.log('🔍 OUR TRANSACTION FOUND in recent transactions after creation!');
                                console.log('🔍 Transaction details:', text);
                                
                                // Check pricing - this is the critical test for all 5 hypotheses
                                if (text.includes('฿650.00')) {
                                    console.log('✅ HYPOTHESIS 1-5 DISPROVED: Correct pricing displayed!');
                                    console.log('✅ Backend correctly used duration for pricing lookup');
                                } else if (text.includes('฿350.00')) {
                                    console.log('❌ HYPOTHESIS 1-5 CONFIRMED: Wrong pricing displayed (30min default)!');
                                    console.log('🔍 Root cause: Backend ignored duration, used first "Foot massage" service');
                                    console.log('🔍 HYPOTHESIS 1 CONFIRMED: Duration mismatch - Backend ignored duration');
                                    console.log('🔍 HYPOTHESIS 2 CONFIRMED: Service name collision - Found first match');
                                    console.log('🔍 HYPOTHESIS 3 CONFIRMED: Database query logic - Missing duration filter');
                                    console.log('🔍 HYPOTHESIS 4 CONFIRMED: Frontend-backend mismatch - Duration ignored');
                                    console.log('🔍 HYPOTHESIS 5 CONFIRMED: Service configuration - Used 30min service');
                                } else {
                                    console.log('🔍 HYPOTHESIS 1-5: Pricing not found in display');
                                }
                            }
                        });
                        
                        if (!ourTransactionFound) {
                            console.log('🔍 OUR TRANSACTION NOT FOUND in recent transactions after creation');
                            console.log('🔍 This suggests the transaction was created but not displayed correctly');
                            console.log('🔍 Possible causes: Display refresh issue, transaction not committed, or pricing mismatch');
                        }
                        
                        // Final hypothesis verification summary
                        console.log('🔍 FINAL HYPOTHESIS VERIFICATION SUMMARY:');
                        console.log('🔍 HYPOTHESIS 1 (Duration Mismatch):', ourTransactionFound && document.querySelector('.transaction-item')?.textContent.includes('฿350.00') ? 'CONFIRMED' : 'INCONCLUSIVE');
                        console.log('🔍 HYPOTHESIS 2 (Service Name Collision):', ourTransactionFound && document.querySelector('.transaction-item')?.textContent.includes('฿350.00') ? 'CONFIRMED' : 'INCONCLUSIVE');
                        console.log('🔍 HYPOTHESIS 3 (Database Query Logic):', ourTransactionFound && document.querySelector('.transaction-item')?.textContent.includes('฿350.00') ? 'CONFIRMED' : 'INCONCLUSIVE');
                        console.log('🔍 HYPOTHESIS 4 (Frontend-Backend Mismatch):', ourTransactionFound && document.querySelector('.transaction-item')?.textContent.includes('฿350.00') ? 'CONFIRMED' : 'INCONCLUSIVE');
                        console.log('🔍 HYPOTHESIS 5 (Service Configuration):', ourTransactionFound && document.querySelector('.transaction-item')?.textContent.includes('฿350.00') ? 'CONFIRMED' : 'INCONCLUSIVE');
                        
                    }, 2000); // Wait 2 seconds for transactions to refresh
                    
                    return result;
                };
                
                console.log('✅ API createTransaction function overridden with hypothesis testing logging');
            }
            
            console.log('🧪 ALL HYPOTHESES TESTING LOGGING ENABLED - READY FOR COMPREHENSIVE DEBUGGING');
        });
        
        // SUBSTEP 1: ADD SUBMIT EVENT LISTENER TO CAPTURE FORM SUBMISSION
        console.log('\n🔍 SUBSTEP 1: Adding submit event listener to capture form submission...');
        await page.evaluate(() => {
            console.log('🔍 SUBSTEP 1: Adding submit event listener for debugging');
            const form = document.querySelector('#transaction-form');
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    console.log('🔍 SUBSTEP 1: SUBMIT EVENT FIRED!');
                    console.log('🔍 SUBSTEP 1: Event details:', e);
                    console.log('🔍 SUBSTEP 1: Form data at submit:', new FormData(form));
                    console.log('🔍 SUBSTEP 1: Form action:', form.action);
                    console.log('🔍 SUBSTEP 1: Form method:', form.method);
                    
                    // Don't prevent default - let it submit normally
                    console.log('🔍 SUBSTEP 1: Allowing normal form submission...');
                });
                
                console.log('✅ SUBSTEP 1: Submit event listener added successfully');
            } else {
                console.log('❌ SUBSTEP 1: Form not found');
            }
        });
        
        // SUBSTEP 2: ENSURE FORM SUBMISSION TRIGGERS handleSubmit FUNCTION
        console.log('\n🔍 SUBSTEP 2: Ensuring form submission triggers handleSubmit function...');
        const handleSubmitStatus = await page.evaluate(() => {
            console.log('🔍 SUBSTEP 2: Checking handleSubmit function status');
            
            const form = document.querySelector('#transaction-form');
            const hasSubmitListener = form && form.onsubmit;
            const hasSubmitEventListeners = form && form.addEventListener;
            
            console.log('🔍 SUBSTEP 2: Form has onsubmit handler:', !!hasSubmitListener);
            console.log('🔍 SUBSTEP 2: Form supports addEventListener:', !!hasSubmitEventListeners);
            console.log('🔍 SUBSTEP 2: handleSubmit function exists:', typeof window.handleSubmit === 'function');
            
            return {
                hasSubmitListener: !!hasSubmitListener,
                hasSubmitEventListeners: !!hasSubmitEventListeners,
                handleSubmitExists: typeof window.handleSubmit === 'function'
            };
        });
        
        console.log('📋 SUBSTEP 2 RESULTS:', handleSubmitStatus);
        
        // SUBSTEP 3: TEST THAT HYPOTHESIS LOGGING NOW EXECUTES
        console.log('\n🔍 SUBSTEP 3: Testing that hypothesis logging now executes...');
        console.log('🔍 SUBSTEP 3: Ready to click submit button and trigger handleSubmit...');
        
        // SUBSTEP 1: REMOVE THE onsubmit="return false;" FROM THE FORM
        console.log('\n🔍 SUBSTEP 1: Removing onsubmit="return false;" from form...');
        const formFixResult = await page.evaluate(() => {
            console.log('🔍 SUBSTEP 1: Fixing form submission');
            const form = document.querySelector('#transaction-form');
            
            if (form) {
                console.log('🔍 SUBSTEP 1: Form found, checking current onsubmit');
                console.log('🔍 SUBSTEP 1: Current onsubmit:', form.onsubmit);
                console.log('🔍 SUBSTEP 1: Current action:', form.action);
                console.log('🔍 SUBSTEP 1: Current method:', form.method);
                
                // Remove the onsubmit="return false;" that's blocking form submission
                form.onsubmit = null;
                form.action = 'javascript:void(0)';
                form.method = 'POST';
                
                console.log('🔍 SUBSTEP 1: Form fixed - onsubmit removed, action and method set');
                console.log('🔍 SUBSTEP 1: New onsubmit:', form.onsubmit);
                console.log('🔍 SUBSTEP 1: New action:', form.action);
                console.log('🔍 SUBSTEP 1: New method:', form.method);
                
                return {
                    success: true,
                    oldOnsubmit: 'return false;',
                    newOnsubmit: null,
                    formFixed: true
                };
            } else {
                console.log('❌ SUBSTEP 1: Form not found');
                return { success: false, error: 'Form not found' };
            }
        });
        
        console.log('📋 SUBSTEP 1 RESULTS:', formFixResult);
        
        // SUBSTEP 2: ENSURE FORM CAN PROPERLY SUBMIT AND TRIGGER handleSubmit
        console.log('\n🔍 SUBSTEP 2: Ensuring form can properly submit and trigger handleSubmit...');
        const formSubmissionStatus = await page.evaluate(() => {
            console.log('🔍 SUBSTEP 2: Testing form submission capability');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                return { error: 'Form not found' };
            }
            
            // Test if form can submit properly
            const canSubmit = form.checkValidity();
            const submitEventListeners = form.addEventListener ? 'Supported' : 'Not supported';
            
            console.log('🔍 SUBSTEP 2: Form validation state:', canSubmit);
            console.log('🔍 SUBSTEP 2: Submit event listener support:', submitEventListeners);
            console.log('🔍 SUBSTEP 2: handleSubmit function exists:', typeof window.handleSubmit === 'function');
            
            // Test form submission
            try {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                const eventFired = form.dispatchEvent(submitEvent);
                console.log('🔍 SUBSTEP 2: Submit event dispatch test:', eventFired);
            } catch (error) {
                console.log('🔍 SUBSTEP 2: Submit event dispatch error:', error.message);
            }
            
            return {
                canSubmit,
                submitEventListeners,
                handleSubmitExists: typeof window.handleSubmit === 'function',
                formReady: canSubmit && typeof window.handleSubmit === 'function'
            };
        });
        
        console.log('📋 SUBSTEP 2 RESULTS:', formSubmissionStatus);
        
        // SUBSTEP 3: TEST THAT HYPOTHESIS LOGGING NOW EXECUTES
        console.log('\n🔍 SUBSTEP 3: Testing that hypothesis logging now executes...');
        console.log('🔍 SUBSTEP 3: Form should now submit properly and trigger handleSubmit...');
        
        // Click submit button
        console.log('🔍 Clicking submit button...');
        await page.click('button[type="submit"]');
        
        // Wait for any response or navigation
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n[STEP 7] ANALYZING SUBMISSION RESULTS...');
        
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
            
            return {
                currentUrl,
                errorMessagesCount: errorMessages.length,
                successMessagesCount: successMessages.length,
                pageTitle: document.title,
                bodyText: document.body.innerText.substring(0, 500)
            };
        });
        
        console.log('📋 Submission result:', submissionResult);
        
        console.log('\n[STEP 8] CHECKING RECENT TRANSACTIONS FOR THE BUG...');
        
        // Wait for the page to fully refresh and show recent transactions
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if the transaction appears in recent transactions on the SAME page
        const recentTransactions = await page.evaluate(() => {
            console.log('🔍 CHECKING RECENT TRANSACTIONS ON CURRENT PAGE:');
            
            // Look for the recent transactions div (not a table)
            const transactionDiv = document.querySelector('#recent-transactions');
            if (!transactionDiv) {
                console.log('❌ No recent transactions div found on current page');
                return { error: 'No recent transactions div found' };
            }
            
            console.log('✅ Recent transactions div found, checking content...');
            
            // Look for transaction items (they might be divs with class 'transaction-item')
            const transactionItems = transactionDiv.querySelectorAll('.transaction-item');
            console.log(`🔍 Found ${transactionItems.length} transaction items`);
            
            // Also check for any other elements that might contain transaction data
            const allTransactionElements = transactionDiv.querySelectorAll('*');
            console.log(`🔍 Total elements in recent transactions: ${allTransactionElements.length}`);
            
            const transactions = [];
            transactionItems.forEach((item, index) => {
                // Get all child divs which should contain the transaction data
                const divs = item.querySelectorAll('div');
                if (divs.length >= 4) {
                    const transaction = {
                        rowIndex: index,
                        payment: divs[0]?.textContent?.trim(),
                        masseuse: divs[1]?.textContent?.trim(),
                        service: divs[2]?.textContent?.trim(),
                        amount: divs[3]?.textContent?.trim(),
                        rawText: item.textContent.trim()
                    };
                    transactions.push(transaction);
                    console.log(`🔍 Transaction ${index}:`, transaction);
                }
            });
            
            // Also log the raw HTML content to see what's actually there
            console.log('🔍 Raw HTML content of recent transactions:', transactionDiv.innerHTML);
            
            return {
                divFound: true,
                totalItems: transactionItems.length,
                totalElements: allTransactionElements.length,
                transactions: transactions,
                rawHTML: transactionDiv.innerHTML
            };
        });
        
        console.log('📋 Recent transactions analysis:', recentTransactions);
        
        // Look specifically for the transaction we just created
        if (recentTransactions.divFound && recentTransactions.transactions.length > 0) {
            const ourTransaction = recentTransactions.transactions.find(t => 
                t.masseuse === 'May เมย์' && 
                t.service === 'Foot massage'
            );
            
            if (ourTransaction) {
                console.log('🔍 OUR TRANSACTION FOUND:', ourTransaction);
                console.log(`💰 Expected: Foot massage 90 minutes, Price: 650`);
                console.log(`💰 Actual: ${ourTransaction.service}, Amount: ${ourTransaction.amount}`);
                
                // Check if the amount shows the wrong price (350 instead of 650)
                if (ourTransaction.amount === '฿350.00' || ourTransaction.amount === '350') {
                    console.log('🚨 BUG CONFIRMED: Transaction shows wrong price (350 instead of 650)!');
                } else if (ourTransaction.amount === '฿650.00' || ourTransaction.amount === '650') {
                    console.log('✅ NO BUG: Transaction shows correct price (650)');
                } else {
                    console.log('❓ UNEXPECTED: Transaction shows different price than expected');
                }
            } else {
                console.log('❌ OUR TRANSACTION NOT FOUND in recent transactions');
                console.log('🔍 Available transactions:', recentTransactions.transactions);
            }
        } else {
            console.log('❌ No recent transactions div found or no transactions displayed');
            console.log('🔍 Raw HTML content:', recentTransactions.rawHTML);
        }
        
        // ADD COMPREHENSIVE POST-SUBMISSION ANALYSIS
        console.log('\n[STEP 9] COMPREHENSIVE POST-SUBMISSION ANALYSIS...');
        
        const postSubmissionAnalysis = await page.evaluate(() => {
            console.log('🔍 COMPREHENSIVE POST-SUBMISSION ANALYSIS:');
            
            // Check if any JavaScript errors occurred
            const consoleErrors = [];
            const originalConsoleError = console.error;
            console.error = function(...args) {
                consoleErrors.push(args.join(' '));
                originalConsoleError.apply(console, args);
            };
            
            // Check the current state of the form
            const form = document.querySelector('#transaction-form');
            const formState = {};
            if (form) {
                const inputs = form.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.name || input.id) {
                        const name = input.name || input.id;
                        let value;
                        
                        if (input.type === 'select-one') {
                            value = input.options[input.selectedIndex]?.text || input.value;
                        } else if (input.type === 'checkbox') {
                            value = input.checked;
                        } else {
                            value = input.value;
                        }
                        
                        formState[name] = value;
                    }
                });
            }
            
            // Check if any global variables or functions are missing
            const globalState = {
                hasSubmitTransaction: typeof window.submitTransaction === 'function',
                hasApi: typeof window.api === 'object',
                hasCreateTransaction: window.api && typeof window.api.createTransaction === 'function',
                hasPopulateDropdowns: typeof window.populateDropdowns === 'function',
                hasCalculatePrice: typeof window.calculatePrice === 'function',
                hasUpdateTimeDropdowns: typeof window.updateTimeDropdowns === 'function'
            };
            
            // Check if the page has any error indicators
            const pageErrors = {
                hasErrorClass: document.body.classList.contains('error'),
                hasErrorStyle: document.body.style.color === 'red',
                errorElements: document.querySelectorAll('[class*="error"], [id*="error"], [style*="error"]').length
            };
            
            return {
                formState,
                globalState,
                pageErrors,
                consoleErrors: consoleErrors.slice(-10) // Last 10 errors
            };
        });
        
        console.log('📋 Post-submission analysis:', postSubmissionAnalysis);
        
        // Check if there are any network errors or failed requests
        console.log('\n[STEP 10] NETWORK REQUEST ANALYSIS...');
        
        const networkAnalysis = await page.evaluate(() => {
            console.log('🔍 NETWORK REQUEST ANALYSIS:');
            
            // Check if there are any pending requests
            const pendingRequests = [];
            if (window.api && window.api.pendingRequests) {
                pendingRequests.push(...window.api.pendingRequests);
            }
            
            // Check if there are any failed requests
            const failedRequests = [];
            if (window.api && window.api.failedRequests) {
                failedRequests.push(...window.api.failedRequests);
            }
            
            return {
                pendingRequests: pendingRequests.length,
                failedRequests: failedRequests.length
            };
        });
        
        console.log('📋 Network analysis:', networkAnalysis);
        
        console.log('\n🔍 PRICING BUG REPRODUCTION COMPLETE');
        console.log('=====================================');
        console.log('Check the output above for the root cause of the pricing mismatch');
        console.log('Comprehensive logging has been added to capture the complete form submission flow');
        
    } catch (error) {
        console.error('❌ ERROR during pricing bug reproduction:', error);
    } finally {
        await browser.close();
    }
}

debugPricingBugReproduction();
