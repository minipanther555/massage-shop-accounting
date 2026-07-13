# `backend/utils/business-day.js`

## 1. Header Section

**Overall Purpose:** This module defines the Bangkok business-day contract used by Today Staff planning, helper earnings, transaction ledger writes, and scheduled/reset recovery. It prevents UTC calendar dates from becoming the accounting source of truth for late-night shop activity.

**End-to-End Data Flow:** A route or service passes the current JavaScript `Date` into this utility. The utility projects that instant into `Asia/Bangkok`, applies the configured 2:00 a.m. reset boundary, and returns the current and previous business-day strings. Callers store those strings on transaction, Today Staff, and planning records or use them to query previous-business-day commission.

## 2. Module API & Logic Breakdown

### `getBusinessDay(date, options)`
- **Purpose:** Return the `YYYY-MM-DD` Bangkok business day for an instant.
- **Parameters / Props:** `date` (`Date`, optional, defaults to now, required false); `options.resetHour` (`number`, optional, default `2`, required false).
- **Returns / Renders:** `string` business-day date.
- **Raises / Throws:** No intentional exceptions; invalid `Date` input may throw through `Intl.DateTimeFormat`.
- **Usage & Logic Notes:** Instants before 2:00 a.m. Bangkok time belong to the previous Bangkok calendar date.

### `getBusinessDayParts(date, options)`
- **Purpose:** Return current and previous business-day metadata in one call.
- **Parameters / Props:** Same as `getBusinessDay`; `options.openHour` documents the default 10:00 a.m. open hour.
- **Returns / Renders:** `{ currentBusinessDay, previousBusinessDay, resetHour, openHour, timeZone }`.
- **Raises / Throws:** Same as `getBusinessDay`.
- **Usage & Logic Notes:** Used by helper endpoints so current-day planning and previous-day earnings use the same boundary.

### `addDays(dateString, amount)`
- **Purpose:** Add calendar days to a `YYYY-MM-DD` date.
- **Parameters / Props:** `dateString` (`string`, required); `amount` (`number`, required).
- **Returns / Renders:** `string` date.
- **Raises / Throws:** No intentional exceptions.
- **Usage & Logic Notes:** Operates at UTC midnight because inputs are business-day labels, not local timestamps.

### `getNextBusinessDay(currentBusinessDay)`
- **Purpose:** Return the following business-day label.
- **Parameters / Props:** `currentBusinessDay` (`string`, required).
- **Returns / Renders:** `string` date.
- **Raises / Throws:** No intentional exceptions.
- **Usage & Logic Notes:** Used by reset/recovery flows.

## 3. Dependency Mapping

**Upstream Dependencies (Inputs):** `backend/routes/staff.js` and `backend/routes/transactions.js` call this module with `Date` instances. Input contract is a JavaScript `Date` representing an absolute instant.

**Downstream Dependencies (Outputs):** No service dependencies. Output contracts are business-day strings consumed by SQLite tables: `transactions.business_day`, `business_days.business_day`, `today_staff.business_day`, and `today_staff_planning.business_day`.

## 4. Bug & Resolution History

**Bug Summary:** Legacy routes used `new Date().toISOString().split('T')[0]`, which assigns Bangkok late-night transactions to the wrong calendar day.

**Validated Hypothesis:** UTC date extraction cannot represent the shop's 2:00 a.m. Bangkok reset boundary.

**Invalidated Hypotheses:** The issue is not a display formatting problem; persisted business-day labels are required for helper sorting and audit-safe reporting.

**Resolution:** Introduced a shared Bangkok business-day utility and wired ledger/planning contracts to use it.
