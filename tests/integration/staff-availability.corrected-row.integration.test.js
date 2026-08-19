/* eslint-env jest */

/**
 * RIT-LIVE-001 — availability and workload recognise a corrected row.
 *
 * Spec: reception-intake-truth-and-non-massage-income.md FR-001 / AC-002 / SC-1.
 *
 * A masseuse whose live massage arrived by CORRECTION must read `busy`, carry a
 * workload of exactly one, and must not be offered as next for a walk-in. The
 * edit chain is built by driving the REAL correction route twice, so the status
 * literals under test (`EDITED (Corrected by …)` on each superseded original,
 * `CORRECTED` on the surviving replacement) are the ones production writes,
 * not literals this test invented.
 *
 * The available-masseuse and walk-in-priority assertions sit in the SAME test
 * on purpose: asserting only "she is busy" would pass an implementation that
 * marks everybody busy.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-corrected-availability-test-'));
process.env.DB_PATH = path.join(testDirectory, 'corrected-availability-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDay } = require('../../backend/utils/business-day');

describe('RIT-LIVE-001 — a corrected row is live work for availability and workload', () => {
  const businessDay = getBusinessDay(new Date());
  const nowMs = Date.now();
  // A window that already started and is still open, so the replacement is
  // genuinely mid-massage at the moment current-status is read.
  const startDateTime = new Date(nowMs - 5 * 60000).toISOString();
  const endDateTime = new Date(nowMs + 8 * 3600000).toISOString();

  beforeAll(async () => {
    await database.connect();
    await database.run(
      'INSERT INTO business_days (business_day, status) VALUES (?, \'open\')',
      [businessDay]
    );
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'ขวัญ', 1, 0, 0), (2, 'มิน', 1, 0, 0), (3, 'นา', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 1, 'ขวัญ', 1, NULL), (?, 2, 'มิน', 2, NULL), (?, 3, 'นา', 3, NULL)`,
      [businessDay, businessDay, businessDay]
    );
    await database.run(
      `INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee, active)
       VALUES ('Thai Massage', 60, 'In-Shop', 1000, 300, 1)`
    );
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        start_datetime, end_datetime
      ) VALUES (?, ?, ?, 'ขวัญ', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300,
                '10:00 AM', '11:00 AM', 'RIT-LIVE-001 original', 'ACTIVE', ?, ?, ?)`,
      [
        'TX-RIT-LIVE-001-ORIGINAL', new Date(nowMs).toISOString(),
        new Date(nowMs).toISOString().slice(0, 10), businessDay,
        startDateTime, endDateTime
      ]
    );
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  async function correct(originalTransactionId) {
    const response = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        corrected_transaction_id: originalTransactionId,
        masseuse_name: 'ขวัญ',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '10:00 AM',
        end_time: '11:00 AM',
        customer_contact: 'RIT-LIVE-001 correction',
        start_datetime: startDateTime,
        end_datetime: endDateTime
      });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('CORRECTED');
    return response.body.transaction_id;
  }

  test('after two edits she is busy, counted once, and off the front of the queue', async () => {
    const firstReplacement = await correct('TX-RIT-LIVE-001-ORIGINAL');
    const secondReplacement = await correct(firstReplacement);

    // The chain the real route wrote: original EDITED, first replacement EDITED,
    // second replacement CORRECTED — exactly one live row.
    const chain = await database.all(
      `SELECT transaction_id, status FROM transactions
       WHERE business_day = ? AND masseuse_name = 'ขวัญ'
       ORDER BY id ASC`,
      [businessDay]
    );
    expect(chain.map((row) => row.status)).toEqual([
      `EDITED (Corrected by ${firstReplacement})`,
      `EDITED (Corrected by ${secondReplacement})`,
      'CORRECTED'
    ]);

    const response = await request(app)
      .get('/api/staff/current-status')
      .set('x-pwtest', '1');
    expect(response.status).toBe(200);

    const byName = new Map(response.body.staff.map((row) => [row.masseuse_name, row]));

    // 1. The corrected masseuse is mid-massage and counted exactly once.
    expect(byName.get('ขวัญ').current_state).toBe('busy');
    expect(byName.get('ขวัญ').today_massages).toBe(1);

    // 2. A masseuse with no transaction at all is still available — this is what
    //    stops an implementation that simply marks everyone busy from passing.
    expect(byName.get('นา').current_state).toBe('available');
    expect(byName.get('นา').today_massages).toBe(0);

    // 3. The next walk-in goes to somebody else.
    expect(byName.get('ขวัญ').walk_in_priority).toBe(false);
    const priorityRow = response.body.staff.find((row) => row.walk_in_priority);
    expect(priorityRow).toBeDefined();
    expect(priorityRow.masseuse_name).toBe('มิน');
  });
});
