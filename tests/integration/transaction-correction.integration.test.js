/* eslint-env jest */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-correction-test-'));
process.env.DB_PATH = path.join(testDirectory, 'correction-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDay } = require('../../backend/utils/business-day');

describe('current-business-day transaction correction', () => {
  const businessDay = getBusinessDay(new Date());
  const today = new Date().toISOString().slice(0, 10);

  async function insertWalkIn({
    transactionId,
    masseuseName = 'ขวัญ',
    status = 'ACTIVE',
    businessDayValue = businessDay,
    bookingId = null,
    timestamp = new Date().toISOString(),
    staffFee = 300,
    paymentAmount = 1000
  }) {
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        booking_id, start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, timestamp, timestamp.slice(0, 10), masseuseName, 'Thai Massage',
        'In-Shop', 60, paymentAmount, 'Cash', staffFee,
        '10:00 AM', '11:00 AM', 'Cancellation test', status, businessDayValue,
        bookingId, '2030-01-01T10:00:00+07:00', '2030-01-01T11:00:00+07:00'
      ]
    );
    if (status === 'ACTIVE' || status === 'CORRECTED') {
      await database.run(
        'UPDATE staff SET total_fees_earned = total_fees_earned + ? WHERE name = ?',
        [staffFee, masseuseName]
      );
    }
  }

  beforeAll(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'ขวัญ', 1, 300, 0), (2, 'มิน', 1, 0, 0), (3, 'นา', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 1, 'ขวัญ', 1, NULL), (?, 2, 'มิน', 2, NULL), (?, 3, 'นา', 3, NULL)`,
      [businessDay, businessDay, businessDay]
    );
    await database.run(
      `INSERT INTO services (
        service_name, duration_minutes, location, price, masseuse_fee, active
      ) VALUES ('Thai Massage', 60, 'In-Shop', 1000, 300, 1)`
    );
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      [
        'TX-WRONG-KHWAN', new Date().toISOString(), new Date().toISOString().slice(0, 10),
        'ขวัญ', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300,
        '10:00 AM', '11:00 AM', 'Correction test', businessDay,
        '2030-01-01T10:00:00+07:00', '2030-01-01T11:00:00+07:00'
      ]
    );
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('lists at most ten current-business-day correction candidates and returns the newest as latest', async () => {
    const candidates = await request(app)
      .get('/api/transactions/correction-candidates?limit=10')
      .set('x-pwtest', '1');

    expect(candidates.status).toBe(200);
    expect(candidates.body).toHaveLength(1);
    expect(candidates.body[0].transaction_id).toBe('TX-WRONG-KHWAN');

    const latest = await request(app)
      .get('/api/transactions/latest-for-correction')
      .set('x-pwtest', '1');

    expect(latest.status).toBe(200);
    expect(latest.body.transaction_id).toBe('TX-WRONG-KHWAN');
  });

  test('manual normal-walk-in correction preserves audit history without creating booking credit', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        corrected_transaction_id: 'TX-WRONG-KHWAN',
        requested_staff_booking: true,
        masseuse_name: 'มิน',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '10:00 AM',
        end_time: '11:00 AM',
        customer_contact: 'Correction test',
        start_datetime: '2030-01-01T10:00:00+07:00',
        end_datetime: '2030-01-01T11:00:00+07:00'
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('CORRECTED');
    expect(await database.get(
      "SELECT status FROM transactions WHERE transaction_id = 'TX-WRONG-KHWAN'"
    )).toEqual({ status: `EDITED (Corrected by ${response.body.transaction_id})` });
    expect(await database.get("SELECT total_fees_earned FROM staff WHERE name = 'ขวัญ'"))
      .toEqual({ total_fees_earned: 0 });
    expect(await database.get("SELECT total_fees_earned FROM staff WHERE name = 'มิน'"))
      .toEqual({ total_fees_earned: 300 });
    expect(await database.get('SELECT COUNT(*) AS count FROM bookings')).toEqual({ count: 0 });
    expect(await database.get('SELECT COUNT(*) AS count FROM booking_credits')).toEqual({ count: 0 });
  });

  test('uses the post-reversal next eligible staff member and rejects a busy manual replacement', async () => {
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      [
        'TX-WRONG-KHWAN-2', new Date().toISOString(), new Date().toISOString().slice(0, 10),
        'ขวัญ', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300,
        '10:00 AM', '11:00 AM', 'Second correction test', businessDay,
        '2030-01-01T10:00:00+07:00', '2030-01-01T11:00:00+07:00'
      ]
    );
    await database.run("UPDATE staff SET total_fees_earned = total_fees_earned + 300 WHERE name = 'ขวัญ'");
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      [
        'TX-BUSY-MIN', new Date().toISOString(), new Date().toISOString().slice(0, 10),
        'มิน', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300,
        '10:00 AM', '11:00 AM', 'Busy replacement', businessDay,
        new Date(Date.now() - 10 * 60 * 1000).toISOString(), new Date(Date.now() + 50 * 60 * 1000).toISOString()
      ]
    );

    const rejected = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        corrected_transaction_id: 'TX-WRONG-KHWAN-2',
        masseuse_name: 'มิน',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '10:00 AM',
        end_time: '11:00 AM'
      });

    expect(rejected.status).toBe(409);
    expect(rejected.body.error).toMatch(/available/i);
    expect(await database.get("SELECT status FROM transactions WHERE transaction_id = 'TX-WRONG-KHWAN-2'"))
      .toEqual({ status: 'ACTIVE' });
  });

  test('cancels a current-business-day normal walk-in without deleting it or leaving active effects', async () => {
    const reportBefore = await request(app)
      .get(`/api/reports/daily/${today}`)
      .set('x-pwtest', '1');
    const beforeSummary = reportBefore.body.transaction_summary;

    await insertWalkIn({ transactionId: 'TX-CANCEL-WALKIN', masseuseName: 'นา' });
    await database.run(
      `INSERT INTO booking_credits (booking_id, transaction_id, masseuse_name, amount, status)
       VALUES ('BKG-CANCEL-LEGACY-CREDIT', 'TX-CANCEL-WALKIN', 'นา', 50, 'ACTIVE')`
    );
    await database.run("UPDATE staff SET total_fees_earned = total_fees_earned + 50 WHERE name = 'นา'");

    const response = await request(app)
      .post('/api/transactions/TX-CANCEL-WALKIN/cancel')
      .set('x-pwtest', '1')
      .send({ reason: 'customer_left_before_service' });

    expect(response.status).toBe(200);
    expect(response.body.transaction_id).toBe('TX-CANCEL-WALKIN');
    expect(response.body.status).toMatch(/^CANCELLED/);
    expect(await database.get(
      "SELECT status FROM transactions WHERE transaction_id = 'TX-CANCEL-WALKIN'"
    )).toEqual({ status: expect.stringMatching(/^CANCELLED/) });
    expect(await database.get(
      "SELECT COUNT(*) AS count FROM transactions WHERE transaction_id = 'TX-CANCEL-WALKIN'"
    )).toEqual({ count: 1 });
    expect(await database.get("SELECT total_fees_earned FROM staff WHERE name = 'นา'"))
      .toEqual({ total_fees_earned: 0 });
    expect(await database.get(
      "SELECT status FROM booking_credits WHERE transaction_id = 'TX-CANCEL-WALKIN'"
    )).toEqual({ status: 'REVERSED' });

    const candidates = await request(app)
      .get('/api/transactions/correction-candidates?limit=10')
      .set('x-pwtest', '1');
    expect(candidates.body.map(transaction => transaction.transaction_id))
      .not.toContain('TX-CANCEL-WALKIN');

    const currentStatus = await request(app)
      .get('/api/staff/current-status')
      .set('x-pwtest', '1');
    const na = currentStatus.body.staff.find(staff => staff.masseuse_name === 'นา');
    expect(na.today_massages).toBe(0);
    expect(na.current_state).not.toBe('busy');

    const report = await request(app)
      .get(`/api/reports/daily/${today}`)
      .set('x-pwtest', '1');
    expect(report.body.transaction_summary.transaction_count).toBe(beforeSummary.transaction_count);
    expect(report.body.transaction_summary.total_revenue).toBe(beforeSummary.total_revenue);
    expect(report.body.transaction_summary.total_staff_pay).toBe(beforeSummary.total_staff_pay);
  });

  test('rejects ineligible cancellation targets without partial mutation', async () => {
    await insertWalkIn({
      transactionId: 'TX-CANCEL-HISTORICAL',
      businessDayValue: '2020-01-01',
      timestamp: '2020-01-01T03:00:00.000Z'
    });
    await insertWalkIn({ transactionId: 'TX-CANCEL-EDITED', status: 'EDITED (Corrected by TX-OTHER)' });
    await insertWalkIn({ transactionId: 'TX-CANCEL-ALREADY', status: 'CANCELLED (Customer left)' });
    await database.run(
      `INSERT INTO bookings (
        booking_id, scheduled_start, scheduled_end, service_type, location,
        duration, requested_masseuse_name, customer_contact, status, transaction_id
      ) VALUES ('BKG-CANCEL-BOOKING', '2030-01-01T10:00:00+07:00', '2030-01-01T11:00:00+07:00',
        'Thai Massage', 'In-Shop', 60, 'ขวัญ', 'Booking cancellation test', 'COMPLETED', 'TX-CANCEL-BOOKING')`
    );
    await insertWalkIn({ transactionId: 'TX-CANCEL-BOOKING', bookingId: 'BKG-CANCEL-BOOKING' });

    const cases = [
      ['TX-CANCEL-HISTORICAL', 409],
      ['TX-CANCEL-EDITED', 409],
      ['TX-CANCEL-ALREADY', 409],
      ['TX-CANCEL-BOOKING', 409],
      ['TX-CANCEL-MISSING', 404]
    ];

    for (const [transactionId, expectedStatus] of cases) {
      const response = await request(app)
        .post(`/api/transactions/${transactionId}/cancel`)
        .set('x-pwtest', '1')
        .send({ reason: 'customer_left_before_service' });
      expect(response.status).toBe(expectedStatus);
    }

    expect(await database.get("SELECT status FROM transactions WHERE transaction_id = 'TX-CANCEL-HISTORICAL'"))
      .toEqual({ status: 'ACTIVE' });
    expect(await database.get("SELECT status FROM transactions WHERE transaction_id = 'TX-CANCEL-EDITED'"))
      .toEqual({ status: 'EDITED (Corrected by TX-OTHER)' });
    expect(await database.get("SELECT status FROM transactions WHERE transaction_id = 'TX-CANCEL-ALREADY'"))
      .toEqual({ status: 'CANCELLED (Customer left)' });
    expect(await database.get("SELECT status FROM transactions WHERE transaction_id = 'TX-CANCEL-BOOKING'"))
      .toEqual({ status: 'ACTIVE' });
  });
});
