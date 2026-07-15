# Local Test Browser Preview

## Search Keywords

test browser, preview browser, local preview, localhost:3000, in-app browser, Codex browser, start browser, open browser, summary.html, transaction.html, staff roster, Today Staff Queue, PWTEST, DB_PATH, massage_shop.db

## Purpose

Use this note when an agent needs to start the same local preview server that the operator uses for clicking around the app in the in-app browser. This is the normal preview path for pages like Daily Summary, New Customer, and Today's Staff Queue. It uses the existing local preview SQLite database instead of creating a fake database.

## Start Command

Run from the repository root:

```bash
PATH=/opt/homebrew/bin:$PATH DB_PATH=/Users/aidantam/projects/eiw-massage-shop-bookkeeping/docker/data/massage_shop.db NODE_ENV=testing PWTEST=1 PORT=3000 /opt/homebrew/bin/node backend/server.js
```

Then open one of these URLs in the in-app browser:

```text
http://localhost:3000/summary.html
http://localhost:3000/transaction.html
http://localhost:3000/api/main/transaction
http://localhost:3000/api/main/staff-roster
```

## Important Details

- `DB_PATH=/Users/aidantam/projects/eiw-massage-shop-bookkeeping/docker/data/massage_shop.db` points to the existing local preview database.
- `NODE_ENV=testing PWTEST=1` enables the test/preview bypass behavior used by the app's browser checks.
- `PORT=3000` matches the expected local browser URL.
- If another process is already using port `3000`, stop that old local dev server first, then rerun the command above.
- Do not invent a new fake DB for preview unless the task explicitly asks for an isolated throwaway test database.

## Blank In-App Browser Troubleshooting

Use this when the operator says the preview "went down" or the in-app browser shows a blank screen.

1. First check the server, not the browser:
   ```bash
   lsof -nP -iTCP:3000 -sTCP:LISTEN
   curl -sS http://127.0.0.1:3000/health
   curl -sS -D - http://127.0.0.1:3000/index.html
   ```
2. If `/health` is OK and `index.html` returns real HTML, the server is not down. The usual cause is a stale in-app browser tab after a local server restart.
3. Check browser console/DOM state. If the in-app browser connector reports no selected/open tabs even though the UI appears to show one, open a fresh tab directly to the target URL instead of continuing to debug the server.
4. Known good recovery URL:
   ```text
   http://localhost:3000/index.html
   ```
5. Known good rendered state after recovery: Home page body contains `MASSAGE SHOP POS SYSTEM`, `Preview: Manager`, today's revenue, active staff, recent activity, and admin links.

### 2026-07-14 Incident

Symptom: the operator saw a blank in-app browser after the local preview was restarted. `curl http://127.0.0.1:3000/health` returned `{"status":"OK","version":"1.0.0"}`, and `curl http://127.0.0.1:3000/index.html` returned the full Home page HTML. The in-app browser automation layer reported zero open tabs even though the UI showed `localhost:3000/index.html`. Opening a fresh in-app browser tab to `http://localhost:3000/index.html` rendered correctly with `Preview: Manager`, `฿16100.00`, 16 transactions, 7 active staff, and recent activity. Root cause: stale in-app browser tab state, not a dead server or blank HTML response.

## Quick Find Commands

```bash
rg -n "test browser|preview browser|localhost:3000|PWTEST|DB_PATH|summary.html" 00-project-docs
rg -n "Local Test Browser Preview" 00-project-docs
```
