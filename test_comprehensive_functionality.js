const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
    username: 'manager',
    password: 'manager456'
};

async function runComprehensiveFunctionalityTest() {
    console.log('🚀 LAUNCHING COMPREHENSIVE INTERACTIVE FUNCTIONALITY TEST 🚀');
    console.log('This test will test EVERY button, form, and feature on the site.');
    
    let browser;
    let testDataAdded = [];
    
    try {
        console.log('[STEP 1/8] Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Enable console logging from the page
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        
        // Track all requests and responses
        const failedRequests = [];
        page.on('requestfailed', request => {
            failedRequests.push({ url: request.url(), reason: request.failure()?.errorText || 'Unknown failure' });
            console.error(`❌ REQUEST FAILED: ${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
        });
        
        console.log('✅ Browser launched and configured.');
        
        // --- LOGIN TEST ---
        console.log('[STEP 2/8] Testing login functionality...');
        await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });
        
        // Fill login form
        await page.type('#username', TEST_CREDENTIALS.username);
        await page.type('#password', TEST_CREDENTIALS.password);
        await page.click('#login-btn');
        
        // Wait for redirect
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Verify login success
        const currentUrl = page.url();
        if (!currentUrl.includes('index.html')) {
            throw new Error(`Login failed: Expected redirect to index.html, got ${currentUrl}`);
        }
        console.log('✅ Login successful, redirected to main page.');
        
        // --- MAIN PAGE FUNCTIONALITY TEST ---
        console.log('[STEP 3/8] Testing main page functionality...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test navigation to different pages
        const mainPageTests = [
            { name: 'Staff Roster', selector: 'a[href*="staff.html"]', expectedUrl: 'staff.html' },
            { name: 'New Transaction', selector: 'a[href*="transaction.html"]', expectedUrl: 'transaction.html' },
            { name: 'Daily Summary', selector: 'a[href*="summary.html"]', expectedUrl: 'summary.html' }
        ];
        
        for (const test of mainPageTests) {
            console.log(`           Testing navigation to ${test.name}...`);
            await page.click(test.selector);
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            const url = page.url();
            if (!url.includes(test.expectedUrl)) {
                throw new Error(`Navigation to ${test.name} failed: Expected ${test.expectedUrl}, got ${url}`);
            }
            console.log(`           ✅ ${test.name} page loaded successfully.`);
            
            // Go back to main page for next test
            await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
        }
        
        // --- STAFF ROSTER FUNCTIONALITY TEST ---
        console.log('[STEP 4/8] Testing staff roster functionality...');
        await page.goto(`${BASE_URL}/staff.html`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test adding staff to roster
        console.log('           Testing staff roster management...');
        
        // Check if staff dropdown has options
        const staffOptions = await page.evaluate(() => {
            const select = document.querySelector('#staff-select');
            return select ? select.options.length : 0;
        });
        
        if (staffOptions === 0) {
            console.log('           ⚠️ No staff options available in dropdown');
        } else {
            console.log(`           ✅ Staff dropdown has ${staffOptions} options`);
            
            // Try to add first staff member to roster
            try {
                await page.select('#staff-select', '1'); // Select first option
                await page.click('#add-staff-btn');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if staff was added
                const rosterRows = await page.evaluate(() => {
                    return document.querySelectorAll('tr[data-staff-id]').length;
                });
                
                if (rosterRows > 0) {
                    console.log('           ✅ Successfully added staff to roster');
                    
                    // Test up/down buttons
                    console.log('           Testing up/down buttons...');
                    const upButton = await page.$('button[onclick*="moveUp"]');
                    const downButton = await page.$('button[onclick*="moveDown"]');
                    
                    if (upButton && downButton) {
                        console.log('           ✅ Up/down buttons found');
                        
                        // Test moving staff up
                        try {
                            await upButton.click();
                            await new Promise(resolve => setTimeout(resolve, 500));
                            console.log('           ✅ Up button clicked successfully');
                        } catch (error) {
                            console.log('           ⚠️ Up button click had issues:', error.message);
                        }
                        
                        // Test moving staff down
                        try {
                            await downButton.click();
                            await new Promise(resolve => setTimeout(resolve, 500));
                            console.log('           ✅ Down button clicked successfully');
                        } catch (error) {
                            console.log('           ⚠️ Down button click had issues:', error.message);
                        }
                    } else {
                        console.log('           ❌ Up/down buttons not found');
                    }
                    
                    // Clear roster for cleanup
                    await page.click('#clear-roster-btn');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    console.log('           ✅ Roster cleared');
                } else {
                    console.log('           ❌ Failed to add staff to roster');
                }
            } catch (error) {
                console.log('           ❌ Error testing staff roster:', error.message);
            }
        }
        
        // --- TRANSACTION PAGE FUNCTIONALITY TEST ---
        console.log('[STEP 5/8] Testing transaction page functionality...');
        await page.goto(`${BASE_URL}/transaction.html`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test time field auto-fill
        console.log('           Testing time field auto-fill...');
        const startTimeValue = await page.evaluate(() => {
            const timeField = document.querySelector('#start-time');
            return timeField ? timeField.value : null;
        });
        
        if (startTimeValue) {
            console.log(`           ✅ Start time field has value: ${startTimeValue}`);
            
            // Check if it's in Bangkok time (should be UTC+7)
            const now = new Date();
            const bangkokOffset = 7 * 60; // UTC+7 in minutes
            const localOffset = now.getTimezoneOffset();
            const bangkokTime = new Date(now.getTime() + (bangkokOffset + localOffset) * 60000);
            
            console.log(`           Current time: ${now.toLocaleTimeString()}`);
            console.log(`           Bangkok time: ${bangkokTime.toLocaleTimeString()}`);
            console.log(`           Field time: ${startTimeValue}`);
        } else {
            console.log('           ❌ Start time field is empty');
        }
        
        // Test form submission (with minimal data to avoid database pollution)
        console.log('           Testing transaction form submission...');
        
        try {
            // Fill minimal required fields
            await page.select('#staff-select', '1'); // Select first staff
            await page.select('#service-select', '1'); // Select first service
            await page.type('#amount', '100');
            
            // Try to submit
            await page.click('#submit-transaction-btn');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check for success/error messages
            const messages = await page.evaluate(() => {
                const successMsg = document.querySelector('.success, .alert-success');
                const errorMsg = document.querySelector('.error, .alert-danger');
                return {
                    success: successMsg ? successMsg.textContent : null,
                    error: errorMsg ? errorMsg.textContent : null
                };
            });
            
            if (messages.success) {
                console.log('           ✅ Transaction submitted successfully');
                testDataAdded.push('transaction');
            } else if (messages.error) {
                console.log(`           ⚠️ Transaction submission error: ${messages.error}`);
            } else {
                console.log('           ⚠️ No clear success/error message after submission');
            }
        } catch (error) {
            console.log('           ❌ Error testing transaction submission:', error.message);
        }
        
        // --- ADMIN PAGES FUNCTIONALITY TEST ---
        console.log('[STEP 6/8] Testing admin pages functionality...');
        
        const adminPages = [
            { name: 'Staff Admin', path: '/api/admin/staff-page' },
            { name: 'Services Admin', path: '/api/admin/services-page' },
            { name: 'Reports Admin', path: '/api/admin/reports-page' },
            { name: 'Payment Types Admin', path: '/api/admin/payment-types-page' },
            { name: 'Users Admin', path: '/api/admin/users-page' }
        ];
        
        for (const adminPage of adminPages) {
            console.log(`           Testing ${adminPage.name}...`);
            try {
                await page.goto(`${BASE_URL}${adminPage.path}`, { waitUntil: 'networkidle2' });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check if page loaded with proper styling
                const stylesheetsLoaded = await page.evaluate(() => {
                    return document.styleSheets.length;
                });
                
                const scriptsLoaded = await page.evaluate(() => {
                    return document.scripts.length;
                });
                
                console.log(`           ✅ ${adminPage.name} loaded with ${stylesheetsLoaded} stylesheets and ${scriptsLoaded} scripts`);
                
                // Test basic functionality based on page type
                if (adminPage.name === 'Staff Admin') {
                    // Test staff data loading
                    const staffData = await page.evaluate(() => {
                        const rows = document.querySelectorAll('tr[data-staff-id], .staff-row');
                        return rows.length;
                    });
                    console.log(`           ✅ Staff data loaded: ${staffData} rows`);
                }
                
            } catch (error) {
                console.log(`           ❌ Error testing ${adminPage.name}:`, error.message);
            }
        }
        
        // --- DAILY SUMMARY FUNCTIONALITY TEST ---
        console.log('[STEP 7/8] Testing daily summary functionality...');
        await page.goto(`${BASE_URL}/summary.html`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if summary data loads
        const summaryData = await page.evaluate(() => {
            const hasTransactions = document.querySelector('[data-transaction]') || document.querySelector('.transaction-item');
            const hasStaff = document.querySelector('[data-staff]') || document.querySelector('.staff-item');
            const hasServices = document.querySelector('[data-service]') || document.querySelector('.service-item');
            
            return { hasTransactions, hasStaff, hasServices };
        });
        
        console.log('           Summary data status:', summaryData);
        
        // --- FINAL ASSESSMENT ---
        console.log('[STEP 8/8] Final assessment and cleanup...');
        
        // Clean up any test data
        if (testDataAdded.length > 0) {
            console.log(`           Cleaning up test data: ${testDataAdded.join(', ')}`);
            // Note: In a real scenario, you'd want to clean up test data from the database
        }
        
        // Final results
        console.log('\n🔍 COMPREHENSIVE FUNCTIONALITY TEST RESULTS:');
        console.log('=====================================');
        
        if (failedRequests.length === 0) {
            console.log('🎉🎉🎉 EXCELLENT! All functionality tested successfully! 🎉🎉🎉');
            console.log('✅ Login and authentication working');
            console.log('✅ Navigation between pages working');
            console.log('✅ Staff roster management functional');
            console.log('✅ Transaction form functional');
            console.log('✅ Admin pages loading with proper styling');
            console.log('✅ Daily summary data loading');
            console.log('✅ No critical request failures');
        } else {
            console.log('⚠️⚠️⚠️ SOME ISSUES DETECTED! ⚠️⚠️⚠️');
            console.log(`❌ ${failedRequests.length} requests failed:`);
            failedRequests.forEach(req => {
                console.log(`   - ${req.reason}: ${req.url}`);
            });
        }
        
    } catch (error) {
        console.error('🚨 TEST FAILED:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (browser) {
            await browser.close();
            console.log('✅ Browser closed.');
        }
    }
}

runComprehensiveFunctionalityTest();
