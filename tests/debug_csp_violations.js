const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
    username: 'manager',
    password: 'manager456'
};

async function debugCSPViolations() {
    console.log('🔍 DEBUGGING CONTENT SECURITY POLICY VIOLATIONS 🔍');

    let browser;

    try {
        console.log('[STEP 1/4] Launching headless browser...');
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

        // Track CSP violations
        const cspViolations = [];
        page.on('console', msg => {
            if (msg.text().includes('Content Security Policy') || 
                msg.text().includes('CSP') ||
                msg.text().includes('connect-src') ||
                msg.text().includes('Refused to connect')) {
                cspViolations.push(msg.text());
            }
        });

        console.log('✅ Browser launched and configured.');

        // --- LOGIN TEST ---
        console.log('[STEP 2/4] Testing login functionality...');
        await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });

        // Fill login form
        await page.type('#username', TEST_CREDENTIALS.username);
        await page.type('#password', TEST_CREDENTIALS.password);
        await page.click('#login-btn');

        // Wait for redirect
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('✅ Login successful, redirected to main page.');

        // Wait for page to fully load and cookies to be set
        await new Promise(resolve => setTimeout(resolve, 3000));

        // --- TEST ADMIN PAGES FOR CSP VIOLATIONS ---
        console.log('[STEP 3/4] Testing admin pages for CSP violations...');

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
                // Clear previous violations
                cspViolations.length = 0;
                
                await page.goto(`${BASE_URL}${adminPage.path}`, { waitUntil: 'networkidle2' });
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check for CSP violations
                if (cspViolations.length > 0) {
                    console.log(`           ❌ CSP violations found on ${adminPage.name}:`);
                    cspViolations.forEach(violation => {
                        console.log(`              - ${violation}`);
                    });
                } else {
                    console.log(`           ✅ No CSP violations on ${adminPage.name}`);
                }

                // Check if page loaded with proper styling
                const stylesheetsLoaded = await page.evaluate(() => {
                    return document.styleSheets.length;
                });

                const scriptsLoaded = await page.evaluate(() => {
                    return document.scripts.length;
                });

                console.log(`           ✅ ${adminPage.name} loaded with ${stylesheetsLoaded} stylesheets and ${scriptsLoaded} scripts`);

            } catch (error) {
                console.log(`           ❌ Error testing ${adminPage.name}:`, error.message);
            }
        }

        // Check for any HTTP URLs in the page content that might cause CSP issues
        console.log('           Checking for HTTP URLs in page content...');
        const httpUrls = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            const httpUrls = [];
            
            allElements.forEach(element => {
                // Check href attributes
                if (element.href && element.href.startsWith('http://')) {
                    httpUrls.push({
                        element: element.tagName,
                        attribute: 'href',
                        url: element.href
                    });
                }
                
                // Check src attributes
                if (element.src && element.src.startsWith('http://')) {
                    httpUrls.push({
                        element: element.tagName,
                        attribute: 'src',
                        url: element.src
                    });
                }
                
                // Check data attributes
                if (element.dataset && element.dataset.url && element.dataset.url.startsWith('http://')) {
                    httpUrls.push({
                        element: element.tagName,
                        attribute: 'data-url',
                        url: element.dataset.url
                    });
                }
            });
            
            return httpUrls;
        });

        if (httpUrls.length > 0) {
            console.log('           ❌ HTTP URLs found that may cause CSP issues:');
            httpUrls.forEach(url => {
                console.log(`              - ${url.element} ${url.attribute}: ${url.url}`);
            });
        } else {
            console.log('           ✅ No HTTP URLs found in page content');
        }

        // Check for any inline scripts or styles that might violate CSP
        console.log('           Checking for inline scripts and styles...');
        const inlineContent = await page.evaluate(() => {
            const inlineScripts = document.querySelectorAll('script:not([src])');
            const inlineStyles = document.querySelectorAll('style');
            
            return {
                inlineScripts: inlineScripts.length,
                inlineStyles: inlineStyles.length,
                hasInlineScripts: inlineScripts.length > 0,
                hasInlineStyles: inlineStyles.length > 0
            };
        });

        console.log('           Inline content check:', inlineContent);

        // --- FINAL ASSESSMENT ---
        console.log('[STEP 4/4] Final assessment...');

        console.log('\n🔍 CSP VIOLATIONS DEBUG RESULTS:');
        console.log('=====================================');

        const totalViolations = cspViolations.length;
        if (totalViolations === 0) {
            console.log('✅ No CSP violations detected');
        } else {
            console.log(`❌ ${totalViolations} CSP violations detected:`);
            cspViolations.forEach((violation, index) => {
                console.log(`   ${index + 1}. ${violation}`);
            });
        }

        if (httpUrls.length > 0) {
            console.log(`⚠️ ${httpUrls.length} HTTP URLs found that may cause CSP issues`);
        }

        console.log('\nDebug Information:');
        console.log('- Total CSP violations:', totalViolations);
        console.log('- HTTP URLs found:', httpUrls.length);
        console.log('- Inline content:', inlineContent);

    } catch (error) {
        console.error('🚨 DEBUG FAILED:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (browser) {
            await browser.close();
            console.log('✅ Browser closed.');
        }
    }
}

debugCSPViolations();
