const { requestWithCsrf } = require('../helpers/requestWithCsrf');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// The path to the database we just copied from production
const dbPath = path.resolve(__dirname, '../../docker/data/massage_shop.db');

describe('Transaction Creation API Endpoint', () => {
  it('should create a transaction successfully when provided with a valid payload', (done) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) { return done(err); }
    });

    db.serialize(() => {
      let staff, service, paymentMethod;

      db.get("SELECT name FROM staff WHERE active = 1 LIMIT 1", [], (err, row) => {
        if (err) { return done(err); }
        staff = row;
      });

      db.get("SELECT service_name, duration_minutes, location FROM services LIMIT 1", [], (err, row) => {
        if (err) { return done(err); }
        service = row;
      });

      db.get("SELECT method_name FROM payment_methods LIMIT 1", [], (err, row) => {
        if (err) { return done(err); }
        paymentMethod = row;
      });

      db.close((err) => {
        if (err) { return done(err); }
        
        const transactionData = {
          masseuse_name: staff.name,
          service_type: service.service_name,
          duration: service.duration_minutes,
          payment_method: paymentMethod.method_name,
          location: service.location,
          start_time: '10:00',
          end_time: '11:00',
          customer_contact: 'Integration Test'
        };
        
        // Use requestWithCsrf helper to handle CSRF token automatically
        requestWithCsrf({
          url: '/api/transactions',
          method: 'POST',
          body: transactionData
        }).then(async response => {
          expect(response.status).toBe(201);
          const body = await response.json();
          expect(body).toBeInstanceOf(Object);
          expect(body.transaction_id).toBeDefined();
          done();
        }).catch(error => {
          done(error);
        });
      });
    });
  });
});
