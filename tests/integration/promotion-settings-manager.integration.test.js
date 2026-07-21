/* eslint-env jest */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-promotion-settings-test-'));
process.env.DB_PATH = path.join(testDirectory, 'promotion-settings-test.db');
process.env.NODE_ENV = 'testing';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

function createBranchDatabase(locationId) {
  const branchPath = process.env.DB_PATH.replace('.db', `.branch-${locationId}.db`);
  fs.closeSync(fs.openSync(branchPath, 'w'));
}

async function login(agent, username, password) {
  const response = await agent
    .post('/api/auth/login')
    .send({ username, password });
  expect(response.status).toBe(200);
}

describe('manager branch promotion settings', () => {
  beforeAll(async () => {
    await database.connect();
    createBranchDatabase(43);
    createBranchDatabase(49);
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('manager reads branch defaults and changes only the authenticated branch', async () => {
    const manager43 = request.agent(app);
    const manager49 = request.agent(app);
    await login(manager43, 'manager_top_thai_43', 'manager456');
    await login(manager49, 'manager_top_thai_49', 'manager456');

    const branch43 = await manager43.get('/api/services/promotion-settings');
    const branch49 = await manager49.get('/api/services/promotion-settings');
    expect(branch43.status).toBe(200);
    expect(branch43.body).toMatchObject({
      enabled: true,
      start_minute: 600,
      end_minute: 1440,
      manual_override_grace_minutes: 15
    });
    expect(branch49.status).toBe(200);
    expect(branch49.body).toMatchObject({
      enabled: true,
      start_minute: 600,
      end_minute: 1080,
      manual_override_grace_minutes: 15
    });

    const saved = await manager43
      .put('/api/services/promotion-settings')
      .send({
        enabled: true,
        start_minute: 660,
        end_minute: 1380,
        manual_override_grace_minutes: 20
      });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      enabled: true,
      start_minute: 660,
      end_minute: 1380,
      manual_override_grace_minutes: 20
    });

    const unchanged49 = await manager49.get('/api/services/promotion-settings');
    expect(unchanged49.body).toMatchObject({
      start_minute: 600,
      end_minute: 1080,
      manual_override_grace_minutes: 15
    });
  });

  test('reception cannot read or change promotion settings', async () => {
    const reception43 = request.agent(app);
    await login(reception43, 'reception_top_thai_43', 'reception123');

    const read = await reception43.get('/api/services/promotion-settings');
    const write = await reception43
      .put('/api/services/promotion-settings')
      .send({ enabled: false, start_minute: 600, end_minute: 1080, manual_override_grace_minutes: 15 });

    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
  });
});
