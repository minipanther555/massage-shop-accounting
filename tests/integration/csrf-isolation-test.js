const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const path = require('path');
const MockDate = require('mockdate');

// Test configuration
const TEST_PORT = 3002;
const TEST_TIMESTAMP = '2024-12-19T20:00:00.000Z';

describe('CSRF Isolation Tests - Binary Search Assertions', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Freeze time for deterministic tests
    MockDate.set(TEST_TIMESTAMP);
  });

  afterAll(async () => {
    MockDate.reset();
    if (server) {
      server.close();
    }
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Assertion 1: Middleware Order Flip', () => {
    test('should fail with csurf BEFORE cookieParser (incorrect order)', async () => {
      app = express();
      
      // INCORRECT ORDER: csurf before cookieParser
      app.use(csrf({ cookie: true }));
      app.use(cookieParser());
      app.use(express.json());
      
      // CSRF Token Injection
      app.use((req, res, next) => {
        if (req.csrfToken) {
          res.locals.csrfToken = req.csrfToken();
        }
        next();
      });

      // Test routes
      app.get('/csrf', (req, res) => {
        res.json({ token: req.csrfToken() });
      });

      app.post('/auth/login', (req, res) => {
        res.json({ success: true });
      });

      // CSRF Error Handler
      app.use((err, req, res, next) => {
        if (err.code !== 'EBADCSRFTOKEN') {
          return next(err);
        }
        res.status(403).json({ error: 'Invalid CSRF token.' });
      });

      server = app.listen(TEST_PORT);

      // This should fail because csurf runs before cookieParser
      const response = await request(app)
        .get('/csrf')
        .expect(500); // Should get an error, not 200

      expect(response.status).not.toBe(200);
    });

    test('should work with cookieParser BEFORE csurf (correct order)', async () => {
      app = express();
      
      // CORRECT ORDER: cookieParser before csurf
      app.use(cookieParser());
      app.use(csrf({ cookie: true }));
      app.use(express.json());
      
      // CSRF Token Injection
      app.use((req, res, next) => {
        if (req.csrfToken) {
          res.locals.csrfToken = req.csrfToken();
        }
        next();
      });

      // Test routes
      app.get('/csrf', (req, res) => {
        res.json({ token: req.csrfToken() });
      });

      app.post('/auth/login', (req, res) => {
        res.json({ success: true });
      });

      // CSRF Error Handler
      app.use((err, req, res, next) => {
        if (err.code !== 'EBADCSRFTOKEN') {
          return next(err);
        }
        res.status(403).json({ error: 'Invalid CSRF token.' });
      });

      server = app.listen(TEST_PORT);

      // This should work with correct middleware order
      const response = await request(app)
        .get('/csrf')
        .expect(200);

      expect(response.body.token).toBeDefined();
    });
  });

  describe('Assertion 2: Cookie Attributes Normalization', () => {
    test('should work with SameSite:Lax and Secure:false (dev-friendly)', async () => {
      app = express();
      
      app.use(cookieParser());
      
      // Normalized cookie attributes for development
      const csrfProtection = csrf({ 
        cookie: { 
          sameSite: 'Lax', 
          secure: false,
          httpOnly: false
        } 
      });
      
      app.use(csrfProtection);
      app.use(express.json());
      
      // CSRF Token Injection
      app.use((req, res, next) => {
        if (req.csrfToken) {
          res.locals.csrfToken = req.csrfToken();
        }
        next();
      });

      // Test routes
      app.get('/csrf', (req, res) => {
        res.json({ token: req.csrfToken() });
      });

      app.post('/auth/login', (req, res) => {
        res.json({ success: true });
      });

      // CSRF Error Handler
      app.use((err, req, res, next) => {
        if (err.code !== 'EBADCSRFTOKEN') {
          return next(err);
        }
        res.status(403).json({ error: 'Invalid CSRF token.' });
      });

      server = app.listen(TEST_PORT);

      // Get token
      const tokenResponse = await request(app)
        .get('/csrf')
        .expect(200);

      const token = tokenResponse.body.token;
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = cookies.find(cookie => cookie.startsWith('_csrf=')).split(';')[0];

      // Test login with normalized cookie attributes
      const loginResponse = await request(app)
        .post('/auth/login')
        .set('X-CSRF-Token', token)
        .set('Cookie', csrfCookie)
        .send({ username: 'test', password: 'test' })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });
  });

  describe('Assertion 3: Header Name Alignment', () => {
    test('should work with X-CSRF-Token header (standard)', async () => {
      app = express();
      
      app.use(cookieParser());
      app.use(csrf({ cookie: true }));
      app.use(express.json());
      
      // CSRF Token Injection
      app.use((req, res, next) => {
        if (req.csrfToken) {
          res.locals.csrfToken = req.csrfToken();
        }
        next();
      });

      // Test routes
      app.get('/csrf', (req, res) => {
        res.json({ token: req.csrfToken() });
      });

      app.post('/auth/login', (req, res) => {
        res.json({ 
          success: true,
          receivedHeader: req.headers['x-csrf-token'] || 'none'
        });
      });

      // CSRF Error Handler
      app.use((err, req, res, next) => {
        if (err.code !== 'EBADCSRFTOKEN') {
          return next(err);
        }
        res.status(403).json({ error: 'Invalid CSRF token.' });
      });

      server = app.listen(TEST_PORT);

      // Get token
      const tokenResponse = await request(app)
        .get('/csrf')
        .expect(200);

      const token = tokenResponse.body.token;
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = cookies.find(cookie => cookie.startsWith('_csrf=')).split(';')[0];

      // Test with X-CSRF-Token header
      const loginResponse = await request(app)
        .post('/auth/login')
        .set('X-CSRF-Token', token)
        .set('Cookie', csrfCookie)
        .send({ username: 'test', password: 'test' })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.receivedHeader).toBe(token);
    });

    test('should fail with X-XSRF-TOKEN header (mismatch)', async () => {
      app = express();
      
      app.use(cookieParser());
      app.use(csrf({ cookie: true }));
      app.use(express.json());
      
      // CSRF Token Injection
      app.use((req, res, next) => {
        if (req.csrfToken) {
          res.locals.csrfToken = req.csrfToken();
        }
        next();
      });

      // Test routes
      app.get('/csrf', (req, res) => {
        res.json({ token: req.csrfToken() });
      });

      app.post('/auth/login', (req, res) => {
        res.json({ success: true });
      });

      // CSRF Error Handler
      app.use((err, req, res, next) => {
        if (err.code !== 'EBADCSRFTOKEN') {
          return next(err);
        }
        res.status(403).json({ error: 'Invalid CSRF token.' });
      });

      server = app.listen(TEST_PORT);

      // Get token
      const tokenResponse = await request(app)
        .get('/csrf')
        .expect(200);

      const token = tokenResponse.body.token;
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = cookies.find(cookie => cookie.startsWith('_csrf=')).split(';')[0];

      // Test with X-XSRF-TOKEN header (should fail)
      const loginResponse = await request(app)
        .post('/auth/login')
        .set('X-XSRF-TOKEN', token) // Wrong header name
        .set('Cookie', csrfCookie)
        .send({ username: 'test', password: 'test' })
        .expect(403);

      expect(loginResponse.body.error).toBe('Invalid CSRF token.');
    });
  });

  describe('Assertion 4: Concurrency Probe', () => {
    test('should maintain consistent failure patterns under load', async () => {
      app = express();
      
      app.use(cookieParser());
      app.use(csrf({ cookie: true }));
      app.use(express.json());
      
      // CSRF Token Injection
      app.use((req, res, next) => {
        if (req.csrfToken) {
          res.locals.csrfToken = req.csrfToken();
        }
        next();
      });

      // Test routes
      app.get('/csrf', (req, res) => {
        res.json({ token: req.csrfToken() });
      });

      app.post('/auth/login', (req, res) => {
        res.json({ success: true });
      });

      // CSRF Error Handler
      app.use((err, req, res, next) => {
        if (err.code !== 'EBADCSRFTOKEN') {
          return next(err);
        }
        res.status(403).json({ error: 'Invalid CSRF token.' });
      });

      server = app.listen(TEST_PORT);

      // Multiple concurrent attempts should all fail the same way
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/auth/login')
            .send({ username: 'test', password: 'test' })
            .then(response => ({ status: response.status, error: response.body.error }))
        );
      }

      const results = await Promise.all(promises);
      
      // All should fail with 403
      results.forEach(result => {
        expect(result.status).toBe(403);
        expect(result.error).toBe('Invalid CSRF token.');
      });
    });
  });
});
