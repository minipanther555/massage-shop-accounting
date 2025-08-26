const request = require('supertest');
const { expect } = require('chai');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { app, closeServer, startServer } = require('../../backend/server');

// The path to the database we just copied from production
const dbPath = path.resolve(__dirname, '../../docker/data/massage_shop.db');

describe('Transaction Creation API Endpoint', () => {
  before((done) => {
    // We need to make sure the server is running before tests
    startServer().then(() => {
      done();
    }).catch(done);
  });

  after((done) => {
    // And that it's closed after we're done
    closeServer().then(() => {
      done();
    }).catch(done);
  });

  it('should create a transaction successfully when provided with a valid payload', (done) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) { return done(err); }
    });

    db.serialize(() => {
      let staff, service, paymentMethod;

      db.get("SELECT name FROM staff WHERE status = 'active' LIMIT 1", [], (err, row) => {
        if (err) { return done(err); }
        staff = row;
      });

      db.get("SELECT service_name, duration, price FROM services LIMIT 1", [], (err, row) => {
        if (err) { return done(err); }
        service = row;
      });

      db.get("SELECT name FROM payment_methods LIMIT 1", [], (err, row) => {
        if (err) { return done(err); }
        paymentMethod = row;
      });

      db.close((err) => {
        if (err) { return done(err); }
        
        const transactionData = {
          masseuse: staff.name,
          service: service.service_name,
          duration: service.duration,
          paymentMethod: paymentMethod.name,
          location: 'In-Shop',
          customerName: 'Integration Test',
          notes: 'Test transaction from integration test suite.'
        };
        
        request(app)
          .post('/api/transactions')
          .send(transactionData)
          .end((err, res) => {
            if (err) { return done(err); }
            
            expect(res.status).to.equal(201);
            expect(res.body).to.be.an('object');
            expect(res.body.message).to.equal('Transaction created successfully');
            done();
          });
      });
    });
  });
});
