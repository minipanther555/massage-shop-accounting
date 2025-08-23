const puppeteer = require('puppeteer');

async function debugServiceDropdownComprehensive() {
  console.log('🚀 STARTING COMPREHENSIVE SERVICE DROPDOWN DEBUGGING');
  console.log('🔍 TESTING ALL 5 HYPOTHESES SIMULTANEOUSLY');

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
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    // Enable console logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
        console.log(`📝 PAGE LOG: ${msg.text()}`);
      }
    });

    // Enable network request logging for ALL requests
    page.on('request', (request) => {
      console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📤 REQUEST BODY: ${request.postData()}`);
      }
    });

    page.on('response', (response) => {
      console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
    });

    console.log('\n[STEP 1] Navigating to login page...');
    await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });

    console.log('\n[STEP 2] Logging in as reception...');
    await page.type('#username', 'reception');
    await page.type('#password', 'reception123');
    await page.click('#login-btn');

    // Wait for redirect and login
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n[STEP 3] Navigating to transaction page...');
    await page.goto('https://109.123.238.197.sslip.io/transaction.html', { waitUntil: 'networkidle2' });

    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n[STEP 4] COMPREHENSIVE DEBUGGING - Testing All 5 Hypotheses');

    // Test Hypothesis 1: Field Mapping Mismatch
    console.log('\n🔍 HYPOTHESIS 1: Field Mapping Mismatch');
    const fieldMappingTest = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 1 TEST: Checking field mapping...');
      console.log('🔍 CONFIG.settings.services structure:', CONFIG.settings.services);

      if (CONFIG.settings.services && CONFIG.settings.services.length > 0) {
        const firstService = CONFIG.settings.services[0];
        console.log('🔍 First service object keys:', Object.keys(firstService));
        console.log('🔍 First service object values:', firstService);

        // Check if the expected fields exist
        const hasName = 'name' in firstService;
        const hasServiceName = 'service_name' in firstService;
        const hasLocation = 'location' in firstService;

        console.log('🔍 Field existence check:', {
          hasName,
          hasServiceName,
          hasLocation,
          nameValue: firstService.name,
          serviceNameValue: firstService.service_name,
          locationValue: firstService.location
        });

        return {
          hasName, hasServiceName, hasLocation, firstService
        };
      }
      return { error: 'No services found' };
    });
    console.log('📊 HYPOTHESIS 1 RESULTS:', fieldMappingTest);

    // Test Hypothesis 2: Location Filter Logic Error
    console.log('\n🔍 HYPOTHESIS 2: Location Filter Logic Error');
    const locationFilterTest = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 2 TEST: Testing location filter logic...');

      const location = 'In-Shop'; // Test with In-Shop location
      console.log('🔍 Testing with location:', location);

      if (CONFIG.settings.services && CONFIG.settings.services.length > 0) {
        console.log('🔍 Total services available:', CONFIG.settings.services.length);

        // Test the exact filter logic from updateServiceOptions
        const locationServices = CONFIG.settings.services.filter((s) => s.location === location);
        console.log('🔍 Services matching location filter:', locationServices.length);

        if (locationServices.length > 0) {
          console.log('🔍 First matching service:', locationServices[0]);
          const uniqueServices = [...new Set(locationServices.map((s) => s.name))];
          console.log('🔍 Unique service names after mapping:', uniqueServices);
        }

        // Test alternative filter approaches
        const altFilter1 = CONFIG.settings.services.filter((s) => s.location && s.location.includes('In-Shop'));
        const altFilter2 = CONFIG.settings.services.filter((s) => s.location && s.location.toLowerCase() === 'in-shop');

        console.log('🔍 Alternative filter results:', {
          altFilter1: altFilter1.length,
          altFilter2: altFilter2.length
        });

        return {
          totalServices: CONFIG.settings.services.length,
          matchingServices: locationServices.length,
          uniqueServiceNames: locationServices.length > 0 ? [...new Set(locationServices.map((s) => s.name))] : [],
          altFilters: { altFilter1: altFilter1.length, altFilter2: altFilter2.length }
        };
      }
      return { error: 'No services found' };
    });
    console.log('📊 HYPOTHESIS 2 RESULTS:', locationFilterTest);

    // Test Hypothesis 3: CONFIG.settings.services Empty
    console.log('\n🔍 HYPOTHESIS 3: CONFIG.settings.services Empty');
    const configTest = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 3 TEST: Checking CONFIG.settings.services...');

      console.log('🔍 CONFIG object exists:', !!CONFIG);
      console.log('🔍 CONFIG.settings exists:', !!(CONFIG && CONFIG.settings));
      console.log('🔍 CONFIG.settings.services exists:', !!(CONFIG && CONFIG.settings && CONFIG.settings.services));

      if (CONFIG && CONFIG.settings && CONFIG.settings.services) {
        console.log('🔍 CONFIG.settings.services type:', typeof CONFIG.settings.services);
        console.log('🔍 CONFIG.settings.services length:', CONFIG.settings.services.length);
        console.log('🔍 CONFIG.settings.services is array:', Array.isArray(CONFIG.settings.services));

        if (Array.isArray(CONFIG.settings.services) && CONFIG.settings.services.length > 0) {
          console.log('🔍 First few services:', CONFIG.settings.services.slice(0, 3));
        }
      }

      // Check if services were loaded from API
      console.log('🔍 Checking if loadData() was called...');
      console.log('🔍 CONFIG.settings.masseuses:', CONFIG.settings.masseuses);
      console.log('🔍 CONFIG.settings.paymentMethods:', CONFIG.settings.paymentMethods);

      return {
        configExists: !!CONFIG,
        settingsExists: !!(CONFIG && CONFIG.settings),
        servicesExists: !!(CONFIG && CONFIG.settings && CONFIG.settings.services),
        servicesType: CONFIG && CONFIG.settings && CONFIG.settings.services ? typeof CONFIG.settings.services : 'N/A',
        servicesLength: CONFIG && CONFIG.settings && CONFIG.settings.services ? CONFIG.settings.services.length : 0,
        isArray: CONFIG && CONFIG.settings && CONFIG.settings.services ? Array.isArray(CONFIG.settings.services) : false,
        masseusesLength: CONFIG && CONFIG.settings && CONFIG.settings.masseuses ? CONFIG.settings.masseuses.length : 0,
        paymentMethodsLength: CONFIG && CONFIG.settings && CONFIG.settings.paymentMethods ? CONFIG.settings.paymentMethods.length : 0
      };
    });
    console.log('📊 HYPOTHESIS 3 RESULTS:', configTest);

    // Test Hypothesis 4: DOM Element Reference Issue
    console.log('\n🔍 HYPOTHESIS 4: DOM Element Reference Issue');
    const domTest = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 4 TEST: Checking DOM element references...');

      const locationSelect = document.getElementById('location');
      const serviceSelect = document.getElementById('service');
      const durationSelect = document.getElementById('duration');

      console.log('🔍 DOM elements found:', {
        location: !!locationSelect,
        service: !!serviceSelect,
        duration: !!durationSelect
      });

      if (locationSelect) {
        console.log('🔍 Location select properties:', {
          tagName: locationSelect.tagName,
          id: locationSelect.id,
          innerHTML: `${locationSelect.innerHTML.substring(0, 200)}...`,
          value: locationSelect.value,
          options: locationSelect.options.length
        });
      }

      if (serviceSelect) {
        console.log('🔍 Service select properties:', {
          tagName: serviceSelect.tagName,
          id: serviceSelect.id,
          innerHTML: `${serviceSelect.innerHTML.substring(0, 200)}...`,
          value: serviceSelect.value,
          options: serviceSelect.options.length
        });
      }

      if (durationSelect) {
        console.log('🔍 Duration select properties:', {
          tagName: durationSelect.tagName,
          id: durationSelect.id,
          innerHTML: `${durationSelect.innerHTML.substring(0, 200)}...`,
          value: durationSelect.value,
          options: durationSelect.options.length
        });
      }

      return {
        locationExists: !!locationSelect,
        serviceExists: !!serviceSelect,
        durationExists: !!durationSelect,
        locationOptions: locationSelect ? locationSelect.options.length : 0,
        serviceOptions: serviceSelect ? serviceSelect.options.length : 0,
        durationOptions: durationSelect ? durationSelect.options.length : 0
      };
    });
    console.log('📊 HYPOTHESIS 4 RESULTS:', domTest);

    // Test Hypothesis 5: Event Listener Not Triggering
    console.log('\n🔍 HYPOTHESIS 5: Event Listener Not Triggering');
    const eventListenerTest = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 5 TEST: Testing event listeners...');

      const locationSelect = document.getElementById('location');
      const serviceSelect = document.getElementById('service');

      if (locationSelect) {
        console.log('🔍 Location select event listeners:', locationSelect.onchange);
        console.log('🔍 Location select onclick:', locationSelect.onclick);

        // Test if updateServiceOptions function exists
        console.log('🔍 updateServiceOptions function exists:', typeof updateServiceOptions);

        // Manually trigger location change to test
        console.log('🔍 Manually setting location to In-Shop...');
        locationSelect.value = 'In-Shop';

        // Create and dispatch change event
        const changeEvent = new Event('change', { bubbles: true });
        locationSelect.dispatchEvent(changeEvent);

        console.log('🔍 After location change - service options:', serviceSelect ? serviceSelect.options.length : 'N/A');
        if (serviceSelect && serviceSelect.options.length > 1) {
          console.log('🔍 Service options after change:', Array.from(serviceSelect.options).map((opt) => opt.value));
        }

        return {
          locationValueSet: locationSelect.value,
          serviceOptionsAfterChange: serviceSelect ? serviceSelect.options.length : 0,
          serviceOptionsValues: serviceSelect && serviceSelect.options.length > 1
            ? Array.from(serviceSelect.options).map((opt) => opt.value) : []
        };
      }
      return { error: 'Location select not found' };
    });
    console.log('📊 HYPOTHESIS 5 RESULTS:', eventListenerTest);

    console.log('\n🎯 COMPREHENSIVE DEBUGGING COMPLETE');
    console.log('📊 SUMMARY OF ALL HYPOTHESES:');
    console.log('1. Field Mapping:', fieldMappingTest);
    console.log('2. Location Filter:', locationFilterTest);
    console.log('3. CONFIG Services:', configTest);
    console.log('4. DOM Elements:', domTest);
    console.log('5. Event Listeners:', eventListenerTest);
  } catch (error) {
    console.error('❌ ERROR during debugging:', error);
  } finally {
    await browser.close();
  }
}

debugServiceDropdownComprehensive().catch(console.error);
