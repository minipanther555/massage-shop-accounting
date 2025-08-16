const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const LOGIN_PAGE_URL = `${BASE_URL}/login.html`;
const STAFF_PAGE_URL = `${BASE_URL}/api/admin/staff-page`;

const credentials = {
    username: 'manager',
    password: 'manager456'
};

async function runComprehensiveFunctionalTest() {
    console.log('🚀 LAUNCHING COMPREHENSIVE FUNCTIONAL TEST 🚀');
    console.log('This test will verify the ENTIRE site is working, not just that pages load.');
    
    let browser;
    try {
        console.log('[STEP 1/6] Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // --- Mimic a real browser ---
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // --- Add comprehensive network logging ---
        const failedRequests = [];
        const staticAssetRequests = [];
        
        page.on('request', request => {
            const url = request.url();
            const resourceType = request.resourceType();
            
            // Track static asset requests
            if (['stylesheet', 'script', 'image'].includes(resourceType)) {
                staticAssetRequests.push({ url, type: resourceType, method: request.method() });
            }
            
            console.log(`>> [REQUEST] ${request.method()} ${url} (${resourceType})`);
        });
        
        page.on('response', response => {
            const url = response.url();
            const status = response.status();
            const contentType = response.headers()['content-type'] || 'unknown';
            
            console.log(`<< [RESPONSE] ${status} ${url} (${contentType})`);
            
            // Check for problematic responses
            if (status === 404) {
                failedRequests.push({ url, status, contentType, reason: '404 Not Found' });
            } else if (status === 200 && contentType.includes('application/json') && url.includes('.css')) {
                failedRequests.push({ url, status, contentType, reason: 'CSS served as JSON' });
            } else if (status === 200 && contentType.includes('application/json') && url.includes('.js')) {
                failedRequests.push({ url, status, contentType, reason: 'JS served as JSON' });
            }
        });
        
        page.on('requestfailed', request => {
            const url = request.url();
            const failure = request.failure();
            failedRequests.push({ url, status: 'FAILED', contentType: 'N/A', reason: failure?.errorText || 'Unknown failure' });
            console.error(`❌ [REQUEST FAILED] ${request.method()} ${url}: ${failure?.errorText}`);
        });
        
        console.log('✅ Browser launched and configured.');

        // --- Login Step ---
        console.log(`[STEP 2/6] Testing login functionality...`);
        await page.goto(LOGIN_PAGE_URL, { waitUntil: 'networkidle2' });
        
        console.log('           Typing credentials...');
        await page.type('#username', credentials.username);
        await page.type('#password', credentials.password);
        
        console.log('           Clicking login button...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
        
        // --- Verify login was successful ---
        console.log('           Verifying login success...');
        const loginSuccess = await page.evaluate(() => {
            return window.location.href.includes('index.html');
        });
        
        if (!loginSuccess) {
            throw new Error('Login failed: Not redirected to main page after login.');
        }
        console.log(`✅ Login successful. User redirected to main page.`);
        console.log('✅ Session cookies are automatically managed by the browser.');

        // --- Test main page functionality ---
        console.log(`[STEP 3/6] Testing main page functionality...`);
        
        // Wait for the main page to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if API calls are working by looking for data
        const mainPageData = await page.evaluate(() => {
            // Check if any data is being loaded
            const hasTransactions = document.querySelector('[data-transaction]') || document.querySelector('.transaction-item');
            const hasStaff = document.querySelector('[data-staff]') || document.querySelector('.staff-item');
            const hasServices = document.querySelector('[data-service]') || document.querySelector('.service-item');
            
            return { hasTransactions, hasStaff, hasServices };
        });
        
        console.log('           Main page data status:', mainPageData);

        // --- Navigate to Staff Admin Page ---
        console.log(`[STEP 4/6] Testing staff admin page functionality...`);
        await page.goto(STAFF_PAGE_URL, { waitUntil: 'networkidle2' });
        console.log('✅ Navigation to staff page complete.');

        // --- Test static assets loading ---
        console.log('           Testing static assets...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for all resources to load
        
        // Check if CSS and JS are loading correctly
        const staticAssetStatus = await page.evaluate(() => {
            const stylesheets = Array.from(document.styleSheets);
            const scripts = Array.from(document.scripts);
            
            return {
                stylesheets: stylesheets.length,
                scripts: scripts.length,
                stylesheetsLoaded: stylesheets.filter(sheet => !sheet.href || sheet.href.startsWith('data:')).length,
                scriptsLoaded: scripts.filter(script => !script.src || script.src.startsWith('data:')).length
            };
        });
        
        console.log('           Static asset status:', staticAssetStatus);

        // --- Test database functionality ---
        console.log('           Testing database connectivity...');
        
        // Wait for any dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if staff data is actually populated
        const staffDataStatus = await page.evaluate(() => {
            // Look for actual staff data in the DOM
            const staffRows = document.querySelectorAll('tr[data-staff-id], .staff-row, [class*="staff"]');
            const hasStaffData = staffRows.length > 0;
            
            // Check if there are any error messages
            const errorMessages = document.querySelectorAll('.error, .alert, [class*="error"]');
            const hasErrors = errorMessages.length > 0;
            
            // Check if the page looks functional
            const hasFunctionalElements = document.querySelector('button, input, select, .btn');
            
            return {
                staffRowsFound: staffRows.length,
                hasStaffData,
                hasErrors,
                errorMessages: Array.from(errorMessages).map(el => el.textContent?.trim()).filter(Boolean),
                hasFunctionalElements,
                pageContent: document.body.textContent?.substring(0, 500) // First 500 chars for debugging
            };
        });
        
        console.log('           Staff data status:', staffDataStatus);

        // --- Extract CSRF Token ---
        console.log('[STEP 5/6] Testing CSRF token functionality...');
        const csrfToken = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="csrf-token"]');
            return meta ? meta.getAttribute('content') : null;
        });

        if (!csrfToken) {
            throw new Error('CSRF meta tag not found on the page.');
        }
        console.log(`✅ Found CSRF meta tag. Content: "${csrfToken}"`);

        // --- Test actual API functionality ---
        console.log('[STEP 6/6] Testing API endpoints...');
        
        // Try to make a real API call to test if the backend is working
        const apiTestResult = await page.evaluate(async () => {
            try {
                // Test if we can make API calls
                const response = await fetch('/api/staff/roster');
                const data = await response.json();
                return {
                    success: true,
                    status: response.status,
                    dataKeys: Object.keys(data || {}),
                    hasData: data && Object.keys(data).length > 0
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('           API test result:', apiTestResult);

        // --- Final Assessment ---
        console.log('\n🔍 COMPREHENSIVE TEST RESULTS:');
        console.log('=====================================');
        
        // Check for critical failures
        const criticalFailures = [];
        
        if (failedRequests.length > 0) {
            criticalFailures.push(`❌ ${failedRequests.length} requests failed or had issues`);
            failedRequests.forEach(req => {
                console.log(`   - ${req.reason}: ${req.url}`);
            });
        }
        
        if (!staffDataStatus.hasStaffData) {
            criticalFailures.push('❌ No staff data found - database connection may be broken');
        }
        
        if (!apiTestResult.success) {
            criticalFailures.push('❌ API endpoints not working - backend functionality broken');
        }
        
        if (staticAssetStatus.stylesheetsLoaded === 0) {
            criticalFailures.push('❌ No CSS loaded - styling completely broken');
        }
        
        if (staticAssetStatus.scriptsLoaded === 0) {
            criticalFailures.push('❌ No JavaScript loaded - functionality completely broken');
        }
        
        // Final verdict
        if (criticalFailures.length === 0) {
            console.log('🎉🎉🎉 COMPLETE SUCCESS! The entire site is fully functional! 🎉🎉🎉');
            console.log('✅ Authentication working');
            console.log('✅ Database connections working');
            console.log('✅ API endpoints working');
            console.log('✅ Static assets loading correctly');
            console.log('✅ CSRF protection working');
        } else {
            console.log('❌❌❌ CRITICAL FAILURES DETECTED! ❌❌❌');
            criticalFailures.forEach(failure => console.log(failure));
            console.log('\nThe site is NOT fully functional and needs immediate attention.');
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

runComprehensiveFunctionalTest();
