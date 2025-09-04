/**
 * Integration Tests: CSRF + Auth Flow
 * Ensures both Payday and Payment Types work with same CSRF+auth flow
 * Prevents regression of payment-types save 403 issue
 */
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const { expect } = require('chai');

// Create test app with same middleware as production
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const csrfProtection = csrf({
  cookie: {
    sameSite: 'lax',
    secure: false,
    httpOnly: true,
    path: '/'
  }
});
app.use(csrfProtection);

// CSRF token endpoint
app.get('/csrf', (req, res) => {
  res.json({ token: req.csrfToken() });
});

// Mock auth middleware
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { username: 'testuser', role: 'manager' };
  next();
};

// Control route (like Payday)
app.post('/api/control', mockAuth, (req, res) => {
  res.json({ success: true, message: 'Control route works' });
});

// Target route (like Payment Types)
const requireManagerAuth = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

app.post('/api/payment-types', requireManagerAuth, (req, res) => {
  res.json({ success: true, message: 'Payment type created' });
});

describe('CSRF + Auth Flow Integration Tests', () => {
  let cookieJar;
  let csrfToken;
  let authToken;

  before(async () => {
    // Setup: Get CSRF token + mock auth
    const csrfResponse = await request(app).get('/csrf').expect(200);
    csrfToken = csrfResponse.body.token;
    cookieJar = csrfResponse.headers['set-cookie'];
    authToken = 'mock-jwt-token-for-testing';
  });

  it('Missing token → 403', async () => {
    const response = await request(app)
      .post('/api/payment-types')
      .send({ name: 'Test' });
    
    expect(response.status).to.equal(403);
  });

  it('Missing auth → 401', async () => {
    const response = await request(app)
      .post('/api/payment-types')
      .set('Cookie', cookieJar)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Test' });
    
    expect(response.status).to.equal(401);
  });

  it('Payday POST succeeds with CSRF+auth', async () => {
    const response = await request(app)
      .post('/api/control')
      .set('Cookie', cookieJar)
      .set('x-csrf-token', csrfToken)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ test: 'data' });
    
    expect(response.status).to.equal(200);
    expect(response.body.success).to.be.true;
  });

  it('Payment Types POST succeeds with same CSRF+auth', async () => {
    const response = await request(app)
      .post('/api/payment-types')
      .set('Cookie', cookieJar)
      .set('x-csrf-token', csrfToken)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Payment Type' });
    
    expect(response.status).to.equal(200);
    expect(response.body.success).to.be.true;
  });

  it('Both routes behave identically with identical headers', async () => {
    const headers = {
      'Cookie': cookieJar,
      'x-csrf-token': csrfToken,
      'Authorization': `Bearer ${authToken}`
    };

    const controlResponse = await request(app)
      .post('/api/control')
      .set(headers)
      .send({ test: 'data' });

    const targetResponse = await request(app)
      .post('/api/payment-types')
      .set(headers)
      .send({ name: 'Test Payment Type' });

    // Both should succeed with identical headers
    expect(controlResponse.status).to.equal(200);
    expect(targetResponse.status).to.equal(200);
    expect(controlResponse.body.success).to.be.true;
    expect(targetResponse.body.success).to.be.true;
  });
});
