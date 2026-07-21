const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

describe('branch database routing OTDD guardrail', () => {
  let tempDirectory;
  let database;
  let defaultPath;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-branch-db-'));
    defaultPath = path.join(tempDirectory, 'massage_shop.db');
    process.env.DB_PATH = defaultPath;
    jest.resetModules();
    database = require('../backend/models/database');
    await database.connect();
    await database.run('INSERT INTO staff (name, active) VALUES (?, 1)', ['Shared Staff']);
  });

  afterEach(async () => {
    await database.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
    delete process.env.DB_PATH;
  });

  it('fails closed instead of falling back to the shared database when a branch file is missing', async () => {
    await expect(database.runWithLocation(43, () => database.all('SELECT * FROM staff')))
      .rejects.toMatchObject({ code: 'BRANCH_DATABASE_MISSING' });
  });

  it('keeps branch-43 writes out of the shared database', async () => {
    fs.copyFileSync(defaultPath, path.join(tempDirectory, 'massage_shop.branch-43.db'));

    await database.runWithLocation(43, async () => {
      await database.run('INSERT INTO staff (name, active) VALUES (?, 1)', ['Branch 43 Staff']);
      const rows = await database.all('SELECT name FROM staff ORDER BY name');
      expect(rows.map((row) => row.name)).toEqual(['Branch 43 Staff', 'Shared Staff']);
    });

    const sharedRows = await database.all('SELECT name FROM staff ORDER BY name');
    expect(sharedRows.map((row) => row.name)).toEqual(['Shared Staff']);
  });

  it('bootstraps a branch catalog without copying shared staff or operational rows', async () => {
    await database.run('CREATE TABLE locations (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, active BOOLEAN DEFAULT TRUE)');
    const scriptPath = path.join(__dirname, '..', 'backend', 'scripts', 'bootstrap-branch-database.js');
    execFileSync(process.execPath, [scriptPath, '43'], {
      env: { ...process.env, DB_PATH: defaultPath },
      encoding: 'utf8'
    });

    const branchPath = path.join(tempDirectory, 'massage_shop.branch-43.db');
    expect(fs.existsSync(branchPath)).toBe(true);

    await database.runWithLocation(43, async () => {
      expect(await database.get('SELECT COUNT(*) AS count FROM staff')).toEqual({ count: 0 });
      expect(await database.get('SELECT COUNT(*) AS count FROM transactions')).toEqual({ count: 0 });
      expect(await database.get('SELECT COUNT(*) AS count FROM services')).toEqual({ count: 0 });
      expect(await database.get('SELECT name FROM locations WHERE id = ?', [43])).toEqual({ name: 'Top Thai 43' });
    });

    expect(await database.get('SELECT COUNT(*) AS count FROM staff')).toEqual({ count: 1 });
  });
});
