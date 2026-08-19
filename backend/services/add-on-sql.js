/**
 * SQL predicates for Paid Time Extension add-on rows.
 *
 * Add-ons are ordinary rows in `transactions` linked to their original sale by
 * `parent_transaction_id`. That makes money aggregate correctly with no query
 * change, but makes two other things wrong by default — counting and pending
 * money. These helpers are the single home for both rules so the ~20 aggregation
 * sites cannot drift apart.
 *
 * See feature spec PTE-010 (count semantics) and PTE-011 (pending payment).
 */

/**
 * Counts as a massage performed?
 *
 * The rule is kind-driven, not parent-driven: a row is a massage unless its
 * `add_on_kind` says otherwise. An ordinary transaction has no kind and counts.
 * A DURATION_UPGRADE does NOT — extending one customer from 60 to 90 minutes is
 * one massage, not two. An ADDITIONAL_SERVICE does, because a second service is
 * a second piece of work and must affect walk-in queue fairness.
 *
 * The parent test this predicate used to lead with was dropped deliberately. It
 * made any parentless non-massage row — a miscellaneous-income charge, a tip
 * recorded without a parent — count as a massage and inflate a masseuse's
 * workload and queue position. Kind is the thing that actually decides.
 *
 * See feature spec `reception-intake-truth-and-non-massage-income.md` FR-007 /
 * AC-009 and its "Contract: countable massage (AMENDED)" block.
 *
 * @param {string} alias table alias, or '' when the query has none
 */
function countsAsMassage(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `(${prefix}add_on_kind IS NULL OR ${prefix}add_on_kind = 'ADDITIONAL_SERVICE')`;
}

/**
 * Money has actually arrived?
 *
 * A PENDING add-on is work in progress with payment still owed, so it must not
 * reach revenue, masseuse fees, or payable staff pay until it is settled. Every
 * pre-existing row defaults to PAID, so this never reclassifies history.
 *
 * @param {string} alias table alias, or '' when the query has none
 */
function isSettled(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}payment_status != 'PENDING'`;
}

module.exports = {
  countsAsMassage,
  isSettled,
};
