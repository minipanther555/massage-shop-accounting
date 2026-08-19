/* eslint-env jest */

/**
 * RIT-MONEY-001 — the ledger accepts tips and miscellaneous income.
 *
 * The `Validation:` line this file encodes, verbatim from
 * `00-project-docs/steps/reception-intake-truth-and-non-massage-income-steps.md`:
 *
 *   "a route test asserts all four kinds are accepted with 201 **and** that a
 *    fifth invented kind is still rejected with 400 — both in one test, so
 *    removing the validator fails."
 *
 * Both halves live in ONE test on purpose. A test that only asserted the two new
 * kinds are accepted would pass against a route with no validator at all.
 *
 * Covers FR-005 (a tip is recorded against a transaction) and FR-006
 * (miscellaneous income, with or without a parent) of
 * `reception-intake-truth-and-non-massage-income.md`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-rit-money-001-'));
process.env.DB_PATH = path.join(testDirectory, 'rit-money-001.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDayParts } = require('../../backend/utils/business-day');

const ADD_ONS_URL = '/api/transactions/add-ons';

let businessDay;
let parentSeq = 0;

/** Insert an original paid sale directly, so the test controls exactly what was paid. */
async function seedParent({
  masseuse = 'May เมย์',
  serviceType = 'Thai Massage',
  duration = 60,
  paid = 500,
  fee = 200,
  status = 'ACTIVE',
} = {}) {
  parentSeq += 1;
  const id = `RIT-MONEY-PARENT-${parentSeq}`;
  await database.run(
    `INSERT INTO transactions (
       transaction_id, timestamp, date, masseuse_name, service_type, location,
       duration, payment_amount, payment_method, masseuse_fee, start_time, end_time,
       status, business_day, start_datetime, end_datetime, payment_status
     ) VALUES (?, ?, ?, ?, ?, 'In-Shop', ?, ?, 'Cash', ?, '14:00', '15:00', ?, ?, ?, ?, 'PAID')`,
    [
      id, `${businessDay}T14:00:00+07:00`, businessDay, masseuse, serviceType,
      duration, paid, fee, status, businessDay,
      `${businessDay}T14:00:00+07:00`, `${businessDay}T15:00:00+07:00`,
    ]
  );
  return id;
}

function createAddOn(body) {
  return request(app).post(ADD_ONS_URL).send(body);
}

beforeAll(async () => {
  await database.connect();
  businessDay = getBusinessDayParts(new Date()).currentBusinessDay;

  await database.run("INSERT INTO business_days (business_day, status) VALUES (?, 'open')", [businessDay]);
  await database.run(
    `INSERT INTO staff (name, active, total_fees_earned, total_fees_paid)
     VALUES ('May เมย์', 1, 0, 0), ('Nok นก', 1, 0, 0)`
  );
  await database.run(
    `INSERT OR REPLACE INTO services (service_name, duration_minutes, location, price, masseuse_fee, active)
     VALUES
       ('Thai Massage', 60, 'In-Shop', 500, 200, 1),
       ('Thai Massage', 90, 'In-Shop', 700, 300, 1),
       ('Foot Massage', 60, 'In-Shop', 400, 150, 1)`
  );
});

afterAll(async () => {
  await database.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

describe('RIT-MONEY-001 — the add-on validator admits money that is not a service', () => {
  test('all four kinds are accepted with 201 and a fifth invented kind is rejected with 400', async () => {
    const upgradeParent = await seedParent({ paid: 500, fee: 200 });
    const serviceParent = await seedParent();
    const tipParent = await seedParent();
    const rejectedParent = await seedParent();

    const durationUpgrade = await createAddOn({
      parent_transaction_id: upgradeParent,
      add_on_kind: 'DURATION_UPGRADE',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 90,
      payment_method: 'Cash',
    });

    const additionalService = await createAddOn({
      parent_transaction_id: serviceParent,
      add_on_kind: 'ADDITIONAL_SERVICE',
      service_type: 'Foot Massage',
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
    });

    const tip = await createAddOn({
      parent_transaction_id: tipParent,
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Cash',
    });

    const miscIncome = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      amount: 50,
      description: 'ยาหม่อง',
      payment_method: 'Cash',
    });

    const inventedKind = await createAddOn({
      parent_transaction_id: rejectedParent,
      add_on_kind: 'STAFF_LOAN',
      amount: 100,
      payment_method: 'Cash',
    });

    expect({
      DURATION_UPGRADE: durationUpgrade.status,
      ADDITIONAL_SERVICE: additionalService.status,
      TIP: tip.status,
      MISC_INCOME: miscIncome.status,
      STAFF_LOAN: inventedKind.status,
    }).toEqual({
      DURATION_UPGRADE: 201,
      ADDITIONAL_SERVICE: 201,
      TIP: 201,
      MISC_INCOME: 201,
      STAFF_LOAN: 400,
    });

    // The rejection must happen before any write, not after one.
    const orphan = await database.get(
      "SELECT * FROM transactions WHERE add_on_kind = 'STAFF_LOAN'"
    );
    expect(orphan).toBeUndefined();
  });

  test('a parentless MISC_INCOME row fills every NOT NULL column without inventing data', async () => {
    const expensesBefore = await database.get('SELECT COUNT(*) AS n FROM expenses');

    const response = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      amount: 50,
      description: 'ยาหม่อง',
      payment_method: 'Cash',
    });

    expect(response.status).toBe(201);
    const row = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [response.body.add_on.transaction_id]
    );

    expect(row.parent_transaction_id).toBeNull();
    expect(row.add_on_kind).toBe('MISC_INCOME');
    expect(Number(row.payment_amount)).toBe(50);
    // No masseuse performed it, so no masseuse is named and no fee is owed.
    expect(row.masseuse_name).toBe('');
    expect(Number(row.masseuse_fee)).toBe(0);
    // The description is what was sold; there is no service.
    expect(row.service_type).toBe('ยาหม่อง');
    expect(row.location).toBe('');
    expect(Number(row.duration)).toBe(0);
    expect(row.status).toBe('ACTIVE');
    expect(row.business_day).toBe(businessDay);
    // A zero-length window: a charge occupies nobody's time.
    expect(row.start_time).toBe(row.end_time);

    // FR-006: a MISC_INCOME entry writes no expense row.
    //
    // Asserted as a DELTA across this one request, not as a whole-table count.
    // It was `COUNT(*) === 0` until RIT-MONEY-002 — a tip is income, expense,
    // and attributed — gave a TIP a paired expense row, and the first test in
    // this file records a tip into the same shared database. A whole-table count
    // silently encodes "nothing else in this file writes here", which stopped
    // being true. The delta form is what FR-006 actually guarantees, and it
    // survives any later step that writes an expense elsewhere in this file.
    const expensesAfter = await database.get('SELECT COUNT(*) AS n FROM expenses');
    expect(Number(expensesAfter.n)).toBe(Number(expensesBefore.n));
  });

  test('a TIP inherits the parent masseuse and business day, and earns no commission', async () => {
    const parentId = await seedParent({ masseuse: 'Nok นก' });
    const before = await database.get("SELECT total_fees_earned FROM staff WHERE name = 'Nok นก'");

    const response = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Cash',
    });

    expect(response.status).toBe(201);
    const row = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [response.body.add_on.transaction_id]
    );
    expect(row.masseuse_name).toBe('Nok นก');
    expect(row.business_day).toBe(businessDay);
    expect(Number(row.masseuse_fee)).toBe(0);
    expect(row.parent_transaction_id).toBe(parentId);

    // The operator's requirement: a tip is handed over immediately and never
    // reaches the payday balance.
    const after = await database.get("SELECT total_fees_earned FROM staff WHERE name = 'Nok นก'");
    expect(Number(after.total_fees_earned)).toBe(Number(before.total_fees_earned));
  });

  test('a TIP with no parent is rejected; a MISC_INCOME with no parent is not', async () => {
    const parentlessTip = await createAddOn({
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Cash',
    });
    const parentlessMisc = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      amount: 20,
      description: 'ค่าบริการเพิ่ม',
      payment_method: 'Cash',
    });

    expect([parentlessTip.status, parentlessMisc.status]).toEqual([400, 201]);
  });

  test('a TIP is accepted on a CORRECTED parent, refused on the superseded original, and the two service kinds are unchanged', async () => {
    const correctedParent = await seedParent({ status: 'CORRECTED' });
    const supersededParent = await seedParent({ status: 'EDITED (Corrected by TX-1)' });
    const correctedParentForService = await seedParent({ status: 'CORRECTED' });

    const tipOnCorrected = await createAddOn({
      parent_transaction_id: correctedParent,
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Cash',
    });
    const tipOnSuperseded = await createAddOn({
      parent_transaction_id: supersededParent,
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Cash',
    });
    const serviceOnCorrected = await createAddOn({
      parent_transaction_id: correctedParentForService,
      add_on_kind: 'ADDITIONAL_SERVICE',
      service_type: 'Foot Massage',
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
    });

    expect({
      tipOnCorrected: tipOnCorrected.status,
      tipOnSuperseded: tipOnSuperseded.status,
      additionalServiceOnCorrected: serviceOnCorrected.status,
    }).toEqual({
      tipOnCorrected: 201,
      tipOnSuperseded: 409,
      // Unchanged: extending a service still requires an ACTIVE original.
      additionalServiceOnCorrected: 409,
    });
  });
});
