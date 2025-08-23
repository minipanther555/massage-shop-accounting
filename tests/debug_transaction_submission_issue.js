const puppeteer = require('puppeteer');

async function debugTransactionSubmissionIssue() {
    console.log('🔍 DEBUGGING TRANSACTION SUBMISSION ISSUE');
    console.log('=====================================');
    
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

        // Enable network request logging
        page.on('request', request => {
            if (request.url().includes('/api/transactions') || request.url().includes('/api/transaction')) {
                console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
                console.log(`📤 REQUEST HEADERS:`, request.headers());
                if (request.postData()) {
                    console.log(`📤 REQUEST BODY:`, request.postData());
                }
            }
        });

        page.on('response', response => {
            if (response.url().includes('/api/transactions') || response.url().includes('/api/transaction')) {
                console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
                console.log(`📥 RESPONSE HEADERS:`, response.headers());
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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n[STEP 4] Checking page elements and form state...');
        
        // Check if form elements are present
        const formElements = await page.evaluate(() => {
            const elements = {
                masseuseSelect: document.querySelector('#masseuse'),
                locationSelect: document.querySelector('#location'),
                serviceSelect: document.querySelector('#service'),
                durationSelect: document.querySelector('#duration'),
                paymentSelect: document.querySelector('#payment'),
                startTimeInput: document.querySelector('#startTime'),
                endTimeSelect: document.querySelector('#endTime'),
                submitBtn: document.querySelector('button[type="submit"]'),
                form: document.querySelector('#transaction-form')
            };
            
            return {
                elements: Object.keys(elements).map(key => ({ key, exists: !!elements[key] })),
                formHTML: elements.form ? elements.form.outerHTML : 'Form not found',
                submitBtnHTML: elements.submitBtn ? elements.submitBtn.outerHTML : 'Submit button not found'
            };
        });
        
        console.log('📋 Form Elements Status:', formElements.elements);
        console.log('📋 Form HTML:', formElements.formHTML);
        console.log('📋 Submit Button HTML:', formElements.submitBtnHTML);
        
        // Check if dropdowns are populated
        console.log('\n[STEP 5] Checking dropdown population...');
        const dropdownStatus = await page.evaluate(() => {
            const masseuseOptions = document.querySelectorAll('#masseuse option');
            const locationOptions = document.querySelectorAll('#location option');
            const serviceOptions = document.querySelectorAll('#service option');
            const durationOptions = document.querySelectorAll('#duration option');
            const paymentOptions = document.querySelectorAll('#payment option');
            const endTimeOptions = document.querySelectorAll('#endTime option');
            
            return {
                masseuseCount: masseuseOptions.length,
                locationCount: locationOptions.length,
                serviceCount: serviceOptions.length,
                durationCount: durationOptions.length,
                paymentCount: paymentOptions.length,
                endTimeCount: endTimeOptions.length,
                masseuseValues: Array.from(masseuseOptions).map(opt => ({ value: opt.value, text: opt.textContent })),
                locationValues: Array.from(locationOptions).map(opt => ({ value: opt.value, text: opt.textContent })),
                serviceValues: Array.from(serviceOptions).map(opt => ({ value: opt.value, text: opt.textContent })),
                durationValues: Array.from(durationOptions).map(opt => ({ value: opt.value, text: opt.textContent })),
                paymentValues: Array.from(paymentOptions).map(opt => ({ value: opt.value, text: opt.textContent })),
                endTimeValues: Array.from(endTimeOptions).map(opt => ({ value: opt.value, text: opt.textContent }))
            };
        });
        
        console.log('📋 Dropdown Status:', dropdownStatus);
        
        // Try to fill out the form
        console.log('\n[STEP 6] Attempting to fill out transaction form...');
        
        // Select location (first available option)
        if (dropdownStatus.locationCount > 1) { // > 1 because first option is usually placeholder
            await page.select('#location', dropdownStatus.locationValues[1].value);
            console.log(`✅ Selected location: ${dropdownStatus.locationValues[1].text}`);
        }
        
        // Wait for service options to populate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Select service (first available option)
        if (dropdownStatus.serviceCount > 1) {
            await page.select('#service', dropdownStatus.serviceValues[1].value);
            console.log(`✅ Selected service: ${dropdownStatus.serviceValues[1].text}`);
        }
        
        // Wait for duration options to populate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Select duration (first available option)
        if (dropdownStatus.durationCount > 1) {
            await page.select('#duration', dropdownStatus.durationValues[1].value);
            console.log(`✅ Selected duration: ${dropdownStatus.durationValues[1].text}`);
        }
        
        // Select payment method (first available option)
        if (dropdownStatus.paymentCount > 1) {
            await page.select('#payment', dropdownStatus.paymentValues[1].text);
            console.log(`✅ Selected payment: ${dropdownStatus.paymentValues[1].text}`);
        }
        
        // Wait for any dynamic updates
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check form validation state
        console.log('\n[STEP 7] Checking form validation state...');
        const validationState = await page.evaluate(() => {
            const form = document.querySelector('#transaction-form');
            if (!form) return { error: 'Form not found' };
            
            const inputs = form.querySelectorAll('input, select');
            const validationResults = Array.from(inputs).map(input => ({
                name: input.name || input.id,
                value: input.value,
                required: input.required,
                valid: input.checkValidity(),
                validationMessage: input.validationMessage
            }));
            
            return {
                formValid: form.checkValidity(),
                validationResults,
                formData: new FormData(form)
            };
        });
        
        console.log('📋 Form Validation State:', validationState);
        
        // Try to submit the form
        console.log('\n[STEP 8] Attempting to submit transaction...');
        
        // Click submit button
        await page.click('button[type="submit"]');
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for any error messages or alerts
        const pageContent = await page.evaluate(() => {
            return {
                alerts: window.alert ? 'Alert function exists' : 'No alert function',
                consoleErrors: window.console ? 'Console exists' : 'No console',
                bodyText: document.body.innerText,
                anyErrors: document.querySelectorAll('.error, .alert, [style*="red"], [style*="error"]').length
            };
        });
        
        console.log('📋 Page Content Analysis:', pageContent);
        
        // Check if we're still on the same page or if there was a redirect
        const currentUrl = page.url();
        console.log(`📋 Current URL after submission: ${currentUrl}`);
        
        // Check for any JavaScript errors in the console
        const consoleLogs = await page.evaluate(() => {
            return {
                hasErrors: window.console && window.console.error ? 'Console error function exists' : 'No console error function',
                pageErrors: window.onerror ? 'Page error handler exists' : 'No page error handler'
            };
        });
        
        console.log('📋 Console/Error Handling:', consoleLogs);
        
        console.log('\n[STEP 9] Final form state check...');
        
        // Final check of form state
        const finalFormState = await page.evaluate(() => {
            const form = document.querySelector('#transaction-form');
            if (!form) return { error: 'Form not found' };
            
            const formData = {};
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                formData[input.name || input.id] = input.value;
            });
            
            return {
                formData,
                formVisible: form.style.display !== 'none',
                submitButtonVisible: document.querySelector('#submit-transaction')?.style.display !== 'none'
            };
        });
        
        console.log('📋 Final Form State:', finalFormState);
        
        console.log('\n🔍 DEBUGGING COMPLETE');
        console.log('=====================================');
        console.log('Check the output above for any clues about the transaction submission issue.');
        
    } catch (error) {
        console.error('❌ ERROR during debugging:', error);
    } finally {
        await browser.close();
    }
}

debugTransactionSubmissionIssue();
