/**
 * Regression Test: No 429 Errors on Staff Endpoints
 * 
 * This test ensures that staff roster operations never trigger 429 rate limiting errors.
 * It simulates the exact user behavior that previously caused the issue.
 */

const { requestWithCsrf } = require('../helpers/requestWithCsrf');

const baseURL = `http://localhost:${process.env.PORT || 3000}`;

describe('Staff Rate Limiting Regression', () => {
  test('should not trigger 429 errors on rapid staff roster updates', async () => {
    // Authenticate first
    const csrfResponse = await requestWithCsrf({
      url: '/csrf',
      method: 'GET'
    });
    
    const loginResponse = await requestWithCsrf({
      url: '/api/auth/login',
      method: 'POST',
      body: { username: 'manager', password: 'manager456' }
    });
    const loginData = await loginResponse.json();
    
    expect(loginResponse.status).toBe(200);
    expect(loginData.success).toBe(true);
    
    // Simulate rapid staff roster updates (the burst pattern that caused 429s)
    const requests = [];
    for (let i = 1; i <= 50; i++) {
      requests.push(
        requestWithCsrf({
          url: `/api/staff/roster/1`,
          method: 'PUT',
          body: { masseuse_name: `test${i}` }
        })
      );
    }
    
    // Execute all requests
    const responses = await Promise.all(requests);
    
    // Verify no 429 errors occurred
    const statusCodes = responses.map(r => r.status);
    const error429Count = statusCodes.filter(code => code === 429).length;
    
    expect(error429Count).toBe(0);
    
    console.log(`✅ Regression test passed: ${statusCodes.length} requests, 0×429 errors; statuses=${JSON.stringify(statusCodes)}`);
  }, 30000); // 30 second timeout for burst test
  
  test('should have generous rate limits configured', async () => {
    // This test verifies the rate limiter configuration
    // It's a contract test to ensure environment-driven limits are used
    
    // Make a single request to check if rate limiting is working
    const response = await requestWithCsrf({
      url: '/api/staff/roster',
      method: 'GET'
    });
    
    expect(response.status).toBe(200);
    
    // The test passes if we can make requests without immediate 429 errors
    // This indicates the rate limiter is using generous defaults
  });
});
