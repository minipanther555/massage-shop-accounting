const puppeteer = require('puppeteer');

async function testTransactionFormFixes() {
    console.log('🧪 TESTING TRANSACTION FORM FIXES');
    console.log('==================================');
    
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
            } else if (msg.text().includes('🔍') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
                console.log(`📝 PAGE LOG: ${msg.text()}`);
            }
        });

        // Enable network request logging
        page.on('request', request => {
            if (request.url().includes('/api/transactions')) {
                console.log(`🚀 TRANSACTION REQUEST: ${request.method()} ${request.url()}`);
                if (request.postData()) {
                    console.log(`📤 REQUEST BODY: ${request.postData()}`);
                }
            }
        });

        page.on('response', response => {
            if (response.url().includes('/api/transactions')) {
                console.log(`📥 TRANSACTION RESPONSE: ${response.status()} ${response.url()}`);
            }
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
        
        console.log('\n[STEP 4] TESTING FORM FIXES...');
        
        // Test 1: Check if form has correct attributes
        const formAttributes = await page.evaluate(() => {
            const form = document.querySelector('#transaction-form');
            return {
                method: form.method,
                action: form.action,
                hasCSRFToken: !!form.querySelector('input[name="csrf_token"]'),
                formValid: form.checkValidity()
            };
        });
        
        console.log('📋 Form attributes test:', formAttributes);
        
        // Test 2: Fill out the form step by step
        console.log('\n🔍 Filling form step by step...');
        
        // Select masseuse
        console.log('🔍 Selecting masseuse: สา');
        await page.select('#masseuse', 'สา');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Select location
        console.log('🔍 Selecting location: In-Shop');
        await page.select('#location', 'In-Shop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check service options after location
        const afterLocationState = await page.evaluate(() => {
            const serviceSelect = document.querySelector('#service');
            return {
                serviceOptions: serviceSelect ? Array.from(serviceSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })) : []
            };
        });
        
        console.log('📋 After location selection:', afterLocationState);
        
        // Select service
        if (afterLocationState.serviceOptions.length > 1) {
            console.log('🔍 Selecting service:', afterLocationState.serviceOptions[1].text);
            await page.select('#service', afterLocationState.serviceOptions[1].value);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Check duration options after service
        const afterServiceState = await page.evaluate(() => {
            const durationSelect = document.querySelector('#duration');
            return {
                durationOptions: durationSelect ? Array.from(durationSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })) : []
            };
        });
        
        console.log('📋 After service selection:', afterServiceState);
        
        // Select duration
        if (afterServiceState.durationOptions.length > 1) {
            console.log('🔍 Selecting duration:', afterServiceState.durationOptions[1].text);
            await page.select('#duration', afterServiceState.durationOptions[1].value);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Select payment method
        console.log('🔍 Selecting payment method: Cash');
        await page.select('#payment', 'Cash');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 3: Check if end time is populated
        const endTimeState = await page.evaluate(() => {
            const endTimeSelect = document.querySelector('#endTime');
            const startTimeInput = document.querySelector('#startTime');
            
            return {
                endTimeOptions: endTimeSelect ? Array.from(endTimeSelect.options).map(opt => ({ value: opt.value, text: opt.textContent, selected: opt.selected })) : [],
                startTimeValue: startTimeInput ? startTimeInput.value : 'No start time input',
                endTimeSelected: endTimeSelect ? endTimeSelect.value : 'No end time selected'
            };
        });
        
        console.log('📋 End time state test:', endTimeState);
        
        // Test 4: Final form validation
        const finalFormState = await page.evaluate(() => {
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
            });
            
            return {
                finalState,
                formValid: form.checkValidity(),
                formAction: form.action,
                formMethod: form.method
            };
        });
        
        console.log('📋 Final form state:', finalFormState);
        
        // Test 5: Attempt form submission
        console.log('\n🔍 ATTEMPTING FORM SUBMISSION...');
        
        // Click submit button
        console.log('🔍 Clicking submit button...');
        await page.click('button[type="submit"]');
        
        // Wait for any response or navigation
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check what happened
        const submissionResult = await page.evaluate(() => {
            // Check if we're still on the same page
            const currentUrl = window.location.href;
            
            // Check for any error messages
            const errorMessages = document.querySelectorAll('.error, .alert, [style*="red"], [style*="error"]');
            
            // Check for any success messages
            const successMessages = document.querySelectorAll('.success, .alert-success');
            
            return {
                currentUrl,
                errorMessagesCount: errorMessages.length,
                successMessagesCount: successMessages.length,
                pageTitle: document.title,
                bodyText: document.body.innerText.substring(0, 500)
            };
        });
        
        console.log('📋 Submission result:', submissionResult);
        
        console.log('\n🧪 FORM FIXES TESTING COMPLETE');
        console.log('================================');
        console.log('Check the output above for results');
        
    } catch (error) {
        console.error('❌ ERROR during testing:', error);
    } finally {
        await browser.close();
    }
}

testTransactionFormFixes();
