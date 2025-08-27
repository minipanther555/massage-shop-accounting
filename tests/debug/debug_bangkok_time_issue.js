const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
  username: 'manager',
  password: 'manager456'
};

async function debugBangkokTimeIssue() {
  console.log('🔍 DEBUGGING BANGKOK TIME AUTO-FILL ISSUE 🔍');

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
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

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
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // --- TRANSACTION PAGE TEST ---
    console.log('[STEP 3/4] Testing transaction page time field...');
    await page.goto(`${BASE_URL}/api/main/transaction`, { waitUntil: 'networkidle2' });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if time field exists and has value
    console.log('           Checking time field...');
    const timeFieldInfo = await page.evaluate(() => {
      const timeField = document.querySelector('#startTime');
      if (!timeField) {
        return { error: 'Time field not found' };
      }

      return {
        exists: true,
        value: timeField.value,
        placeholder: timeField.placeholder,
        type: timeField.type,
        id: timeField.id,
        className: timeField.className
      };
    });

    console.log('           Time field info:', timeFieldInfo);

    // Check if there's any JavaScript trying to set the time
    const timeSettingScripts = await page.evaluate(() => {
      const scripts = Array.from(document.scripts);
      const timeRelatedScripts = scripts.filter((script) => {
        const content = script.textContent || '';
        return content.includes('startTime')
                       || content.includes('time')
                       || content.includes('Date')
                       || content.includes('setTime');
      });

      return timeRelatedScripts.map((script) => ({
        src: script.src,
        hasContent: !!script.textContent,
        contentLength: script.textContent ? script.textContent.length : 0
      }));
    });

    console.log('           Time-related scripts found:', timeSettingScripts);

    // Check if there are any time-related functions
    const timeFunctions = await page.evaluate(() => ({
      hasSetCurrentTime: typeof setCurrentTime === 'function',
      hasInitializeTime: typeof initializeTime === 'function',
      hasUpdateTime: typeof updateTime === 'function',
      hasUpdateTimeDropdowns: typeof updateTimeDropdowns === 'function',
      hasDateFunctions: typeof Date !== 'undefined',
      currentTime: new Date().toLocaleTimeString()
    }));

    console.log('           Time functions available:', timeFunctions);

    // Check the actual HTML structure around the time field
    const timeFieldHTML = await page.evaluate(() => {
      const timeField = document.querySelector('#startTime');
      if (!timeField) return 'Time field not found';

      const parent = timeField.parentElement;
      return {
        timeFieldHTML: timeField.outerHTML,
        parentHTML: parent ? parent.outerHTML : 'No parent',
        siblings: Array.from(timeField.parentElement?.children || []).map((child) => ({
          tag: child.tagName,
          id: child.id,
          className: child.className
        }))
      };
    });

    console.log('           Time field HTML structure:', timeFieldHTML);

    // --- FINAL ASSESSMENT ---
    console.log('[STEP 4/4] Final assessment...');

    console.log('\n🔍 BANGKOK TIME AUTO-FILL DEBUG RESULTS:');
    console.log('=====================================');

    if (timeFieldInfo.error) {
      console.log('❌ Time field not found in HTML');
    } else if (!timeFieldInfo.value) {
      console.log('❌ Time field exists but has no value');
      console.log('   - Field type:', timeFieldInfo.type);
      console.log('   - Field ID:', timeFieldInfo.id);
      console.log('   - Field class:', timeFieldInfo.className);
    } else {
      console.log('✅ Time field has value:', timeFieldInfo.value);
    }

    console.log('\nDebug Information:');
    console.log('- Time field details:', timeFieldInfo);
    console.log('- Time-related scripts:', timeSettingScripts);
    console.log('- Available time functions:', timeFunctions);
    console.log('- HTML structure:', timeFieldInfo);
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

debugBangkokTimeIssue();
