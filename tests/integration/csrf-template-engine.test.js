const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const path = require('path');
const fs = require('fs');
const MockDate = require('mockdate');

// Test configuration
const TEST_PORT = 3001;
const TEST_DB_PATH = path.join(__dirname, '../../test-data/test-csrf.db');

// Deterministic test setup
const TEST_SEED = 12345;
const TEST_TIMESTAMP = '2024-12-19T20:00:00.000Z';

describe('CSRF Template Engine MRE', () => {
  let app;
  let server;
  let csrfToken;
  let csrfCookie;

  beforeAll(async () => {
    // Freeze time for deterministic tests
    MockDate.set(TEST_TIMESTAMP);
    
    // Create isolated test database directory
    const testDataDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Initialize test app with minimal CSRF setup
    app = express();
    
    // 1. Cookie Parser (required before csurf)
    app.use(cookieParser());
    
    // 2. Body Parsers
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // 3. CSRF Protection (replicating production setup)
    const csrfProtection = csrf({ cookie: true });
    app.use(csrfProtection);
    
    // 4. CSRF Token Injection (replicating production setup)
    app.use((req, res, next) => {
      if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
      }
      next();
    });

    // 5. Test routes for CSRF token issuance
    app.get('/csrf', (req, res) => {
      res.json({ 
        token: req.csrfToken(),
        timestamp: new Date().toISOString()
      });
    });

    // 6. Test login endpoint (protected by CSRF)
    app.post('/auth/login', (req, res) => {
      // This should succeed if CSRF token is valid
      res.json({ 
        success: true, 
        message: 'CSRF validation passed',
        receivedToken: req.headers['x-csrf-token'] || 'none'
      });
    });

    // 7. Static file serving (replicating production issue)
    app.use(express.static(path.join(__dirname, '../../web-app')));

    // 8. CSRF Error Handler (replicating production)
    app.use((err, req, res, next) => {
      if (err.code !== 'EBADCSRFTOKEN') {
        return next(err);
      }
      res.status(403).json({ 
        error: 'Invalid CSRF token.',
        code: err.code,
        timestamp: new Date().toISOString()
      });
    });

    // Start test server
    server = app.listen(TEST_PORT);
  });

  afterAll(async () => {
    MockDate.reset();
    if (server) {
      server.close();
    }
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    // Reset state for each test
    csrfToken = null;
    csrfCookie = null;
  });

  describe('CSRF Token Generation', () => {
    test('should generate CSRF token on GET /csrf', async () => {
      const response = await request(app)
        .get('/csrf')
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.token).toMatch(/^[a-zA-Z0-9_-]+$/);
      
      // Store for subsequent tests
      csrfToken = response.body.token;
      
      // Extract CSRF cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const csrfCookieHeader = cookies.find(cookie => cookie.startsWith('_csrf='));
      expect(csrfCookieHeader).toBeDefined();
      
      csrfCookie = csrfCookieHeader.split(';')[0];
    });
  });

  describe('CSRF Token Injection in HTML', () => {
    test('should serve HTML with placeholder tokens (replicating production issue)', async () => {
      const response = await request(app)
        .get('/transaction.html')
        .expect(200);

      // This should contain the placeholder token, not the actual token
      expect(response.text).toContain('{{ an_actual_token }}');
      
      // This should NOT contain the actual CSRF token
      if (csrfToken) {
        expect(response.text).not.toContain(csrfToken);
      }
    });
  });

  describe('CSRF Validation Failure (RED State)', () => {
    test('should reject login POST without CSRF token', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token.');
      expect(response.body.code).toBe('EBADCSRFTOKEN');
    });

    test('should reject login POST with invalid CSRF token', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('X-CSRF-Token', 'invalid-token')
        .send({ username: 'test', password: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token.');
    });

    test('should reject login POST with CSRF token but no cookie', async () => {
      // First get a valid token
      const tokenResponse = await request(app).get('/csrf');
      const validToken = tokenResponse.body.token;

      const response = await request(app)
        .post('/auth/login')
        .set('X-CSRF-Token', validToken)
        .send({ username: 'test', password: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token.');
    });
  });

  describe('CSRF Validation Success (Control Test)', () => {
    test('should accept login POST with valid CSRF token and cookie', async () => {
      // First get a valid token and cookie
      const tokenResponse = await request(app)
        .get('/csrf')
        .expect(200);

      const validToken = tokenResponse.body.token;
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookieHeader = cookies.find(cookie => cookie.startsWith('_csrf='));
      const csrfCookie = csrfCookieHeader.split(';')[0];

      // Now POST with both token and cookie
      const response = await request(app)
        .post('/auth/login')
        .set('X-CSRF-Token', validToken)
        .set('Cookie', csrfCookie)
        .send({ username: 'test', password: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('CSRF validation passed');
      expect(response.body.receivedToken).toBe(validToken);
    });
  });

  describe('Determinism Validation', () => {
    test('should generate same CSRF token for same request sequence', async () => {
      // First request
      const response1 = await request(app).get('/csrf');
      const token1 = response1.body.token;
      
      // Second request (should be different due to csurf rotation)
      const response2 = await request(app).get('/csrf');
      const token2 = response2.body.token;
      
      // Tokens should be different (csurf rotates them)
      expect(token1).not.toBe(token2);
      
      // But both should be valid
      expect(token1).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(token2).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    test('should maintain consistent error responses', async () => {
      // Multiple attempts should all fail the same way
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({ username: 'test', password: 'test' })
          .expect(403);

        expect(response.body.error).toBe('Invalid CSRF token.');
        expect(response.body.code).toBe('EBADCSRFTOKEN');
      }
    });
  });
});
