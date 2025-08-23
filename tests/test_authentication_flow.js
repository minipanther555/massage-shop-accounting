const { expect } = require('chai');
const supertest = require('supertest');
const path = require('path');

// This test suite requires a running server instance.
// We will assume the server is started separately before running the tests.
// For a more robust solution, you would programmatically start and stop the server.
const request = supertest('http://localhost:3000');

describe('Authentication and Session Management Flow', () => {
  let agent; // To persist cookies across requests

  before(() => {
    agent = supertest.agent('http://localhost:3000');
  });

  // Test Case 1: Unauthenticated access from a browser should redirect to login
  describe('GET /api/main/transaction (Unauthenticated Browser)', () => {
    it('should redirect to /login.html with a 302 status', (done) => {
      request
        .get('/api/main/transaction')
        .set('Accept', 'text/html') // Simulate a browser request
        .expect(302)
        .end((err, res) => {
          if (err) return done(err);
          // The 'location' header should point to the correct login page
          expect(res.headers.location).to.equal('/login.html');
          done();
        });
    });
  });

  // Test Case 2: Unauthenticated access from an API client should return 401
  describe('GET /api/main/transaction (Unauthenticated API)', () => {
    it('should return a 401 Unauthorized with a JSON error', (done) => {
      request
        .get('/api/main/transaction')
        .set('Accept', 'application/json') // Simulate an API client request
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('object');
          expect(res.body.error).to.equal('Authentication required');
          done();
        });
    });
  });

  // Test Case 3: Successful login should set a session cookie with a 90-day expiry
  describe('POST /api/auth/login', () => {
    it('should return 200, user data, and set a long-lived session cookie', (done) => {
      agent
        .post('/api/auth/login')
        .send({ username: 'reception', password: 'reception123' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);

          // 1. Verify the response body
          expect(res.body.success).to.be.true;
          expect(res.body.user).to.be.an('object');
          expect(res.body.user.username).to.equal('reception');

          // 2. Verify the session cookie
          const sessionCookie = res.headers['set-cookie'][0];
          expect(sessionCookie).to.exist;
          expect(sessionCookie).to.include('sessionId=');
          expect(sessionCookie).to.include('HttpOnly');
          expect(sessionCookie).to.include('SameSite=Strict');

          // 3. Verify the Max-Age for 90 days
          const maxAgeMatch = sessionCookie.match(/Max-Age=(\d+)/);
          expect(maxAgeMatch).to.not.be.null;
          const maxAge = parseInt(maxAgeMatch[1], 10);
          const expectedMaxAge = 90 * 24 * 60 * 60;
          // Allow for a small difference in calculation
          expect(maxAge).to.be.closeTo(expectedMaxAge, 2);

          done();
        });
    });
  });

  // Test Case 4: Authenticated access to a protected page should succeed
  describe('GET /api/main/transaction (Authenticated)', () => {
    it('should return 200 OK and the page content', (done) => {
      // The 'agent' from the previous test now has the session cookie
      agent
        .get('/api/main/transaction')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          // Check for some content from the transaction.html page
          expect(res.text).to.include('<title>Massage Shop POS - Transaction</title>');
          done();
        });
    });
  });

  // Test Case 5: Logout should clear the session cookie
  describe('POST /api/auth/logout', () => {
    it('should return 200 and clear the session cookie', (done) => {
      agent
        .post('/api/auth/logout')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);

          // 1. Verify the response body
          expect(res.body.success).to.be.true;

          // 2. Verify the cookie is cleared
          const sessionCookie = res.headers['set-cookie'][0];
          expect(sessionCookie).to.include('sessionId=;');
          // A cleared cookie has an expiry date in the past
          expect(sessionCookie).to.include('Expires=Thu, 01 Jan 1970');

          done();
        });
    });
  });

  // Test Case 6: Access after logout should be denied
  describe('GET /api/main/transaction (After Logout)', () => {
    it('should return 401 Unauthorized', (done) => {
      // The agent's cookie should now be invalid
      agent
        .get('/api/main/transaction')
        .set('Accept', 'application/json')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.error).to.equal('Authentication required');
          done();
        });
    });
  });
});
