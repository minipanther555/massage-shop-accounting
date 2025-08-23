const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
    username: 'manager',
    password: 'manager456'
};

async function debugStaffDropdownIssue() {
    console.log('🔍 DEBUGGING STAFF DROPDOWN ISSUE 🔍');

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

        // --- STAFF ROSTER PAGE TEST ---
        console.log('[STEP 3/4] Testing staff roster page dropdown...');
        await page.goto(`${BASE_URL}/api/main/staff-roster`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if staff dropdown exists and has options
        console.log('           Checking staff dropdown...');
        const dropdownInfo = await page.evaluate(() => {
            const dropdown = document.querySelector('#available-staff');
            if (!dropdown) {
                return { error: 'Staff dropdown not found' };
            }

            const options = Array.from(dropdown.options);
            return {
                exists: true,
                id: dropdown.id,
                className: dropdown.className,
                optionsCount: options.length,
                options: options.map(opt => ({
                    value: opt.value,
                    text: opt.text,
                    selected: opt.selected,
                    disabled: opt.disabled
                })),
                selectedValue: dropdown.value,
                disabled: dropdown.disabled
            };
        });

        console.log('           Dropdown info:', dropdownInfo);

        // Check if there are any JavaScript functions trying to populate the dropdown
        const dropdownScripts = await page.evaluate(() => {
            const scripts = Array.from(document.scripts);
            const dropdownRelatedScripts = scripts.filter(script => {
                const content = script.textContent || '';
                return content.includes('available-staff') || 
                       content.includes('updateAvailableStaffDropdown') ||
                       content.includes('populateStaffDropdown') ||
                       content.includes('loadStaffData');
            });

            return dropdownRelatedScripts.map(script => ({
                src: script.src,
                hasContent: !!script.textContent,
                contentLength: script.textContent ? script.textContent.length : 0
            }));
        });

        console.log('           Dropdown-related scripts found:', dropdownScripts);

        // Check if there are any staff-related functions
        const staffFunctions = await page.evaluate(() => {
            return {
                hasUpdateAvailableStaffDropdown: typeof updateAvailableStaffDropdown === 'function',
                hasPopulateStaffDropdown: typeof populateStaffDropdown === 'function',
                hasLoadStaffData: typeof loadStaffData === 'function',
                hasCONFIG: typeof CONFIG !== 'undefined',
                hasAppData: typeof appData !== 'undefined',
                configStaff: typeof CONFIG !== 'undefined' ? CONFIG.settings?.masseuses : 'CONFIG not available',
                appDataStaff: typeof appData !== 'undefined' ? appData.availableStaff : 'appData not available'
            };
        });

        console.log('           Staff functions available:', staffFunctions);

        // Check the actual HTML structure around the dropdown
        const dropdownHTML = await page.evaluate(() => {
            const dropdown = document.querySelector('#available-staff');
            if (!dropdown) return 'Dropdown not found';
            
            const parent = dropdown.parentElement;
            return {
                dropdownHTML: dropdown.outerHTML,
                parentHTML: parent ? parent.outerHTML : 'No parent',
                siblings: Array.from(dropdown.parentElement?.children || []).map(child => ({
                    tag: child.tagName,
                    id: child.id,
                    className: child.className,
                    text: child.textContent?.substring(0, 50) || ''
                }))
            };
        });

        console.log('           Dropdown HTML structure:', dropdownHTML);

        // Check if there are any error messages or loading indicators
        const pageMessages = await page.evaluate(() => {
            const messages = document.querySelectorAll('.error, .warning, .info, .loading, .message');
            return Array.from(messages).map(msg => ({
                className: msg.className,
                text: msg.textContent?.substring(0, 100) || '',
                visible: msg.offsetParent !== null
            }));
        });

        console.log('           Page messages found:', pageMessages);

        // --- FINAL ASSESSMENT ---
        console.log('[STEP 4/4] Final assessment...');

        console.log('\n🔍 STAFF DROPDOWN DEBUG RESULTS:');
        console.log('=====================================');

        if (dropdownInfo.error) {
            console.log('❌ Staff dropdown not found in HTML');
        } else if (dropdownInfo.optionsCount === 0) {
            console.log('❌ Staff dropdown exists but has no options');
            console.log('   - Dropdown ID:', dropdownInfo.id);
            console.log('   - Dropdown class:', dropdownInfo.className);
            console.log('   - Options count:', dropdownInfo.optionsCount);
        } else {
            console.log('✅ Staff dropdown has options:', dropdownInfo.optionsCount);
            console.log('   - First option:', dropdownInfo.options[0]);
        }

        console.log('\nDebug Information:');
        console.log('- Dropdown details:', dropdownInfo);
        console.log('- Dropdown-related scripts:', dropdownScripts);
        console.log('- Available staff functions:', staffFunctions);
        console.log('- HTML structure:', dropdownHTML);
        console.log('- Page messages:', pageMessages);

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

debugStaffDropdownIssue();
