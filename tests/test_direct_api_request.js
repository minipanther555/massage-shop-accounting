const fetch = require('node-fetch');

async function testDirectAPIRequest() {
  console.log('🚀 Testing direct API request to understand the 403 error');

  const baseUrl = 'https://109.123.238.197.sslip.io';

  try {
    // Step 1: Login to get session cookie
    console.log('\n🔐 Step 1: Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'manager',
        password: 'manager456'
      })
    });

    console.log('🔐 Login response status:', loginResponse.status);
    console.log('🔐 Login response headers:', Object.fromEntries(loginResponse.headers.entries()));

    if (!loginResponse.ok) {
      const loginError = await loginResponse.text();
      console.error('❌ Login failed:', loginError);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);

    // Extract cookies from response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Cookies received:', cookies);

    // Step 2: Make the transaction API request
    console.log('\n💳 Step 2: Making transaction API request...');

    const transactionData = {
      masseuse_name: 'Test Masseuse',
      service_type: 'Test Service',
      payment_method: 'Cash',
      start_time: '10:00 AM',
      end_time: '11:00 AM',
      customer_contact: 'test@example.com'
    };

    const transactionResponse = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies || ''
      },
      body: JSON.stringify(transactionData)
    });

    console.log('💳 Transaction response status:', transactionResponse.status);
    console.log('💳 Transaction response headers:', Object.fromEntries(transactionResponse.headers.entries()));

    const transactionBody = await transactionResponse.text();
    console.log('💳 Transaction response body:', transactionBody);

    // Step 3: Analyze the error
    if (transactionResponse.status === 403) {
      console.log('\n🔍 ERROR ANALYSIS:');
      console.log('Status: 403 Forbidden');
      console.log('Body:', transactionBody);

      if (transactionBody.includes('CSRF token required')) {
        console.log('✅ CONFIRMED: This is a CSRF token issue');
      } else if (transactionBody.includes('Authentication required')) {
        console.log('✅ CONFIRMED: This is an authentication issue');
      } else if (transactionBody.includes('Invalid CSRF token')) {
        console.log('✅ CONFIRMED: This is a CSRF validation issue');
      } else {
        console.log('❓ UNKNOWN: This is a different type of 403 error');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDirectAPIRequest();
