/* eslint-env jest */

/**
 * PTE-API-001 — creating a paid add-on linked to an original sale.
 *
 * Covers AC-PTE-002, 003, 004, 007, 010, 013, 019, 025.
 *
 * The load-bearing case is `a promotional parent`: pricing must subtract what the
 * customer ACTUALLY paid, not the catalog price of the shorter duration. Those two
 * numbers only diverge when the original sale carried a promotion, which is exactly
 * when getting it wrong overcharges a real customer.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-pte-api-test-'));
process.env.DB_PATH = path.join(testDirectory, 'pte-api-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDayParts } = require('../../backend/utils/business-day');

const ADD_ONS_URL = '/api/transactions/add-ons';

let businessDay;
let parentSeq = 0;

/** Insert an original paid sale directly, so tests control exactly what was paid. */
async function seedParent({
  masseuse = 'May เมย์',
  serviceType = 'Thai Massage',
  duration = 60,
  paid = 500,
  fee = 200,
  status = 'ACTIVE',
  parentTransactionId = null,
  addOnKind = null,
} = {}) {
  parentSeq += 1;
  const id = `PARENT-${parentSeq}`;
  await database.run(
    `INSERT INTO transactions (
       transaction_id, timestamp, date, masseuse_name, service_type, location,
       duration, payment_amount, payment_method, masseuse_fee, start_time, end_time,
       status, business_day, start_datetime, end_datetime,
       parent_transaction_id, add_on_kind, payment_status
     ) VALUES (?, ?, ?, ?, ?, 'In-Shop', ?, ?, 'Cash', ?, '14:00', '15:00', ?, ?,
               ?, ?, ?, ?, 'PAID')`,
    [
      id, `${businessDay}T14:00:00+07:00`, businessDay, masseuse, serviceType,
      duration, paid, fee, status, businessDay,
      `${businessDay}T14:00:00+07:00`, `${businessDay}T15:00:00+07:00`,
      parentTransactionId, addOnKind,
    ]
  );
  return id;
}

function createAddOn(body) {
  return request(app).post(ADD_ONS_URL).send(body);
}

// File-level setup: every describe below shares one connection and one seeded
// database. Scoping these inside a single describe would tear the connection down
// before the later blocks ran.
beforeAll(async () => {
  await database.connect();
  businessDay = getBusinessDayParts(new Date()).currentBusinessDay;

  await database.run("INSERT INTO business_days (business_day, status) VALUES (?, 'open')", [businessDay]);
  await database.run(
    `INSERT INTO staff (name, active, total_fees_earned, total_fees_paid)
     VALUES ('May เมย์', 1, 0, 0), ('Nok นก', 1, 0, 0), ('Ploy พลอย', 1, 0, 0), ('Fon ฝน', 1, 0, 0)`
  );
  await database.run(
    `INSERT OR REPLACE INTO services (service_name, duration_minutes, location, price, masseuse_fee, active)
     VALUES
       ('Thai Massage', 60, 'In-Shop', 500, 200, 1),
       ('Thai Massage', 90, 'In-Shop', 700, 300, 1),
       ('Thai Massage', 120, 'In-Shop', 900, 400, 1),
       ('Foot Massage', 60, 'In-Shop', 400, 150, 1)`
  );
});

afterAll(async () => {
  await database.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

describe('PTE-API-001 — create a paid add-on', () => {
  test('a 60 to 90 upgrade charges the difference and links to the parent', async () => {
    const parentId = await seedParent({ paid: 500, fee: 200 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(201);
    expect(response.body.amount_due).toBe(200); // 700 now - 500 paid
    expect(response.body.add_on.parent_transaction_id).toBe(parentId);
    expect(response.body.add_on.add_on_kind).toBe('DURATION_UPGRADE');
    expect(response.body.add_on.payment_status).toBe('PAID');
  });

  test('a promotional parent subtracts what was PAID, not the catalog price', async () => {
    // Sold at a promotional 400 rather than the catalog 500.
    const parentId = await seedParent({ paid: 400, fee: 200 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(201);
    // 700 - 400 actually paid = 300. Catalog-minus-catalog would wrongly give 200.
    expect(response.body.amount_due).toBe(300);
  });

  test('an upgrade cheaper than what was paid charges zero and never refunds', async () => {
    // Full price before a promotion window opened, then extended inside it.
    const parentId = await seedParent({ paid: 900, fee: 200 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(201);
    expect(response.body.amount_due).toBe(0);
    expect(response.body.amount_due).toBeGreaterThanOrEqual(0);
  });

  test('an upgrade commission is the difference, so the original is not double-paid', async () => {
    const parentId = await seedParent({ paid: 500, fee: 200 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(201);
    // 90-minute fee 300 minus the 200 already earned on the parent.
    expect(response.body.add_on.masseuse_fee).toBe(100);
  });

  test('a different service after the massage charges its own full price', async () => {
    const parentId = await seedParent({ serviceType: 'Thai Massage', duration: 90, paid: 700, fee: 300 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'ADDITIONAL_SERVICE',
      service_type: 'Foot Massage',
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(201);
    expect(response.body.amount_due).toBe(400); // nothing subtracted
    expect(response.body.add_on.masseuse_fee).toBe(150); // full commission
  });

  test('a different masseuse may perform an additional service and earns its full commission', async () => {
    const parentId = await seedParent({ masseuse: 'May เมย์', duration: 90, paid: 700, fee: 300 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'ADDITIONAL_SERVICE',
      service_type: 'Foot Massage',
      location: 'In-Shop',
      duration: 60,
      masseuse_name: 'Nok นก',
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(201);
    expect(response.body.add_on.masseuse_name).toBe('Nok นก');
    expect(response.body.add_on.masseuse_fee).toBe(150);
  });

  test('an add-on can be recorded as pending', async () => {
    const parentId = await seedParent({ paid: 500, fee: 200 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_status: 'PENDING',
    });

    expect(response.status).toBe(201);
    expect(response.body.add_on.payment_status).toBe('PENDING');
  });

  test('the parent row is not modified by creating an add-on', async () => {
    const parentId = await seedParent({ paid: 500, fee: 200 });
    const before = await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [parentId]);

    await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    const after = await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [parentId]);
    expect(after).toEqual(before);
  });

  test('a parent that is not ACTIVE is rejected', async () => {
    const parentId = await seedParent({ status: 'EDITED (Corrected by TX-x)' });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(409);
  });

  test('an unknown parent is rejected', async () => {
    const response = await createAddOn({
      parent_transaction_id: 'TX-does-not-exist',
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(404);
  });

  test('add-ons do not nest — an add-on cannot be a parent', async () => {
    const originalId = await seedParent({ paid: 500, fee: 200 });
    const addOnAsParentId = await seedParent({
      paid: 200,
      fee: 100,
      parentTransactionId: originalId,
      addOnKind: 'DURATION_UPGRADE',
    });

    const response = await createAddOn({
      parent_transaction_id: addOnAsParentId,
      add_on_kind: 'ADDITIONAL_SERVICE',
      service_type: 'Foot Massage',
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(400);
  });

  test('an invalid add_on_kind is rejected', async () => {
    const parentId = await seedParent();

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'SOMETHING_ELSE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect(response.status).toBe(400);
  });

  test('a client-supplied price or commission is ignored, not trusted', async () => {
    const parentId = await seedParent({ paid: 500, fee: 200 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
      payment_amount: 1,
      masseuse_fee: 9999,
      discount_amount: 999,
    });

    expect(response.status).toBe(201);
    expect(response.body.amount_due).toBe(200);
    expect(response.body.add_on.masseuse_fee).toBe(100);
  });

  test('creating an add-on never creates a booking credit', async () => {
    const parentId = await seedParent({ paid: 500, fee: 200 });

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    const credits = await database.all(
      'SELECT * FROM booking_credits WHERE transaction_id = ?',
      [response.body.add_on.transaction_id]
    );
    expect(credits).toHaveLength(0);
  });
});

async function staffFees(name) {
  const row = await database.get('SELECT total_fees_earned FROM staff WHERE name = ?', [name]);
  return Number(row.total_fees_earned);
}

async function makeAddOn(overrides = {}) {
  const parentId = await seedParent({ paid: 500, fee: 200, ...(overrides.parent || {}) });
  const response = await createAddOn({
    parent_transaction_id: parentId,
    add_on_kind: 'DURATION_UPGRADE',
    service_type: 'Thai Massage',
    location: 'In-Shop',
    duration: 90,
    payment_method: 'Cash',
    payment_status: 'PAID',
    ...(overrides.body || {}),
  });
  return { parentId, addOnId: response.body.add_on.transaction_id, response };
}

describe('PTE-API-002 — settle a pending add-on', () => {
  test('settling moves it to PAID, records the method, and pays commission once', async () => {
    const { addOnId } = await makeAddOn({ body: { payment_status: 'PENDING', payment_method: undefined } });
    const before = await staffFees('May เมย์');

    const settle = await request(app)
      .post(`/api/transactions/add-ons/${addOnId}/settle`)
      .send({ payment_method: 'Bank Transfer' });

    expect(settle.status).toBe(200);
    const row = await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [addOnId]);
    expect(row.payment_status).toBe('PAID');
    expect(row.payment_method).toBe('Bank Transfer');
    expect(await staffFees('May เมย์')).toBe(before + Number(row.masseuse_fee));
  });

  test('settling an already-paid add-on is rejected and books nothing twice', async () => {
    const { addOnId } = await makeAddOn();
    const before = await staffFees('May เมย์');

    const settle = await request(app)
      .post(`/api/transactions/add-ons/${addOnId}/settle`)
      .send({ payment_method: 'Cash' });

    expect(settle.status).toBe(409);
    expect(await staffFees('May เมย์')).toBe(before);
  });

  test('a repeated settle submit books the money exactly once', async () => {
    const { addOnId } = await makeAddOn({ body: { payment_status: 'PENDING', payment_method: undefined } });
    const before = await staffFees('May เมย์');

    const first = await request(app).post(`/api/transactions/add-ons/${addOnId}/settle`).send({ payment_method: 'Cash' });
    const second = await request(app).post(`/api/transactions/add-ons/${addOnId}/settle`).send({ payment_method: 'Cash' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    const row = await database.get('SELECT masseuse_fee FROM transactions WHERE transaction_id = ?', [addOnId]);
    expect(await staffFees('May เมย์')).toBe(before + Number(row.masseuse_fee));
  });

  test('settling requires a payment method', async () => {
    const { addOnId } = await makeAddOn({ body: { payment_status: 'PENDING', payment_method: undefined } });
    const settle = await request(app).post(`/api/transactions/add-ons/${addOnId}/settle`).send({});
    expect(settle.status).toBe(400);
  });

  test('settling leaves the parent untouched', async () => {
    const { parentId, addOnId } = await makeAddOn({ body: { payment_status: 'PENDING', payment_method: undefined } });
    const before = await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [parentId]);

    await request(app).post(`/api/transactions/add-ons/${addOnId}/settle`).send({ payment_method: 'Cash' });

    const after = await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [parentId]);
    expect(after).toEqual(before);
  });
});

describe('PTE-API-003 — cancel an add-on', () => {
  test('cancelling a paid add-on removes its commission', async () => {
    const { addOnId } = await makeAddOn();
    const row = await database.get('SELECT masseuse_fee FROM transactions WHERE transaction_id = ?', [addOnId]);
    const before = await staffFees('May เมย์');

    const cancel = await request(app).post(`/api/transactions/add-ons/${addOnId}/cancel`).send({});

    expect(cancel.status).toBe(200);
    const after = await database.get('SELECT status FROM transactions WHERE transaction_id = ?', [addOnId]);
    expect(after.status).toBe('CANCELLED');
    expect(await staffFees('May เมย์')).toBe(before - Number(row.masseuse_fee));
  });

  test('cancelling a pending add-on moves no money', async () => {
    const { addOnId } = await makeAddOn({ body: { payment_status: 'PENDING', payment_method: undefined } });
    const before = await staffFees('May เมย์');

    const cancel = await request(app).post(`/api/transactions/add-ons/${addOnId}/cancel`).send({});

    expect(cancel.status).toBe(200);
    expect(await staffFees('May เมย์')).toBe(before);
  });

  test('cancelling twice is rejected', async () => {
    const { addOnId } = await makeAddOn();
    const first = await request(app).post(`/api/transactions/add-ons/${addOnId}/cancel`).send({});
    const second = await request(app).post(`/api/transactions/add-ons/${addOnId}/cancel`).send({});
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });

  test('settling a cancelled add-on is rejected', async () => {
    const { addOnId } = await makeAddOn({ body: { payment_status: 'PENDING', payment_method: undefined } });
    await request(app).post(`/api/transactions/add-ons/${addOnId}/cancel`).send({});

    const settle = await request(app)
      .post(`/api/transactions/add-ons/${addOnId}/settle`)
      .send({ payment_method: 'Cash' });

    expect(settle.status).toBe(409);
  });

  test('cancelling leaves the parent untouched', async () => {
    const { parentId, addOnId } = await makeAddOn();
    const before = await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [parentId]);

    await request(app).post(`/api/transactions/add-ons/${addOnId}/cancel`).send({});

    const after = await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [parentId]);
    expect(after).toEqual(before);
  });

  test('cancelling an unknown add-on is rejected', async () => {
    const cancel = await request(app).post('/api/transactions/add-ons/TX-nope/cancel').send({});
    expect(cancel.status).toBe(404);
  });

  test('an ordinary transaction cannot be cancelled through the add-on route', async () => {
    const parentId = await seedParent();
    const cancel = await request(app).post(`/api/transactions/add-ons/${parentId}/cancel`).send({});
    expect(cancel.status).toBe(400);
  });
});

/**
 * Phase 3 — aggregation. Counts and money are computed in the same SQL statements,
 * so linked add-on rows make money right by default and counts wrong by default.
 * These tests read through the real report and status endpoints.
 */
describe('PTE-RPT — counts, revenue, and the occupied window', () => {
  async function todaySummary() {
    const response = await request(app).get('/api/reports/summary/today');
    return response.body;
  }

  // Every seeded massage runs 14:00-15:00 Bangkok, so `at` is pinned inside that
  // window to make busy/free deterministic regardless of the real clock.
  const AT = () => `${businessDay}T14:30:00+07:00`;

  async function statusRowFor(masseuse) {
    const response = await request(app)
      .get('/api/staff/current-status')
      .query({ at: AT() });
    return (response.body.staff || []).find((row) => row.masseuse_name === masseuse);
  }

  async function seedTodayStaff(name, position) {
    const staff = await database.get('SELECT id FROM staff WHERE name = ?', [name]);
    await database.run(
      `INSERT OR IGNORE INTO today_staff (business_day, staff_id, display_name, position)
       VALUES (?, ?, ?, ?)`,
      [businessDay, staff.id, name, position]
    );
  }

  test('a duration upgrade does not increase the massage count', async () => {
    await seedTodayStaff('May เมย์', 1);
    const before = (await statusRowFor('May เมย์')).today_massages;

    const parentId = await seedParent({ paid: 500, fee: 200 });
    const afterParent = (await statusRowFor('May เมย์')).today_massages;
    expect(afterParent).toBe(before + 1);

    await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect((await statusRowFor('May เมย์')).today_massages).toBe(afterParent);
  });

  test('an additional service increases the massage count by exactly one', async () => {
    await seedTodayStaff('May เมย์', 1);
    const parentId = await seedParent({ duration: 90, paid: 700, fee: 300 });
    const before = (await statusRowFor('May เมย์')).today_massages;

    await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'ADDITIONAL_SERVICE',
      service_type: 'Foot Massage',
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    expect((await statusRowFor('May เมย์')).today_massages).toBe(before + 1);
  });

  test('a pending add-on adds nothing to revenue or fees until it is settled', async () => {
    const before = await todaySummary();
    const parentId = await seedParent({ paid: 500, fee: 200 });
    const afterParent = await todaySummary();

    const created = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_status: 'PENDING',
    });

    const pending = await todaySummary();
    expect(pending.total_revenue).toBe(afterParent.total_revenue);
    expect(pending.total_fees).toBe(afterParent.total_fees);
    expect(before).toBeDefined();

    await request(app)
      .post(`/api/transactions/add-ons/${created.body.add_on.transaction_id}/settle`)
      .send({ payment_method: 'Cash' });

    const settled = await todaySummary();
    expect(settled.total_revenue).toBe(afterParent.total_revenue + created.body.amount_due);
    expect(settled.total_fees).toBe(afterParent.total_fees + Number(created.body.add_on.masseuse_fee));
  });

  test('a paid add-on contributes its money immediately', async () => {
    const parentId = await seedParent({ paid: 500, fee: 200 });
    const before = await todaySummary();

    const created = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    const after = await todaySummary();
    expect(after.total_revenue).toBe(before.total_revenue + created.body.amount_due);
  });

  test('a pending add-on still occupies the staff window', async () => {
    await seedTodayStaff('Ploy พลอย', 3);
    const parentId = await seedParent({ masseuse: 'Ploy พลอย', paid: 500, fee: 200 });

    const created = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_status: 'PENDING',
    });

    const row = await statusRowFor('Ploy พลอย');
    expect(row.busy_until_iso).toBe(created.body.add_on.end_datetime);
  });

  test('cancelling an add-on returns the window to the parent end', async () => {
    await seedTodayStaff('Fon ฝน', 4);
    const parentId = await seedParent({ masseuse: 'Fon ฝน', paid: 500, fee: 200 });
    const parent = await database.get('SELECT end_datetime FROM transactions WHERE transaction_id = ?', [parentId]);

    const created = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
      payment_status: 'PAID',
    });

    await request(app)
      .post(`/api/transactions/add-ons/${created.body.add_on.transaction_id}/cancel`)
      .send({});

    const row = await statusRowFor('Fon ฝน');
    expect(row.busy_until_iso).toBe(new Date(parent.end_datetime).toISOString());
  });
});

/**
 * PTE-END-001 — end-day must not destroy an outstanding add-on.
 *
 * The existing handler summarises only ACTIVE rows and then deletes the day's rows
 * with NO status filter. A pending add-on caught by that would vanish with no record
 * that anyone owed money, and its parent would go with it, stranding the link.
 */
describe('PTE-END-001 — outstanding add-ons survive end-day', () => {
  test('a pending add-on and its parent both survive, still linked', async () => {
    const parentId = await seedParent({ masseuse: 'May เมย์', paid: 500, fee: 200 });
    const created = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_status: 'PENDING',
    });
    const addOnId = created.body.add_on.transaction_id;

    const endDay = await request(app).post('/api/reports/end-day').send({});
    expect(endDay.status).toBe(200);

    const survivingAddOn = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?', [addOnId]
    );
    const survivingParent = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?', [parentId]
    );

    expect(survivingAddOn).toBeDefined();
    expect(survivingParent).toBeDefined();
    expect(survivingAddOn.parent_transaction_id).toBe(parentId);
    expect(survivingAddOn.payment_status).toBe('PENDING');
  });

  test('end-day still clears ordinary settled transactions', async () => {
    const ordinaryId = await seedParent({ masseuse: 'Nok นก', paid: 500, fee: 200 });
    await request(app).post('/api/reports/end-day').send({});
    const gone = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?', [ordinaryId]
    );
    expect(gone).toBeUndefined();
  });
});
