const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const path = require('path');
const MockDate = require('mockdate');

// Test configuration
const TEST_PORT = 3003;
const TEST_TIMESTAMP = '2024-12-19T20:00:00.000Z';

describe('CSRF Fix Verification - Template Engine Working', () => {
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

  test('should serve HTML with actual CSRF tokens (not placeholders)', async () => {
    app = express();
    
    // Configure EJS template engine (replicating our fix)
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../web-app'));
    
    app.use(cookieParser());
    app.use(csrf({ cookie: true }));
    app.use(express.json());
    
    // CSRF Token Injection (replicating our fix)
    app.use((req, res, next) => {
      if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
      }
      next();
    });

    // Template route (replicating our fix)
    app.get('/transaction', (req, res) => {
      res.render('transaction', { csrfToken: res.locals.csrfToken });
    });

    // CSRF Error Handler
    app.use((err, req, res, next) => {
      if (err.code !== 'EBADCSRFTOKEN') {
        return next(err);
      }
      res.status(403).json({ error: 'Invalid CSRF token.' });
    });

    server = app.listen(TEST_PORT);

    // Get a CSRF token first
    const tokenResponse = await request(app)
      .get('/transaction')
      .expect(200);

    const html = tokenResponse.text;
    
    // This should contain the actual CSRF token, not the placeholder
    expect(html).not.toContain('{{ an_actual_token }}');
    
    // Extract the actual CSRF token from the response
    const csrfTokenMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
    expect(csrfTokenMatch).toBeDefined();
    
    const actualToken = csrfTokenMatch[1];
    expect(actualToken).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(actualToken).not.toBe('{{ an_actual_token }}');
    
    console.log('✅ HTML contains actual CSRF token:', actualToken);
  });

  test('should allow login with CSRF token from rendered HTML', async () => {
    app = express();
    
    // Configure EJS template engine (replicating our fix)
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../web-app'));
    
    app.use(cookieParser());
    app.use(csrf({ cookie: true }));
    app.use(express.json());
    
    // CSRF Token Injection (replicating our fix)
    app.use((req, res, next) => {
      if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
      }
      next();
    });

    // Template route (replicating our fix)
    app.get('/transaction', (req, res) => {
      res.render('transaction', { csrfToken: res.locals.csrfToken });
    });

    // Login endpoint (protected by CSRF)
    app.post('/auth/login', (req, res) => {
      res.json({ 
        success: true, 
        message: 'CSRF validation passed',
        receivedToken: req.headers['x-csrf-token'] || 'none'
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

    // First get the transaction page to get CSRF token
    const pageResponse = await request(app)
      .get('/transaction')
      .expect(200);

    const html = pageResponse.text;
    const csrfTokenMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
    const actualToken = csrfTokenMatch[1];

    // Get the CSRF cookie
    const cookies = pageResponse.headers['set-cookie'];
    const csrfCookie = cookies.find(cookie => cookie.startsWith('_csrf=')).split(';')[0];

    // Now try to login with the token from the rendered HTML
    const loginResponse = await request(app)
      .post('/auth/login')
      .set('X-CSRF-Token', actualToken)
      .set('Cookie', csrfCookie)
      .send({ username: 'test', password: 'test' })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.message).toBe('CSRF validation passed');
    expect(loginResponse.body.receivedToken).toBe(actualToken);
    
    console.log('✅ Login successful with CSRF token from rendered HTML');
  });
});
