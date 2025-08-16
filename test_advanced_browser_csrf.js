const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const LOGIN_PAGE_URL = `${BASE_URL}/login.html`;
const STAFF_PAGE_URL = `${BASE_URL}/api/admin/staff-page`;

const credentials = {
    username: 'manager',
    password: 'manager456'
};

async function runAdvancedBrowserTest() {
    console.log('🚀 LAUNCHING ADVANCED AUTOMATED BROWSER TEST 🚀');
    let browser;
    try {
        console.log('[STEP 1/5] Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true, // Required for self-signed or new certs
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // --- Mimic a real browser ---
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // --- Add extensive network logging ---
        page.on('request', request => {
            console.log(`>> [REQUEST] ${request.method()} ${request.url()}`);
        });
        page.on('response', response => {
            console.log(`<< [RESPONSE] ${response.status()} ${response.url()}`);
        });
        page.on('requestfailed', request => {
            console.error(`❌ [REQUEST FAILED] ${request.method()} ${request.url()}: ${request.failure().errorText}`);
        });
        
        console.log('✅ Browser launched and configured.');

        // --- Login Step ---
        console.log(`[STEP 2/5] Navigating to login page: ${LOGIN_PAGE_URL}`);
        await page.goto(LOGIN_PAGE_URL, { waitUntil: 'networkidle2' });
        
        console.log('           Typing credentials...');
        await page.type('#username', credentials.username);
        await page.type('#password', credentials.password);
        
        console.log('           Clicking login button...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
        
        const adminSection = await page.$('#admin-section');
        if (!adminSection) {
            throw new Error('Login failed. Admin section not found on dashboard.');
        }
        console.log('✅ Login successful.');

        // --- Navigate to Staff Page ---
        console.log(`[STEP 3/5] Navigating to staff admin page: ${STAFF_PAGE_URL}`);
        await page.goto(STAFF_PAGE_URL, { waitUntil: 'networkidle2' });
        console.log('✅ Navigation to staff page complete.');

        // --- Extract CSRF Token ---
        console.log('[STEP 4/5] Extracting CSRF token from meta tag...');
        const csrfToken = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="csrf-token"]');
            return meta ? meta.getAttribute('content') : null;
        });

        if (!csrfToken) {
            throw new Error('CSRF meta tag not found on the page.');
        }
        console.log(`✅ Found CSRF meta tag. Content: "${csrfToken}"`);

        // --- Final Verification ---
        console.log('[STEP 5/5] Verifying token content...');
        if (csrfToken && csrfToken !== '{{ an_actual_token }}') {
            console.log('🎉🎉🎉 SUCCESS! The real CSRF token was correctly injected into the page. 🎉🎉🎉');
        } else {
            console.error('❌❌❌ FAILURE! The CSRF token is either missing or still the placeholder. ❌❌❌');
        }

    } catch (error) {
        console.error('🚨 TEST FAILED:', error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log('✅ Browser closed.');
        }
    }
}

runAdvancedBrowserTest();
