// Simple production test to understand the authentication flow
const axios = require('axios');

const BASE = 'https://109.123.238.197.sslip.io';

async function testProduction() {
  console.log('🔍 Testing production authentication flow...');
  
  try {
    // Create axios instance with cookie jar
    const client = axios.create({
      baseURL: BASE,
      timeout: 10000,
      validateStatus: () => true,
      withCredentials: true
    });
    
    // Test 1: Check if we can bypass CSRF entirely with PWTEST
    console.log('1. Testing direct login with PWTEST bypass...');
    const loginRes = await client.post('/api/auth/login', {
      username: 'manager',
      password: 'manager456'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-PWTEST': '1'
      }
    });
    
    console.log(`   Login Status: ${loginRes.status}`);
    console.log(`   Login Response:`, loginRes.data);
    
    if (loginRes.status === 200) {
      console.log('   ✅ Login successful!');
      
      // Test 2: Try staff roster endpoint
      console.log('2. Testing staff roster endpoint...');
      const rosterRes = await client.get('/api/staff/roster');
      
      console.log(`   Roster Status: ${rosterRes.status}`);
      console.log(`   Roster Response:`, rosterRes.data);
      
      // Test 3: Try PUT request
      console.log('3. Testing PUT request...');
      const putRes = await client.put('/api/staff/roster/99', {
        masseuse_name: 'Test User',
        status: null
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   PUT Status: ${putRes.status}`);
      console.log(`   PUT Response:`, putRes.data);
      
      // Check for rate limit headers
      console.log('4. Rate limit headers:');
      console.log(`   Login: ${loginRes.headers['ratelimit-remaining']}/${loginRes.headers['ratelimit-limit']}`);
      console.log(`   Roster: ${rosterRes.headers['ratelimit-remaining']}/${rosterRes.headers['ratelimit-limit']}`);
      console.log(`   PUT: ${putRes.headers['ratelimit-remaining']}/${putRes.headers['ratelimit-limit']}`);
      
    } else {
      console.log('   ❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testProduction();