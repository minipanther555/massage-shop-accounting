/**
 * SQL predicate for transaction rows that count as live work and live money.
 *
 * An edit does not update a transaction in place. It relabels the original
 * `EDITED (Corrected by <id>)` (`backend/routes/transactions.js:693-696`) and
 * inserts a replacement carrying status `CORRECTED` (`:713`). After an edit
 * neither row is `ACTIVE`, so any reader filtering on `ACTIVE` alone sees the
 * massage as if it never happened — the masseuse reads as free mid-massage and
 * her money vanishes from the day's total. This helper is the single home for
 * the rule so the aggregation sites cannot drift apart, for the same reason
 * `add-on-sql.js` gives for existing.
 *
 * It is an ALLOWLIST on purpose. A denylist — "anything not cancelled" — would
 * also admit the superseded `EDITED` row alongside its replacement, doubling a
 * masseuse's workload on every edit and pushing her further down the queue than
 * before. That is a worse failure than the one being fixed. Naming what is
 * admitted also means a status value added later is excluded by default, which
 * is the safe direction. See feature spec ETSC-001.
 *
 * The two admitted values match the existing reference implementations exactly:
 * `backend/routes/reports.js:239` and the unique booking index at
 * `backend/models/database.js:359`. This introduces no new status vocabulary;
 * the vocabulary is fixed by
 * `00-project-docs/feature-specifications/transaction-correction-operational-reversal.md`
 * FR-003 and §6, which this module must not change.
 */

/**
 * Does this row count as live work and live money?
 *
 * True for an ordinary live transaction (`ACTIVE`) and for a correction
 * replacement (`CORRECTED`). False for a superseded row (`EDITED (…)`) and for
 * a cancelled row (`CANCELLED (…)`), both of which are audit records only.
 *
 * `alias` is a table alias, never user input. It is called only with hardcoded
 * literals from route modules, and is interpolated rather than parameterised
 * because a table alias cannot be bound as a SQL parameter. Do not extend this
 * helper to accept caller-supplied strings.
 *
 * @param {string} alias table alias, or '' when the query has none
 */
function countsAsLiveWork(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}status IN ('ACTIVE', 'CORRECTED')`;
}

module.exports = {
  countsAsLiveWork,
};
