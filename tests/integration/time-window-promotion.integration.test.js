/* eslint-env jest */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-time-promotion-test-'));
process.env.DB_PATH = path.join(testDirectory, 'time-promotion-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

describe('time-window promotion transaction boundary', () => {
  beforeAll(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO staff (name, active, total_fees_earned, total_fees_paid)
       VALUES ('May เมย์', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO services (
        service_name, duration_minutes, location, price, masseuse_fee, active
       ) VALUES ('Thai Massage', 60, 'In-Shop', 450, 130, 1)`
    );
    await database.run(
      `INSERT INTO services (
        service_name, duration_minutes, location, price, masseuse_fee, active
       ) VALUES ('Thai Massage', 60, 'Home Service', 650, 260, 1)`
    );
    await database.run(
      `INSERT INTO time_window_promotion_settings (
        id, enabled, start_minute, end_minute, manual_override_grace_minutes
       ) VALUES (1, 1, 600, 1080, 15)`
    );
    await database.run(
      `INSERT INTO time_window_promotion_prices (
        service_name, duration_minutes, location, promotional_price
       ) VALUES ('Thai Massage', 60, 'In-Shop', 399)`
    );
  });

  afterAll(async () => {
    jest.useRealTimers();
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('stores the automatic discounted payment and unchanged staff commission', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-21T10:59:00.000Z'));

    const quote = await request(app)
      .post('/api/transactions/quote')
      .set('x-pwtest', '1')
      .send({ service_type: 'Thai Massage', location: 'In-Shop', duration: 60 });
    expect(quote.status).toBe(200);
    expect(quote.body).toMatchObject({
      basePrice: 450,
      finalPrice: 399,
      discountAmount: 51,
      promotionType: 'TIME_WINDOW',
      automatic: true,
      masseuseFee: 130
    });

    const response = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        masseuse_name: 'May เมย์',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '5:00 PM',
        end_time: '6:00 PM'
      });
    expect(response.status).toBe(201);

    const transaction = await database.get(
      `SELECT payment_amount, masseuse_fee, base_price, discount_amount,
              promotion_type, promotion_label
       FROM transactions WHERE transaction_id = ?`,
      [response.body.transaction_id]
    );
    const staff = await database.get(
      "SELECT total_fees_earned FROM staff WHERE name = 'May เมย์'"
    );
    expect(transaction).toMatchObject({
      payment_amount: 399,
      masseuse_fee: 130,
      base_price: 450,
      discount_amount: 51,
      promotion_type: 'TIME_WINDOW'
    });
    expect(transaction.promotion_label).toContain('Time-window promotion');
    expect(staff.total_fees_earned).toBe(130);
  });

  test('permits receptionist override only through 18:14 Bangkok time', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-21T11:14:00.000Z'));

    const eligible = await request(app)
      .post('/api/transactions/quote')
      .set('x-pwtest', '1')
      .send({ service_type: 'Thai Massage', location: 'In-Shop', duration: 60 });
    const overridden = await request(app)
      .post('/api/transactions/quote')
      .set('x-pwtest', '1')
      .send({
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        time_window_promotion_override: true
      });
    expect(eligible.body).toMatchObject({
      finalPrice: 450,
      manualOverrideEligible: true,
      manualOverrideApplied: false
    });
    expect(overridden.body).toMatchObject({
      finalPrice: 399,
      manualOverrideApplied: true
    });

    jest.setSystemTime(new Date('2026-07-21T11:15:00.000Z'));
    const expired = await request(app)
      .post('/api/transactions/quote')
      .set('x-pwtest', '1')
      .send({
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        time_window_promotion_override: true
      });
    expect(expired.body).toMatchObject({
      finalPrice: 450,
      manualOverrideEligible: false,
      manualOverrideApplied: false
    });
  });

  test('does not apply an in-shop promotion price to Home Service', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-21T10:00:00.000Z'));

    const quote = await request(app)
      .post('/api/transactions/quote')
      .set('x-pwtest', '1')
      .send({ service_type: 'Thai Massage', location: 'Home Service', duration: 60 });

    expect(quote.status).toBe(200);
    expect(quote.body).toMatchObject({
      basePrice: 650,
      finalPrice: 650,
      discountAmount: 0,
      promotionType: null,
      masseuseFee: 260
    });
  });
});
