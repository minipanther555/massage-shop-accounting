/**
 * SQL predicates for transaction status.
 *
 * `transactions.status` is free `TEXT` (backend/models/database.js:50), and the
 * correction workflow writes composed literals into it — `EDITED (Corrected by
 * TX-…)` for a superseded original, `CANCELLED (Customer left before service)`
 * for one cancellation path. There is therefore no fixed vocabulary a deny-list
 * could enumerate, which is why the live-work rule below is an allow-list.
 *
 * This module is the single home for the rule so the availability, workload,
 * walk-in priority, today's revenue and today's customer-count queries cannot
 * drift apart. It is a sibling of `add-on-sql.js` and follows the same
 * alias-taking, fragment-returning convention.
 *
 * See feature spec `reception-intake-truth-and-non-massage-income.md` FR-001 /
 * AC-001 and its "Contract: live work" block.
 */

/**
 * Is this transaction live work — happening now, or genuinely performed?
 *
 * True for `ACTIVE` (an ordinary live row) and `CORRECTED` (the replacement an
 * edit creates). False for everything else, which is what excludes the
 * superseded `EDITED (Corrected by …)` original and every cancelled row without
 * this module having to know their exact wording.
 *
 * @param {string} alias table alias, or '' when the query has none
 */
function isLiveWork(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}status IN ('ACTIVE', 'CORRECTED')`;
}

module.exports = {
  isLiveWork,
};
