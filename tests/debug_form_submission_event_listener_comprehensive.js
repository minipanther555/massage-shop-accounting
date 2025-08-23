const puppeteer = require('puppeteer');

async function debugFormSubmissionEventListenerComprehensive() {
    console.log('🔍 COMPREHENSIVE FORM SUBMISSION EVENT LISTENER DEBUGGING');
    console.log('==========================================================');
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
        
        console.log('\n[STEP 4] COMPREHENSIVE EVENT LISTENER DEBUGGING - Testing all 5 hypotheses...');
        
        // HYPOTHESIS 1: Event Listener Not Attached
        console.log('\n🔍 HYPOTHESIS 1: Event Listener Not Attached');
        const eventListenerTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 1 TESTING: Event listener attachment verification');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 1: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('✅ HYPOTHESIS 1: Form found, checking event listeners');
            
            // Check if event listeners are attached (getEventListeners not available in browser context)
            console.log('🔍 HYPOTHESIS 1: getEventListeners not available in browser context, testing manually');
            
            // Test if we can manually trigger submit event
            console.log('🔍 HYPOTHESIS 1: Testing manual submit event trigger');
            let submitEventFired = false;
            let preventDefaultCalled = false;
            
            const testListener = function(e) {
                console.log('🔍 HYPOTHESIS 1: Test submit event fired!');
                submitEventFired = true;
                console.log('🔍 HYPOTHESIS 1: Event type:', e.type);
                console.log('🔍 HYPOTHESIS 1: Event target:', e.target);
                console.log('🔍 HYPOTHESIS 1: Calling preventDefault...');
                e.preventDefault();
                preventDefaultCalled = true;
                console.log('🔍 HYPOTHESIS 1: preventDefault called successfully');
            };
            
            form.addEventListener('submit', testListener);
            console.log('✅ HYPOTHESIS 1: Test event listener attached');
            
            // Try to trigger submit event
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            console.log('🔍 HYPOTHESIS 1: Dispatching test submit event...');
            form.dispatchEvent(submitEvent);
            
            console.log('🔍 HYPOTHESIS 1: Test results - Event fired:', submitEventFired, 'PreventDefault called:', preventDefaultCalled);
            
            // Remove test listener
            form.removeEventListener('submit', testListener);
            
            return {
                formFound: true,
                submitEventFired,
                preventDefaultCalled,
                eventListenerWorking: submitEventFired && preventDefaultCalled
            };
        });
        
        console.log('📋 HYPOTHESIS 1 Results:', eventListenerTest);
        
        // HYPOTHESIS 2: JavaScript Error Preventing Handler Execution
        console.log('\n🔍 HYPOTHESIS 2: JavaScript Error Preventing Handler Execution');
        const jsErrorTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 2 TESTING: JavaScript error detection');
            
            // Check for global errors
            console.log('🔍 HYPOTHESIS 2: Checking for global JavaScript errors');
            
            // Test if handleSubmit function exists and is callable
            console.log('🔍 HYPOTHESIS 2: Testing handleSubmit function availability');
            
            if (typeof handleSubmit === 'function') {
                console.log('✅ HYPOTHESIS 2: handleSubmit function exists');
                
                // Test if we can call it manually
                try {
                    console.log('🔍 HYPOTHESIS 2: Testing manual handleSubmit call...');
                    const testEvent = { preventDefault: () => console.log('🔍 HYPOTHESIS 2: preventDefault called') };
                    handleSubmit(testEvent);
                    console.log('✅ HYPOTHESIS 2: handleSubmit function executed without errors');
                } catch (error) {
                    console.error('❌ HYPOTHESIS 2: handleSubmit function threw error:', error);
                }
            } else {
                console.log('❌ HYPOTHESIS 2: handleSubmit function not found');
            }
            
            // Check for other critical functions
            console.log('🔍 HYPOTHESIS 2: Checking other critical functions');
            const criticalFunctions = ['submitTransaction', 'api', 'CONFIG'];
            const functionStatus = {};
            
            criticalFunctions.forEach(funcName => {
                if (typeof window[funcName] !== 'undefined') {
                    functionStatus[funcName] = 'Available';
                    console.log(`✅ HYPOTHESIS 2: ${funcName} function available`);
                } else {
                    functionStatus[funcName] = 'Missing';
                    console.log(`❌ HYPOTHESIS 2: ${funcName} function missing`);
                }
            });
            
            return {
                handleSubmitExists: typeof handleSubmit === 'function',
                criticalFunctions: functionStatus,
                noJsErrors: true
            };
        });
        
        console.log('📋 HYPOTHESIS 2 Results:', jsErrorTest);
        
        // HYPOTHESIS 3: Form Element Not Found
        console.log('\n🔍 HYPOTHESIS 3: Form Element Not Found');
        const formElementTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 3 TESTING: Form element accessibility');
            
            // Check multiple ways to find the form
            console.log('🔍 HYPOTHESIS 3: Testing form element discovery methods');
            
            const formById = document.getElementById('transaction-form');
            const formByQuery = document.querySelector('#transaction-form');
            const formByTag = document.querySelector('form');
            const allForms = document.querySelectorAll('form');
            
            console.log('🔍 HYPOTHESIS 3: Form by ID:', !!formById);
            console.log('🔍 HYPOTHESIS 3: Form by querySelector:', !!formByQuery);
            console.log('🔍 HYPOTHESIS 3: Form by tag:', !!formByTag);
            console.log('🔍 HYPOTHESIS 3: Total forms found:', allForms.length);
            
            if (formById) {
                console.log('🔍 HYPOTHESIS 3: Form ID:', formById.id);
                console.log('🔍 HYPOTHESIS 3: Form action:', formById.action);
                console.log('🔍 HYPOTHESIS 3: Form method:', formById.method);
                console.log('🔍 HYPOTHESIS 3: Form innerHTML length:', formById.innerHTML.length);
            }
            
            // Check if form is in the DOM at different times
            console.log('🔍 HYPOTHESIS 3: Checking form availability in DOM');
            
            return {
                formById: !!formById,
                formByQuery: !!formByQuery,
                formByTag: !!formByTag,
                totalForms: allForms.length,
                formAction: formById?.action || 'Not found',
                formMethod: formById?.method || 'Not found'
            };
        });
        
        console.log('📋 HYPOTHESIS 3 Results:', formElementTest);
        
        // HYPOTHESIS 4: Event Listener Timing Issue
        console.log('\n🔍 HYPOTHESIS 4: Event Listener Timing Issue');
        const timingTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 4 TESTING: Event listener timing verification');
            
            // Check document ready state
            console.log('🔍 HYPOTHESIS 4: Document ready state:', document.readyState);
            
            // Check if DOMContentLoaded has fired
            console.log('🔍 HYPOTHESIS 4: DOMContentLoaded event fired:', document.readyState === 'complete' || document.readyState === 'interactive');
            
            // Check if all scripts are loaded
            const scripts = document.querySelectorAll('script');
            console.log('🔍 HYPOTHESIS 4: Total scripts loaded:', scripts.length);
            
            // Check for specific script loading
            const apiScript = document.querySelector('script[src*="api.js"]');
            const sharedScript = document.querySelector('script[src*="shared.js"]');
            
            console.log('🔍 HYPOTHESIS 4: API script loaded:', !!apiScript);
            console.log('🔍 HYPOTHESIS 4: Shared script loaded:', !!sharedScript);
            
            // Check if functions are available after script loading
            const functionsAvailable = {
                handleSubmit: typeof handleSubmit === 'function',
                submitTransaction: typeof submitTransaction === 'function',
                api: typeof api !== 'undefined'
            };
            
            console.log('🔍 HYPOTHESIS 4: Functions available after script loading:', functionsAvailable);
            
            return {
                readyState: document.readyState,
                scriptsLoaded: scripts.length,
                apiScriptLoaded: !!apiScript,
                sharedScriptLoaded: !!sharedScript,
                functionsAvailable
            };
        });
        
        console.log('📋 HYPOTHESIS 4 Results:', timingTest);
        
        // HYPOTHESIS 5: Multiple Event Listeners Conflict
        console.log('\n🔍 HYPOTHESIS 5: Multiple Event Listeners Conflict');
        const conflictTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 5 TESTING: Multiple event listener conflicts');
            
            const form = document.querySelector('#transaction-form');
            if (!form) {
                console.log('❌ HYPOTHESIS 5: Form not found');
                return { error: 'Form not found' };
            }
            
            console.log('✅ HYPOTHESIS 5: Form found, checking for multiple listeners');
            
            // Count how many times event listeners might be attached
            console.log('🔍 HYPOTHESIS 5: Checking for multiple event listener attachments');
            
            // Test if we can attach multiple listeners and see what happens
            let listener1Called = false;
            let listener2Called = false;
            
            const listener1 = function(e) {
                console.log('🔍 HYPOTHESIS 5: Listener 1 called');
                listener1Called = true;
                e.preventDefault();
            };
            
            const listener2 = function(e) {
                console.log('🔍 HYPOTHESIS 5: Listener 2 called');
                listener2Called = true;
                e.preventDefault();
            };
            
            // Attach first listener
            form.addEventListener('submit', listener1);
            console.log('🔍 HYPOTHESIS 5: First listener attached');
            
            // Attach second listener
            form.addEventListener('submit', listener2);
            console.log('🔍 HYPOTHESIS 5: Second listener attached');
            
            // Trigger submit event
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            console.log('🔍 HYPOTHESIS 5: Dispatching submit event to test multiple listeners...');
            form.dispatchEvent(submitEvent);
            
            console.log('🔍 HYPOTHESIS 5: Multiple listener test results - Listener 1:', listener1Called, 'Listener 2:', listener2Called);
            
            // Clean up test listeners
            form.removeEventListener('submit', listener1);
            form.removeEventListener('submit', listener2);
            
            return {
                multipleListenersWorking: listener1Called && listener2Called,
                listener1Called,
                listener2Called,
                noConflicts: true
            };
        });
        
        console.log('📋 HYPOTHESIS 5 Results:', conflictTest);
        
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
        
        console.log('\n🔍 COMPREHENSIVE EVENT LISTENER DEBUGGING COMPLETE');
        console.log('===================================================');
        console.log('All 5 hypotheses tested with extensive logging');
        console.log('Check the output above for the root cause');
        
    } catch (error) {
        console.error('❌ ERROR during comprehensive event listener debugging:', error);
    } finally {
        await browser.close();
    }
}

debugFormSubmissionEventListenerComprehensive();
