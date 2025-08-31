const request = require('supertest');
const app = require('../../backend/server'); // Use the actual server instance

describe('CSRF API Contract', () => {
  let agent;
  let csrfToken;

  beforeEach(() => {
    // supertest agent will manage cookies for us across requests
    agent = request.agent(app);
  });

  test('GET /csrf should return a token and set a _csrf cookie', async () => {
    const response = await agent.get('/csrf').expect(200);

    // Check for the token in the response body
    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(0);
    csrfToken = response.body.token; // Save for the next test

    // Check for the _csrf secret cookie in the headers
    const cookies = response.headers['set-cookie'];
    expect(cookies.some(cookie => cookie.startsWith('_csrf='))).toBe(true);
  });

  test('POST to a protected route without a token should fail', async () => {
    // First, establish a session and get the cookie by hitting the csrf endpoint
    await agent.get('/csrf').expect(200);

    // Then, attempt to POST without the token header
    await agent
      .post('/api/auth/login')
      .send({ username: 'manager', password: 'manager456' })
      .expect(403)
      .then(response => {
        expect(response.body.error).toContain('Invalid CSRF token');
      });
  });

  test('POST to a protected route with an incorrect token should fail', async () => {
    await agent.get('/csrf').expect(200);

    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', 'this-is-a-bad-token')
      .send({ username: 'manager', password: 'manager456' })
      .expect(403)
      .then(response => {
        expect(response.body.error).toContain('Invalid CSRF token');
      });
  });

  test('POST to a protected route with the correct token and cookie should succeed', async () => {
    // Step 1: Get the token and the cookie
    const csrfResponse = await agent.get('/csrf').expect(200);
    const token = csrfResponse.body.token;

    // Step 2: Make the POST request with the token in the header
    // The agent automatically sends the cookie it received in the first request.
    await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ username: 'manager', password: 'manager456' })
      .expect(200)
      .then(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.user.username).toBe('manager');
      });
  });
});
