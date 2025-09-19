// Test CSRF flow using cookie value
const axios = require('axios');

const BASE = 'https://109.123.238.197.sslip.io';

async function testCookieCSRF() {
  console.log('🔍 Testing CSRF flow with cookie value...');
  
  try {
    // Create axios instance with cookie jar
    const client = axios.create({
      baseURL: BASE,
      timeout: 10000,
      validateStatus: () => true,
      withCredentials: true
    });
    
    // Step 1: Get CSRF token (this should set the cookie)
    console.log('1. Getting CSRF token...');
    const csrfRes = await client.get('/csrf');
    console.log(`   CSRF Status: ${csrfRes.status}`);
    console.log(`   CSRF Response:`, csrfRes.data);
    console.log(`   CSRF Cookies:`, csrfRes.headers['set-cookie']);
    
    if (csrfRes.status === 200) {
      // Extract token from cookie
      const setCookieHeader = csrfRes.headers['set-cookie'];
      let cookieToken = null;
      if (setCookieHeader) {
        const csrfCookie = setCookieHeader.find(c => c.startsWith('_csrf='));
        if (csrfCookie) {
          cookieToken = csrfCookie.split('=')[1].split(';')[0];
          console.log(`   ✅ Cookie CSRF token: ${cookieToken.substring(0, 20)}...`);
        }
      }
      
      const responseToken = csrfRes.data.token;
      console.log(`   Response token: ${responseToken.substring(0, 20)}...`);
      
      // Step 2: Try login with the cookie token
      console.log('2. Testing login with cookie CSRF token...');
      const loginRes = await client.post('/api/auth/login', {
        username: 'manager',
        password: 'manager456'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': cookieToken
        }
      });
      
      console.log(`   Login Status: ${loginRes.status}`);
      console.log(`   Login Response:`, loginRes.data);
      
      if (loginRes.status === 200) {
        console.log('   ✅ Login successful!');
        
        // Step 3: Test staff roster
        console.log('3. Testing staff roster...');
        const rosterRes = await client.get('/api/staff/roster');
        console.log(`   Roster Status: ${rosterRes.status}`);
        
        // Step 4: Test PUT request
        console.log('4. Testing PUT request...');
        const putRes = await client.put('/api/staff/roster/99', {
          masseuse_name: 'Test User',
          status: null
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': cookieToken
          }
        });
        
        console.log(`   PUT Status: ${putRes.status}`);
        console.log(`   PUT Response:`, putRes.data);
        
        // Check rate limit headers
        console.log('5. Rate limit headers:');
        console.log(`   Login: ${loginRes.headers['ratelimit-remaining']}/${loginRes.headers['ratelimit-limit']}`);
        console.log(`   Roster: ${rosterRes.headers['ratelimit-remaining']}/${rosterRes.headers['ratelimit-limit']}`);
        console.log(`   PUT: ${putRes.headers['ratelimit-remaining']}/${putRes.headers['ratelimit-limit']}`);
        
      } else {
        console.log('   ❌ Login failed');
      }
    } else {
      console.log('   ❌ CSRF failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCookieCSRF();
