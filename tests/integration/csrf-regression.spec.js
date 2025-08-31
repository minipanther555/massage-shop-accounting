/**
 * CSRF Regression Test
 * 
 * This test ensures that the CSRF mixed mode issue never regresses.
 * It verifies the complete CSRF flow: token fetch → validation → authentication.
 */

const { requestWithCsrf } = require('../helpers/requestWithCsrf');
const request = require('supertest');

const baseURL = `http://localhost:${process.env.PORT || 3000}`;

describe('CSRF Regression Test', () => {
  test('Login flow should succeed with correct CSRF token', async () => {
    // 1. Get CSRF token and cookie
    const csrfResponse = await request(baseURL).get('/csrf');
    const csrfToken = csrfResponse.body.token;
    const cookies = csrfResponse.headers['set-cookie'];

    expect(csrfToken).toBeDefined();

    // 2. Attempt login with the token and cookie
    const loginResponse = await request(baseURL)
      .post('/api/auth/login')
      .set('Cookie', cookies.join('; ')) // Join multiple cookies with semicolon
      .set('X-CSRF-Token', csrfToken)
      .send({ username: 'manager', password: 'manager456' })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.user.username).toBe('manager');
  });

  test('Login flow should fail without CSRF token', async () => {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const csrfResponse = await request(baseURL).get('/csrf');
    const cookies = csrfResponse.headers['set-cookie'];

    await request(baseURL)
      .post('/api/auth/login')
      .set('Cookie', cookies.join('; ')) // Join multiple cookies with semicolon
      .send({ username: 'manager', password: 'manager456' })
      .expect(403);
  });
});
