/**
 * Playwright Test: Idle Capture for Mystery 429 Investigation
 * 
 * This test loads the staff page and captures all network activity during idle periods
 * to identify the source of unexpected 429 rate limiting.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Mystery 429 - Idle Capture on Staff Page', async ({ page }) => {
  const runDir = path.dirname(__filename);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log('🔍 Starting idle capture test...');
  
  // Inject capture harness before any page scripts run
  await page.addInitScript(() => {
    // Load the capture harness
    const harnessScript = `
      // Global capture objects
      window.__MYSTERY_429_CAPTURE = {
        netLedger: [],
        timerRegistry: new Map(),
        listenerRegistry: new Map(),
        startTime: Date.now(),
        first429Time: null,
        isCapturing: true
      };

      // Network capture
      const originalFetch = window.fetch;
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;

      // Capture fetch requests
      window.fetch = function(...args) {
        const [url, options = {}] = args;
        const method = options.method || 'GET';
        const startTime = Date.now();
        
        console.log(\`🌐 [CAPTURE] Fetch: \${method} \${url}\`);
        
        return originalFetch.apply(this, args)
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
            
            window.__MYSTERY_429_CAPTURE.netLedger.push(entry);
            
            if (response.status === 429) {
              window.__MYSTERY_429_CAPTURE.first429Time = Date.now();
              console.log(\`🚨 [CAPTURE] 429 DETECTED at \${new Date().toISOString()}\`);
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
            
            window.__MYSTERY_429_CAPTURE.netLedger.push(entry);
            throw error;
          });
      };

      // Capture XMLHttpRequest
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._captureMethod = method;
        this._captureUrl = url;
        this._captureStartTime = Date.now();
        return originalXHROpen.apply(this, [method, url, ...args]);
      };

      XMLHttpRequest.prototype.send = function(...args) {
        const xhr = this;
        const method = xhr._captureMethod || 'GET';
        const url = xhr._captureUrl || '';
        const startTime = xhr._captureStartTime || Date.now();
        
        console.log(\`🌐 [CAPTURE] XHR: \${method} \${url}\`);
        
        xhr.addEventListener('loadend', () => {
          const duration = Date.now() - startTime;
          const entry = {
            timestamp: new Date().toISOString(),
            method,
            url: url.toString(),
            status: xhr.status,
            statusText: xhr.statusText,
            contentType: xhr.getResponseHeader('content-type'),
            durationMs: duration,
            type: 'xhr'
          };
          
          window.__MYSTERY_429_CAPTURE.netLedger.push(entry);
          
          if (xhr.status === 429) {
            window.__MYSTERY_429_CAPTURE.first429Time = Date.now();
            console.log(\`🚨 [CAPTURE] 429 DETECTED at \${new Date().toISOString()}\`);
          }
        });
        
        return originalXHRSend.apply(this, args);
      };

      // Timer capture
      const originalSetTimeout = window.setTimeout;
      const originalSetInterval = window.setInterval;
      const originalClearTimeout = window.clearTimeout;
      const originalClearInterval = window.clearInterval;

      window.setTimeout = function(callback, delay, ...args) {
        const id = originalSetTimeout.apply(this, [callback, delay, ...args]);
        const timerEntry = {
          id,
          type: 'setTimeout',
          delay,
          createdAt: Date.now(),
          stack: new Error().stack
        };
        
        window.__MYSTERY_429_CAPTURE.timerRegistry.set(id, timerEntry);
        console.log(\`⏰ [CAPTURE] setTimeout: \${delay}ms (ID: \${id})\`);
        
        return id;
      };

      window.setInterval = function(callback, delay, ...args) {
        const id = originalSetInterval.apply(this, [callback, delay, ...args]);
        const timerEntry = {
          id,
          type: 'setInterval',
          delay,
          createdAt: Date.now(),
          stack: new Error().stack
        };
        
        window.__MYSTERY_429_CAPTURE.timerRegistry.set(id, timerEntry);
        console.log(\`⏰ [CAPTURE] setInterval: \${delay}ms (ID: \${id})\`);
        
        return id;
      };

      window.clearTimeout = function(id) {
        window.__MYSTERY_429_CAPTURE.timerRegistry.delete(id);
        console.log(\`⏰ [CAPTURE] clearTimeout: \${id}\`);
        return originalClearTimeout.apply(this, [id]);
      };

      window.clearInterval = function(id) {
        window.__MYSTERY_429_CAPTURE.timerRegistry.delete(id);
        console.log(\`⏰ [CAPTURE] clearInterval: \${id}\`);
        return originalClearInterval.apply(this, [id]);
      };

      // Export capture data
      window.exportCaptureData = function() {
        const data = {
          netLedger: window.__MYSTERY_429_CAPTURE.netLedger,
          timerRegistry: Array.from(window.__MYSTERY_429_CAPTURE.timerRegistry.entries()),
          listenerRegistry: Array.from(window.__MYSTERY_429_CAPTURE.listenerRegistry.entries()),
          startTime: window.__MYSTERY_429_CAPTURE.startTime,
          first429Time: window.__MYSTERY_429_CAPTURE.first429Time,
          endTime: Date.now(),
          duration: Date.now() - window.__MYSTERY_429_CAPTURE.startTime
        };
        
        console.log('📤 [CAPTURE] Exporting data:', data);
        return data;
      };

      console.log('🔍 [CAPTURE] Mystery 429 capture harness initialized');
    `;
    
    eval(harnessScript);
  });

  // Navigate to staff page with PWTEST flag
  console.log('🌐 Navigating to staff page...');
  await page.goto('http://localhost:3000/staff.html?PWTEST=1', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });

  // Wait for page to fully load
  console.log('⏳ Waiting for page to load...');
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for staff controller to initialize
  await page.waitForFunction(() => {
    return document.documentElement.getAttribute('data-staff-ctrl') === 'init';
  }, { timeout: 10000 });

  console.log('✅ Page loaded, starting idle capture...');
  
  // Capture initial state
  const initialData = await page.evaluate(() => {
    return window.exportCaptureData();
  });
  
  console.log('📊 Initial capture data:', {
    networkRequests: initialData.netLedger.length,
    activeTimers: initialData.timerRegistry.length,
    eventListeners: initialData.listenerRegistry.length
  });

  // Idle for 10 minutes (or until 429 detected)
  const idleDuration = 10 * 60 * 1000; // 10 minutes
  const startTime = Date.now();
  
  console.log(`⏰ Starting ${idleDuration / 60000} minute idle period...`);
  
  // Check every 30 seconds for 429s
  const checkInterval = 30000; // 30 seconds
  let has429 = false;
  
  while (Date.now() - startTime < idleDuration && !has429) {
    await page.waitForTimeout(checkInterval);
    
    const currentData = await page.evaluate(() => {
      return window.exportCaptureData();
    });
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`📊 [${elapsed}s] Status:`, {
      networkRequests: currentData.netLedger.length,
      activeTimers: currentData.timerRegistry.length,
      first429: currentData.first429Time ? 
        `${Math.floor((currentData.first429Time - currentData.startTime) / 1000)}s` : 
        'none'
    });
    
    // Check for 429s
    const recent429s = currentData.netLedger.filter(entry => 
      entry.status === 429 && 
      (Date.now() - new Date(entry.timestamp).getTime()) < checkInterval
    );
    
    if (recent429s.length > 0) {
      console.log('🚨 429 detected! Stopping capture early.');
      has429 = true;
    }
  }

  // Final capture
  console.log('📤 Final capture...');
  const finalData = await page.evaluate(() => {
    return window.exportCaptureData();
  });

  // Save artifacts
  const artifacts = {
    netLedger: finalData.netLedger,
    timerRegistry: finalData.timerRegistry,
    listenerRegistry: finalData.listenerRegistry,
    summary: {
      totalRequests: finalData.netLedger.length,
      duration: finalData.duration,
      first429Time: finalData.first429Time,
      endpointCounts: {}
    }
  };

  // Calculate endpoint counts
  finalData.netLedger.forEach(entry => {
    artifacts.summary.endpointCounts[entry.url] = 
      (artifacts.summary.endpointCounts[entry.url] || 0) + 1;
  });

  // Sort endpoints by count
  artifacts.summary.topEndpoints = Object.entries(artifacts.summary.endpointCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  // Save to files
  fs.writeFileSync(
    path.join(runDir, `net-ledger__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.netLedger, null, 2)
  );
  
  fs.writeFileSync(
    path.join(runDir, `timer-registry__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.timerRegistry, null, 2)
  );
  
  fs.writeFileSync(
    path.join(runDir, `idle-summary__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.summary, null, 2)
  );

  console.log('✅ Capture complete! Artifacts saved.');
  console.log('📊 Final Summary:', artifacts.summary);
  
  // Print top endpoints
  console.log('🔝 Top Endpoints:');
  artifacts.summary.topEndpoints.forEach(([url, count], index) => {
    console.log(`  ${index + 1}. ${url}: ${count} requests`);
  });

  // Check for 429s
  const status429s = finalData.netLedger.filter(entry => entry.status === 429);
  if (status429s.length > 0) {
    console.log('🚨 429 ERRORS DETECTED:');
    status429s.forEach(entry => {
      console.log(`  - ${entry.method} ${entry.url} at ${entry.timestamp}`);
    });
  } else {
    console.log('✅ No 429 errors detected during capture period');
  }
});
