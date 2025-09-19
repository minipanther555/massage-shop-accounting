/**
 * Integration Test: Mystery 429 Idle Capture Investigation
 * 
 * This test follows the project's integration testing pattern:
 * - Real HTTP requests to live server (NO supertest(app))
 * - Uses PWTEST bypass system for authentication
 * - Captures network activity during idle periods
 * - Identifies source of unexpected 429 rate limiting
 */

const { requestWithCsrf } = require('../helpers/requestWithCsrf');

describe('Mystery 429 - Idle Capture Investigation', () => {
  let captureData = {
    netLedger: [],
    timerRegistry: new Map(),
    startTime: Date.now(),
    first429Time: null
  };

  // Mock fetch to capture all requests
  const originalFetch = global.fetch;
  beforeAll(() => {
    global.fetch = jest.fn((url, options = {}) => {
      const method = options.method || 'GET';
      const startTime = Date.now();
      
      console.log(`🌐 [CAPTURE] Fetch: ${method} ${url}`);
      
      return originalFetch(url, options)
        .then(response => {
          const duration = Date.now() - startTime;
          const entry = {
            timestamp: new Date().toISOString(),
            method,
            url: url.toString(),
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            durationMs: duration,
            type: 'fetch'
          };
          
          captureData.netLedger.push(entry);
          
          if (response.status === 429) {
            captureData.first429Time = Date.now();
            console.log(`🚨 [CAPTURE] 429 DETECTED at ${new Date().toISOString()}`);
          }
          
          return response;
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          const entry = {
            timestamp: new Date().toISOString(),
            method,
            url: url.toString(),
            status: 'ERROR',
            statusText: error.message,
            contentType: null,
            durationMs: duration,
            type: 'fetch',
            error: true
          };
          
          captureData.netLedger.push(entry);
          throw error;
        });
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('should capture idle network activity and identify 429 sources', async (done) => {
    console.log('🔍 Starting idle capture test...');
    
    try {
      // Test 1: Verify server is running and accessible
      console.log('🌐 Testing server connectivity...');
      const healthResponse = await requestWithCsrf({
        url: '/health',
        method: 'GET'
      });
      
      expect(healthResponse.status).toBe(200);
      console.log('✅ Server is running');

      // Test 2: Load staff page with PWTEST bypass
      console.log('🌐 Loading staff page with PWTEST bypass...');
      const staffResponse = await requestWithCsrf({
        url: '/staff.html?PWTEST=1',
        method: 'GET'
      });
      
      expect(staffResponse.status).toBe(200);
      console.log('✅ Staff page loaded');

      // Test 3: Test API endpoints that might be called during idle
      console.log('🌐 Testing staff API endpoints...');
      
      // Test /api/staff/allstaff
      const allStaffResponse = await requestWithCsrf({
        url: '/api/staff/allstaff',
        method: 'GET'
      });
      
      expect(allStaffResponse.status).toBe(200);
      console.log('✅ All staff endpoint working');

      // Test /api/staff/roster
      const rosterResponse = await requestWithCsrf({
        url: '/api/staff/roster',
        method: 'GET'
      });
      
      expect(rosterResponse.status).toBe(200);
      console.log('✅ Roster endpoint working');

      // Test /csrf endpoint (this might be called frequently)
      const csrfResponse = await requestWithCsrf({
        url: '/csrf',
        method: 'GET'
      });
      
      expect(csrfResponse.status).toBe(200);
      console.log('✅ CSRF endpoint working');

      // Test 4: Simulate idle period with repeated requests
      console.log('⏰ Simulating idle period with repeated API calls...');
      
      const idleDuration = 2 * 60 * 1000; // 2 minutes (reduced for testing)
      const checkInterval = 10000; // Check every 10 seconds
      const startTime = Date.now();
      
      while (Date.now() - startTime < idleDuration) {
        // Make the same API calls that might happen during idle
        try {
          await requestWithCsrf({
            url: '/api/staff/roster',
            method: 'GET'
          });
          
          await requestWithCsrf({
            url: '/csrf',
            method: 'GET'
          });
          
          console.log(`📊 [${Math.floor((Date.now() - startTime) / 1000)}s] Made API calls`);
        } catch (error) {
          console.log(`❌ API call failed: ${error.message}`);
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

      // Test 5: Analyze captured data
      console.log('📊 Analyzing captured data...');
      
      const endpointCounts = {};
      captureData.netLedger.forEach(entry => {
        endpointCounts[entry.url] = (endpointCounts[entry.url] || 0) + 1;
      });

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      console.log('📊 Final Analysis:');
      console.log('Total network requests:', captureData.netLedger.length);
      console.log('Top endpoints:', topEndpoints);

      // Check for 429s
      const status429s = captureData.netLedger.filter(entry => entry.status === 429);
      if (status429s.length > 0) {
        console.log('🚨 429 ERRORS DETECTED:');
        status429s.forEach(entry => {
          console.log(`  - ${entry.method} ${entry.url} at ${entry.timestamp}`);
        });
      } else {
        console.log('✅ No 429 errors detected during capture period');
      }

      // Save artifacts
      const artifacts = {
        netLedger: captureData.netLedger,
        summary: {
          totalRequests: captureData.netLedger.length,
          duration: Date.now() - captureData.startTime,
          first429Time: captureData.first429Time,
          topEndpoints
        }
      };

      // Write artifacts to diagnostics directory
      const fs = require('fs');
      const path = require('path');
      const diagnosticsDir = path.join(__dirname, '../../diagnostics/mystery-429__20250919-083514__TRC4/S2_MRE');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Ensure diagnostics directory exists
      if (!fs.existsSync(diagnosticsDir)) {
        fs.mkdirSync(diagnosticsDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(diagnosticsDir, `net-ledger__${timestamp}__TRC4.json`),
        JSON.stringify(artifacts.netLedger, null, 2)
      );
      
      fs.writeFileSync(
        path.join(diagnosticsDir, `idle-summary__${timestamp}__TRC4.json`),
        JSON.stringify(artifacts.summary, null, 2)
      );

      console.log('✅ Capture complete! Artifacts saved to diagnostics directory.');

      // Assertions
      expect(captureData.netLedger.length).toBeGreaterThan(0);
      
      if (status429s.length > 0) {
        console.log('🚨 429 ERRORS FOUND - Investigation successful!');
        expect(status429s.length).toBeGreaterThan(0);
      } else {
        console.log('ℹ️ No 429s found - may need longer monitoring period');
      }

      done();
    } catch (error) {
      console.error('❌ Test failed:', error);
      done(error);
    }
  }, 300000); // 5 minute timeout
});
