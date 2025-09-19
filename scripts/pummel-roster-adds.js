#!/usr/bin/env node

/**
 * Pure HTTP Harness: 429 Add Flow Investigation
 * 
 * This script replicates the exact API calls that happen during staff roster adds
 * to isolate server-side rate limiting behavior. It captures rate limit headers
 * and request sequences to identify the root cause.
 * 
 * Usage: node scripts/pummel-roster-adds.js [number-of-adds]
 */

const fetch = require('node-fetch');
const base = process.env.BASE || 'http://localhost:3000';
const n = Number(process.argv[2] || 8);

console.log(`🔍 Starting HTTP harness for ${n} roster adds...`);
console.log(`🌐 Target: ${base}`);

(async () => {
  const jar = {}; // Simple cookie jar
  const events = [];
  
  // Helper to get CSRF token
  async function getCsrf() {
    console.log('🔐 Getting CSRF token...');
    const res = await fetch(`${base}/csrf`, { 
      redirect: 'manual',
      headers: {
        'User-Agent': 'HTTP-Harness/1.0'
      }
    });
    
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      jar.cookie = setCookie.split(';')[0];
      console.log(`🍪 Cookie set: ${jar.cookie}`);
    }
    
    const data = await res.json().catch(() => ({}));
    console.log(`🔑 CSRF token: ${data.token ? 'received' : 'missing'}`);
    
    events.push({
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: '/csrf',
      status: res.status,
      rateLimit: {
        limit: res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit'),
        remaining: res.headers.get('ratelimit-remaining') || res.headers.get('x-ratelimit-remaining'),
        reset: res.headers.get('ratelimit-reset') || res.headers.get('retry-after')
      }
    });
    
    return data.token;
  }
  
  // Helper to add staff to roster
  async function putRoster(pos, name, token) {
    console.log(`👤 Adding staff ${pos}: ${name}`);
    
    const res = await fetch(`${base}/api/staff/roster/${pos}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'X-CSRF-Token': token, 
        'Cookie': jar.cookie || '',
        'User-Agent': 'HTTP-Harness/1.0'
      },
      body: JSON.stringify({ masseuse_name: name, status: null })
    });
    
    const rateLimit = {
      limit: res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit'),
      remaining: res.headers.get('ratelimit-remaining') || res.headers.get('x-ratelimit-remaining'),
      reset: res.headers.get('ratelimit-reset') || res.headers.get('retry-after')
    };
    
    const body = await res.text();
    
    events.push({
      timestamp: new Date().toISOString(),
      method: 'PUT',
      url: `/api/staff/roster/${pos}`,
      status: res.status,
      rateLimit,
      body
    });
    
    console.log(`  PUT /api/staff/roster/${pos}: ${res.status} (${rateLimit.remaining}/${rateLimit.limit} remaining)`);
    
    return { status: res.status, rateLimit, body };
  }
  
  // Helper to get roster
  async function getRoster() {
    const res = await fetch(`${base}/api/staff/roster`, { 
      headers: { 
        'Cookie': jar.cookie || '',
        'User-Agent': 'HTTP-Harness/1.0'
      }
    });
    
    const rateLimit = {
      limit: res.headers.get('ratelimit-limit') || res.headers.get('x-ratelimit-limit'),
      remaining: res.headers.get('ratelimit-remaining') || res.headers.get('x-ratelimit-remaining'),
      reset: res.headers.get('ratelimit-reset') || res.headers.get('retry-after')
    };
    
    events.push({
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: '/api/staff/roster',
      status: res.status,
      rateLimit
    });
    
    console.log(`  GET /api/staff/roster: ${res.status} (${rateLimit.remaining}/${rateLimit.limit} remaining)`);
    
    return { status: res.status, rateLimit };
  }

  try {
    // Get initial CSRF token
    const token = await getCsrf();
    if (!token) {
      throw new Error('Failed to get CSRF token');
    }
    
    // Generate test staff names
    const names = Array.from({length: n}, (_, i) => `TestStaff_${i + 1}`);
    
    console.log(`\n🔄 Starting ${n} roster adds...`);
    
    let saw429 = false;
    let successfulAdds = 0;
    
    for (let i = 0; i < n; i++) {
      const pos = i + 1;
      const name = names[i];
      
      console.log(`\n--- Add #${pos} ---`);
      
      // PUT request to add staff
      const putResult = await putRoster(pos, name, token);
      
      if (putResult.status === 429) {
        console.log('🚨 429 on PUT request!');
        saw429 = true;
        break;
      }
      
      // GET request to refresh roster
      const getResult = await getRoster();
      
      if (getResult.status === 429) {
        console.log('🚨 429 on GET request!');
        saw429 = true;
        break;
      }
      
      if (putResult.status === 200 && getResult.status === 200) {
        successfulAdds++;
      }
      
      // Small delay to mimic UI timing
      await new Promise(r => setTimeout(r, 150));
    }
    
    // Analysis
    console.log('\n📊 Analysis Results:');
    console.log(`Total adds attempted: ${n}`);
    console.log(`Successful adds: ${successfulAdds}`);
    console.log(`429 detected: ${saw429}`);
    
    // Count requests by endpoint
    const endpointCounts = {};
    events.forEach(event => {
      const key = `${event.method} ${event.url}`;
      endpointCounts[key] = (endpointCounts[key] || 0) + 1;
    });
    
    console.log('\n🔝 Request Counts:');
    Object.entries(endpointCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([endpoint, count]) => {
        console.log(`  ${endpoint}: ${count} requests`);
      });
    
    // Show rate limit progression
    const rateLimitEvents = events.filter(e => e.rateLimit && e.rateLimit.remaining !== undefined);
    if (rateLimitEvents.length > 0) {
      console.log('\n📈 Rate Limit Progression:');
      rateLimitEvents.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.method} ${event.url}: ${event.rateLimit.remaining}/${event.rateLimit.limit} remaining`);
      });
    }
    
    // Show 429 responses
    const status429s = events.filter(e => e.status === 429);
    if (status429s.length > 0) {
      console.log('\n🚨 429 Responses:');
      status429s.forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.method} ${event.url} at ${event.timestamp}`);
      });
    }
    
    // Save artifacts
    const fs = require('fs');
    const path = require('path');
    const runDir = 'diagnostics/mystery-429__20250919-083514__TRC4/S2_MRE';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Ensure diagnostics directory exists
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    
    const artifacts = {
      events,
      summary: {
        totalAdds: n,
        successfulAdds,
        saw429,
        endpointCounts,
        rateLimitProgression: rateLimitEvents.map(e => ({
          method: e.method,
          url: e.url,
          remaining: e.rateLimit.remaining,
          limit: e.rateLimit.limit,
          timestamp: e.timestamp
        })),
        status429s: status429s.map(e => ({
          method: e.method,
          url: e.url,
          timestamp: e.timestamp
        }))
      }
    };
    
    fs.writeFileSync(
      path.join(runDir, `http-harness-events__${timestamp}__TRC4.json`),
      JSON.stringify(artifacts.events, null, 2)
    );
    
    fs.writeFileSync(
      path.join(runDir, `http-harness-summary__${timestamp}__TRC4.json`),
      JSON.stringify(artifacts.summary, null, 2)
    );
    
    console.log('\n✅ HTTP harness complete! Artifacts saved.');
    console.log(`📁 Saved to: ${runDir}`);
    
    // Exit with error if we hit 429
    if (saw429) {
      console.log('\n🚨 429 ERRORS FOUND - Investigation successful!');
      process.exit(1);
    } else {
      console.log('\nℹ️ No 429s found - may need more adds or different conditions');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ HTTP harness failed:', error);
    process.exit(1);
  }
})();
