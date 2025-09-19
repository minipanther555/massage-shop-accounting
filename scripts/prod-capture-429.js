// Usage:
//   BASE=https://109.123.238.197.sslip.io node scripts/prod-capture-429.js
// Optional envs:
//   CLICKS=12  DELAY_MS=250  PWTEST=1  OUT=diagnostics/prod-429
//
// Requires: npm i playwright
//
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'https://109.123.238.197.sslip.io';
const CLICKS = parseInt(process.env.CLICKS || '12', 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || '250', 10);
const PWTEST = process.env.PWTEST || '1';
const OUTDIR = process.env.OUT || `diagnostics/prod-429__${new Date().toISOString().replace(/[:.]/g,'-')}`;

(async () => {
  fs.mkdirSync(OUTDIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordHar: { path: path.join(OUTDIR, 'capture.har'), content: 'embed' }
  });
  const page = await context.newPage();

  const eventsPath = path.join(OUTDIR, 'events.ndjson');
  const events = fs.createWriteStream(eventsPath, { flags: 'w' });
  const log = (obj) => events.write(JSON.stringify({ ts: Date.now(), ...obj }) + '\n');

  const apiEvents = [];
  page.on('response', async (res) => {
    try {
      const url = res.url();
      if (!url.startsWith(BASE + '/api')) return;
      const status = res.status();
      const headers = res.headers();
      const method = res.request().method();
      const entry = {
        kind: 'api_response',
        url, method, status,
        rl_limit: headers['ratelimit-limit'],
        rl_remaining: headers['ratelimit-remaining'],
        rl_reset: headers['ratelimit-reset'],
        retry_after: headers['retry-after']
      };
      apiEvents.push(entry);
      log(entry);
    } catch {}
  });

  // 1) Navigate and auto-discover endpoints used by the real page
  const staffUrl = `${BASE}/staff.html?PWTEST=${encodeURIComponent(PWTEST)}`;
  log({ kind: 'nav', staffUrl });
  await page.goto(staffUrl, { waitUntil: 'domcontentloaded' });

  // give the page a moment to do its initial GETs (allstaff, roster)
  await page.waitForTimeout(1500);

  // discover endpoints from network
  // fallback: also read what we captured dynamically
  const observed = apiEvents.slice();

  const rosterGet = observed.find(e => /\/api\/staff\/roster/.test(e.url) && e.method === 'GET')
                 || null;
  const allStaffGet = observed.find(e => /\/api\/staff\/allstaff/.test(e.url) && e.method === 'GET')
                   || null;

  if (!rosterGet) {
    console.error('❌ Could not discover GET roster endpoint from page traffic.');
    console.error('Observed API events:', observed.map(e => `${e.method} ${e.url}`));
    process.exit(2);
  }
  const GET_ROSTER = new URL(rosterGet.url).pathname;         // e.g. /api/staff/roster
  const PUT_BASE   = GET_ROSTER;                               // assume PUT is same base + /:pos

  log({ kind: 'discovered_endpoints', GET_ROSTER, PUT_BASE });

  // 2) Fetch CSRF once (reuse for all requests)
  const csrfRes = await page.request.get(`${BASE}/csrf`, { ignoreHTTPSErrors: true });
  const csrfJson = await csrfRes.json();
  const CSRF = csrfJson.csrfToken;
  log({ kind: 'csrf_obtained', ok: !!CSRF });

  // helper: GET roster JSON via page.request so we share cookies
  const getRoster = async () => {
    const r = await page.request.get(`${BASE}${GET_ROSTER}`, { ignoreHTTPSErrors: true });
    let json = null;
    try { json = await r.json(); } catch {}
    return { status: r.status(), headers: r.headers(), json };
  };

  // helper: PUT add entry at position with name
  const putRoster = async (pos, masseuse_name) => {
    const r = await page.request.fetch(`${BASE}${PUT_BASE}/${pos}`, {
      method: 'PUT',
      ignoreHTTPSErrors: true,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
      data: JSON.stringify({ masseuse_name, status: null })
    });
    let json = null;
    try { json = await r.json(); } catch {}
    return { status: r.status(), headers: r.headers(), json };
  };

  // 3) Load allstaff & current roster to pick names and compute next positions (first-empty-slot)
  const allstaffRes = await page.request.get(`${BASE}/api${GET_ROSTER.replace(/\/staff[-_]?roster.*/,'')}/staff/allstaff`, { ignoreHTTPSErrors: true }).catch(()=>null);
  let allNames = [];
  try { allNames = allstaffRes ? await allstaffRes.json() : []; } catch {}
  if (!Array.isArray(allNames) || allNames.length === 0) {
    // fallback: ask the page to compute from its own dropdown if present
    allNames = await page.evaluate(() => {
      const dd = document.querySelector('#available-staff');
      return dd ? Array.from(dd.querySelectorAll('option')).map(o=>o.value).filter(Boolean) : [];
    });
  }
  log({ kind: 'allstaff_count', count: allNames.length });

  const firstEmptySlot = (positions) => {
    const s = new Set(positions);
    let p = 1;
    while (s.has(p)) p++;
    return p;
  };

  let namesUsed = new Set();
  let roster = (await getRoster()).json || [];

  // 4) Add loop — stop on first 429, record everything
  let hit429 = null;
  for (let i = 0; i < CLICKS; i++) {
    // choose a new name
    const rosterNames = new Set(roster.map(x => x.masseuse_name || x.name).filter(Boolean));
    const candidate = allNames.find(n => !rosterNames.has(n) && !namesUsed.has(n)) || `Diag_${Date.now()}_${i}`;
    namesUsed.add(candidate);

    const positions = roster.map(x => x.position).filter(Number.isFinite);
    const pos = firstEmptySlot(positions);

    log({ kind: 'add_attempt', i, pos, name: candidate });

    const put = await putRoster(pos, candidate);
    log({
      kind: 'put_result',
      i, pos, status: put.status,
      rl_limit: put.headers['ratelimit-limit'],
      rl_remaining: put.headers['ratelimit-remaining'],
      rl_reset: put.headers['ratelimit-reset'],
      retry_after: put.headers['retry-after']
    });

    if (put.status === 429) { hit429 = { phase: 'PUT', i, pos }; break; }

    // follow with GET (mirror the page behavior)
    const get = await getRoster();
    log({
      kind: 'get_result',
      i, status: get.status,
      rl_limit: get.headers['ratelimit-limit'],
      rl_remaining: get.headers['ratelimit-remaining'],
      rl_reset: get.headers['ratelimit-reset'],
      retry_after: get.headers['retry-after']
    });
    if (get.status === 429) { hit429 = { phase: 'GET', i, pos }; break; }
    roster = Array.isArray(get.json) ? get.json : roster;

    if (DELAY_MS > 0) await page.waitForTimeout(DELAY_MS);
  }

  // 5) Summarize
  const summary = {
    base: BASE,
    clicks_requested: CLICKS,
    delay_ms: DELAY_MS,
    discovered_endpoints: { GET_ROSTER, PUT_BASE },
    first_429: hit429,
    api_samples: apiEvents.slice(-Math.min(apiEvents.length, 20)) // tail
  };
  fs.writeFileSync(path.join(OUTDIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('✅ capture complete →', OUTDIR);
  if (hit429) console.log('❌ first 429 at', hit429);

  await browser.close();
  events.end();
})().catch(e => { console.error(e); process.exit(1); });
