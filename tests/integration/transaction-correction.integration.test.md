# Transaction Correction Integration Test

## Purpose

Exercises the real Express transaction route against an isolated SQLite database for current-business-day correction selection and normal walk-in correction isolation.

## Contract

- Correction candidates are capped at ten and limited to the current business day.
- The latest correction target is the first candidate.
- A correction retains the `EDITED`/`CORRECTED` audit chain, reverses the original staff fee, applies the replacement fee, and creates neither a booking nor booking credit for a manually selected normal-walk-in replacement.

## Dependencies

`backend/routes/transactions.js`, `backend/models/database.js`, `backend/server.js`, and Supertest.
