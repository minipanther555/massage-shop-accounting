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

## Quick Find Commands

```bash
rg -n "test browser|preview browser|localhost:3000|PWTEST|DB_PATH|summary.html" 00-project-docs
rg -n "Local Test Browser Preview" 00-project-docs
```
