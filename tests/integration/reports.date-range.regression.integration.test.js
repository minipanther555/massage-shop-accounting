/* eslint-env jest */

/**
 * AC-010 — date-range reports return identical figures before and after
 * `RIT-LIVE-002` moves today's figures onto the Bangkok business day.
 *
 * Spec: reception-intake-truth-and-non-massage-income.md AC-010 (line 673).
 *
 * This test was written and run GREEN against `reports.js` as it stood BEFORE
 * `RIT-LIVE-002` changed a line, and is run again afterwards. That ordering is
 * the whole point: a regression test written after the change can only prove
 * the figures are self-consistent, never that they did not move.
 *
 * The fixture is built so a swap would be LOUD. Two seeded rows carry a
 * `business_day` deliberately different from their `date`:
 *
 *   TX-DR-1  date 2026-08-17  business_day 2026-08-16
 *   TX-DR-4  date 2026-08-20  business_day 2026-08-19
 *
 * Every expected figure below is hand-computed from the seed table against the
 * date-range contract as written — `WHERE t.date BETWEEN ? AND ?` with
 * `status IN ('ACTIVE','CORRECTED')` — not recomputed the way the route
 * computes it. If any date-range query is switched to `business_day`, TX-DR-1
 * leaves the week and the month and the assertions below fail.
 *
 * The clock is pinned to Wednesday 2026-08-19 12:00 UTC. `GET /weekly` derives
 * its Monday/Sunday from the SERVER's local calendar day; noon UTC on a
 * Wednesday is still Wednesday in every timezone from UTC-11 to UTC+11, so the
 * derived week is 2026-08-17..2026-08-23 regardless of where this runs.
 * Nothing is seeded after 2026-08-29, because `GET /monthly` derives its month
 * end with `new Date(year, month, 0)` in local time and that boundary IS
 * timezone-dependent.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const MockDate = require('mockdate');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-date-range-regression-test-'));
process.env.DB_PATH = path.join(testDirectory, 'date-range-regression-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

const FIXED_NOW = '2026-08-19T12:00:00.000Z';

// tx_id, date, business_day, masseuse, service, status, amount, fee, method
const SEED_ROWS = [
  ['TX-DR-1', '2026-08-17', '2026-08-16', 'ขวัญ', 'Thai Massage', 'ACTIVE', 1000, 300, 'Cash'],
  ['TX-DR-2', '2026-08-18', '2026-08-18', 'ขวัญ', 'Oil Massage', 'CORRECTED', 800, 250, 'Card'],
  ['TX-DR-3', '2026-08-18', '2026-08-18', 'ขวัญ', 'Oil Massage', 'EDITED (Corrected by TX-DR-2)', 800, 250, 'Card'],
  ['TX-DR-4', '2026-08-20', '2026-08-19', 'มิน', 'Thai Massage', 'ACTIVE', 600, 200, 'Cash'],
  ['TX-DR-5', '2026-08-23', '2026-08-23', 'มิน', 'Thai Massage', 'CANCELLED', 500, 150, 'Cash'],
  ['TX-DR-6', '2026-07-30', '2026-07-30', 'ขวัญ', 'Thai Massage', 'ACTIVE', 400, 100, 'Cash']
];

describe('AC-010 — date-range report figures are frozen', () => {
  beforeAll(async () => {
    MockDate.set(FIXED_NOW);
    await database.connect();

    for (const [txId, date, businessDay, masseuse, service, status, amount, fee, method] of SEED_ROWS) {
      // eslint-disable-next-line no-await-in-loop
      await database.run(
        `INSERT INTO transactions (
          transaction_id, timestamp, date, masseuse_name, service_type,
          location, duration, payment_amount, payment_method, masseuse_fee,
          start_time, end_time, customer_contact, status, business_day
        ) VALUES (?, ?, ?, ?, ?, 'In-Shop', 60, ?, ?, ?, '10:00 AM', '11:00 AM', ?, ?, ?)`,
        [txId, `${date}T04:00:00.000Z`, date, masseuse, service, amount, method, fee, txId, status, businessDay]
      );
    }

    await database.run(
      "INSERT INTO expenses (date, description, amount) VALUES ('2026-08-18', 'DR laundry', 200)"
    );
    await database.run(
      "INSERT INTO expenses (date, description, amount) VALUES ('2026-07-30', 'DR July soap', 50)"
    );
  });

  afterAll(async () => {
    MockDate.reset();
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('GET /weekly keeps its week window and its per-masseuse figures', async () => {
    const response = await request(app).get('/api/reports/weekly').set('x-pwtest', '1');
    expect(response.status).toBe(200);

    // Monday and Sunday of the week containing Wednesday 2026-08-19.
    expect(response.body.week_start).toBe('2026-08-17');
    expect(response.body.week_end).toBe('2026-08-23');

    // In window by `date`: TX-DR-1 (ACTIVE), TX-DR-2 (CORRECTED), TX-DR-4 (ACTIVE).
    // Out: TX-DR-3 (EDITED), TX-DR-5 (CANCELLED), TX-DR-6 (July).
    expect(response.body.masseuse_fees).toEqual([
      {
        masseuse_name: 'ขวัญ', weekly_massages: 2, baseFees: 550, bookingCredits: 0, weekly_fees: 550
      },
      {
        masseuse_name: 'มิน', weekly_massages: 1, baseFees: 200, bookingCredits: 0, weekly_fees: 200
      }
    ]);
  });

  test('GET /monthly keeps its totals, expenses and service breakdown', async () => {
    const response = await request(app).get('/api/reports/monthly/2026/8').set('x-pwtest', '1');
    expect(response.status).toBe(200);

    expect(response.body.month_start).toBe('2026-08-01');

    // Same three rows: 1000 + 800 + 600 revenue, 300 + 250 + 200 fees.
    expect(response.body.monthly_totals).toEqual({
      transaction_count: 3,
      total_revenue: 2400,
      base_fee_total: 750,
      booking_credit_total: 0,
      total_staff_pay: 750,
      total_fees: 750
    });

    // Only the August expense row.
    expect(response.body.monthly_expenses).toEqual({ expense_count: 1, total_expenses: 200 });

    expect(response.body.service_breakdown).toEqual([
      { service_type: 'Thai Massage', count: 2, revenue: 1600 },
      { service_type: 'Oil Massage', count: 1, revenue: 800 }
    ]);
  });

  test('GET /financial keeps its summary, breakdowns and detail rows', async () => {
    const response = await request(app)
      .get('/api/reports/financial')
      .query({ from_date: '2026-08-01', to_date: '2026-08-29' })
      .set('x-pwtest', '1');
    expect(response.status).toBe(200);

    const { summary } = response.body;
    expect(summary.total_revenue).toBe(2400);
    expect(summary.total_transactions).toBe(3);
    expect(summary.base_masseuse_fees).toBe(750);
    expect(summary.booking_credits).toBe(0);
    expect(summary.total_staff_pay).toBe(750);
    expect(summary.total_expenses).toBe(200);
    // 2400 - 750 - 200
    expect(summary.net_profit).toBe(1450);
    // 1450 / 2400 * 100, rounded to one decimal
    expect(summary.profit_margin).toBe(60.4);
    expect(summary.average_transaction).toBe(800);

    expect(response.body.staffBreakdown).toEqual([
      {
        staffName: 'ขวัญ', services: 2, baseFees: 550, bookingCredits: 0, feesEarned: 550, totalStaffPay: 550, revenue: 1800
      },
      {
        staffName: 'มิน', services: 1, baseFees: 200, bookingCredits: 0, feesEarned: 200, totalStaffPay: 200, revenue: 600
      }
    ]);

    expect(response.body.breakdowns.by_payment_method).toEqual([
      { payment_method: 'Cash', count: 2, revenue: 1600 },
      { payment_method: 'Card', count: 1, revenue: 800 }
    ]);

    expect(response.body.serviceBreakdown).toEqual([
      { serviceName: 'Thai Massage', transactions: 2, revenue: 1600 },
      { serviceName: 'Oil Massage', transactions: 1, revenue: 800 }
    ]);

    expect(response.body.detailRows.transactions.map((row) => row.transaction_id).sort())
      .toEqual(['TX-DR-1', 'TX-DR-2', 'TX-DR-4']);
    expect(response.body.detailRows.expenses.map((row) => row.description)).toEqual(['DR laundry']);
  });
});
