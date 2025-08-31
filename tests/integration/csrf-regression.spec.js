/**
 * CSRF Regression Test
 * 
 * This test ensures that the CSRF mixed mode issue never regresses.
 * It verifies the complete CSRF flow: token fetch → validation → authentication.
 */

const request = require('supertest');
const app = require('../../backend/server');

describe('CSRF Regression Test', () => {
  let csrfToken;
  let cookies;

  beforeAll(async () => {
    // Fetch CSRF token and establish session
    const response = await request(app)
      .get('/csrf')
      .expect(200);
    
    csrfToken = response.body.token;
    cookies = response.headers['set-cookie'];
    
    expect(csrfToken).toBeDefined();
    expect(csrfToken).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  describe('CSRF Token Endpoint', () => {
    it('should return a valid CSRF token', () => {
      expect(csrfToken).toBeDefined();
      expect(typeof csrfToken).toBe('string');
      expect(csrfToken.length).toBeGreaterThan(20);
    });

    it('should set secure CSRF cookies', () => {
      expect(cookies).toBeDefined();
      const csrfCookie = cookies.find(cookie => cookie.includes('csrf'));
      expect(csrfCookie).toBeDefined();
    });
  });

  describe('CSRF Validation', () => {
    it('should accept valid CSRF tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', cookies)
        .send({
          username: 'manager',
          password: 'manager456'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('manager');
    });

    it('should reject requests without CSRF tokens', async () => {
      await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookies)
        .send({
          username: 'manager',
          password: 'manager456'
        })
        .expect(403);
    });

    it('should reject requests with invalid CSRF tokens', async () => {
      await request(app)
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'invalid-token')
        .set('Cookie', cookies)
        .send({
          username: 'manager',
          password: 'manager456'
        })
        .expect(403);
    });
  });

  describe('CSRF Mode Consistency', () => {
    it('should not have session-mode CSRF middleware', () => {
      // This test ensures we never reintroduce session-mode CSRF
      const serverCode = require('fs').readFileSync('backend/server.js', 'utf8');
      expect(serverCode).not.toMatch(/sessionKey.*session/);
      expect(serverCode).not.toMatch(/app\.use\(session/);
    });

    it('should have cookie-mode CSRF configuration', () => {
      const csrfMiddleware = require('fs').readFileSync('backend/middleware/csrf-protection.js', 'utf8');
      expect(csrfMiddleware).toMatch(/cookie.*sameSite/);
      expect(csrfMiddleware).toMatch(/secure.*process\.env\.NODE_ENV/);
    });
  });
});
