const request = require('supertest');

const baseURL = `http://localhost:${process.env.PORT || 3000}`;

describe('CSRF API Contract', () => {
  test('GET /csrf should return a token and set a _csrf cookie', async () => {
    const response = await request(baseURL).get('/csrf').expect(200);

    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(0);

    const cookies = response.headers['set-cookie'];
    expect(cookies.some(cookie => cookie.startsWith('_csrf='))).toBe(true);
  });

  test('POST to a protected route without a token should fail', async () => {
    // We need to manage cookies manually when not using an agent
    const csrfResponse = await request(baseURL).get('/csrf');
    const cookie = csrfResponse.headers['set-cookie'];

    await request(baseURL)
      .post('/api/auth/login')
      .set('Cookie', cookie)
      .send({ username: 'manager', password: 'manager456' })
      .expect(403)
      .then(response => {
        expect(response.body.error).toContain('Invalid CSRF token');
      });
  });

  test('POST with correct token and cookie should succeed', async () => {
    const csrfResponse = await request(baseURL).get('/csrf');
    const token = csrfResponse.body.token;
    const cookie = csrfResponse.headers['set-cookie'];

    await request(baseURL)
      .post('/api/auth/login')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', token)
      .send({ username: 'manager', password: 'manager456' })
      .expect(200)
      .then(response => {
        expect(response.body.success).toBe(true);
      });
  });
});
