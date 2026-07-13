# `scripts/today-staff-demo-seed.js`

## Overall Purpose

`today-staff-demo-seed.js` is the command-line wrapper for the Today Staff local demo seed operation. It exposes a safe, explicit interface for preparing a local SQLite database without hand-editing data or deleting staff.

## End-to-End Data Flow

The operator runs `node scripts/today-staff-demo-seed.js --db data/massage_shop.db --dry-run` or `--apply`. The CLI parses flags, passes them to `runSeed()` in `todayStaffDemoSeed.js`, and prints the resulting JSON summary. Errors are printed to stderr and return exit code `1`.

## Module API & Logic Breakdown

### CLI Argument Parser

- **Purpose:** Convert process arguments into a `runSeed()` options object.
- **Parameters:** `process.argv` (`string[]`, required).
- **Returns:** `object` with `dbPath`, `baseBusinessDay`, and `dryRun`.
- **Raises / Throws:** `Error` for unknown flags.
- **Usage & Logic Notes:** Dry-run is the default. Apply mode requires `--apply`. The DB path remains mandatory because `todayStaffDemoSeed.js` rejects missing paths.

### CLI Entrypoint

- **Purpose:** Execute the seed operation and print a machine-readable summary.
- **Parameters:** None directly; uses process arguments.
- **Returns:** No direct return value; writes JSON to stdout.
- **Raises / Throws:** Catches errors from the parser or `runSeed()`, writes the error message, and exits non-zero.
- **Usage & Logic Notes:** This file contains no data reset logic. All safety, DB, and seed behavior belongs to `todayStaffDemoSeed.js`.

## Dependency Mapping

### Upstream Dependencies

- Operators and smoke workflows invoke this file with Node.
- Input data contract: `--db <workspace sqlite path>`, optional `--base-business-day YYYY-MM-DD`, and either `--dry-run` or `--apply`.

### Downstream Dependencies

- Calls `scripts/todayStaffDemoSeed.js`.
- Output data contract: JSON summary from `runSeed()`.

## Bug & Resolution History

### Bug Summary

No CLI-specific bug has been found yet.

### Validated Hypothesis

Not applicable.

### Invalidated Hypotheses

- Not applicable.

### Resolution

Not applicable.
