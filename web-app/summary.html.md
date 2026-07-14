# Daily Summary Template Module Specification

## Header Section

**Overall Purpose:** `summary.html` and `summary.ejs` render the staff-facing Daily Summary page. The page preserves the daily finance, transaction, expense, end-day, and live shop status behavior while presenting it as a compact Thai-first operational snapshot. The top financial cards are clickable drill-down controls so a receptionist can see the most important state first, then open revenue, fee, expense, or profit details only when needed.

**End-to-End Data Flow:** The receptionist opens Daily Summary, the page loads `shared.js`, and `loadData()` refreshes transactions, expenses, roster data, and `appData.currentShopStatus` from the backend. `updateAllDisplays()` refreshes the compact summary cards, card detail containers, and current shop status. Revenue details render payment breakdown and transactions; fee details render masseuse earnings; expense details render expense rows; profit details render the revenue-minus-fees-minus-expenses formula. `updateCurrentShopStatus()` calls `loadCurrentShopStatus()`, reads the server-authoritative `/api/staff/current-status` payload, and renders rows into `#current-shop-status`. No page action mutates status data; the status endpoint is read-only.

## Module API & Logic Breakdown

### `#current-shop-status`
- **Purpose:** Container for the current shop status rows on Daily Summary.
- **Parameters / Props:** None. The element is populated by inline JavaScript.
- **Renders:** A loading message, error message, empty state, or one row per visible Today Staff member.
- **Raises / Throws:** None directly.
- **Usage & Logic Notes:** Must exist in both `summary.html` and `summary.ejs` so static and server-rendered Daily Summary pages stay mirrored.

### `#current-shop-status-summary`
- **Purpose:** Compact summary strip immediately under the Current Shop Status header.
- **Parameters / Props:** None. The element is populated by inline JavaScript.
- **Renders:** Free-now count, next free staff/time, and the next three free staff entries.
- **Raises / Throws:** None directly.
- **Usage & Logic Notes:** This gives reception the answer before scanning individual staff rows, especially when all staff are busy.

### `updateAllDisplays()`
- **Purpose:** Refreshes every Daily Summary visible data section.
- **Parameters / Props:** None.
- **Returns / Renders:** Updates summary cards, payment breakdown, staff performance, recent transactions, expenses, and current shop status.
- **Raises / Throws:** Propagates none intentionally; child renderers own their empty/error states.
- **Usage & Logic Notes:** Calls `await updateCurrentShopStatus()` so the status snapshot refreshes with the rest of the Daily Summary data loop.

### `toggleSummaryDetail(section)` and `handleSummaryCardKey(event, section)`
- **Purpose:** Opens or closes one compact summary-card detail panel at a time.
- **Parameters / Props:** `section` string, required; one of `revenue`, `fees`, `expenses`, or `profit`. `event` KeyboardEvent, required for keyboard activation.
- **Returns / Renders:** Shows the selected `.summary-card-detail`, hides the other detail panels, toggles `.is-open` on the owning card, toggles `.has-open-detail` on the finance grid, and temporarily hides the other summary cards with `.is-dimmed`.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** Card details are inline so the top cards remain compact by default. When a detail is open, that card becomes the focused full-width finance panel because the user has explicitly asked for that section's details. Keyboard handling supports Enter and Space for accessibility.

### `toggleFinanceSection()`
- **Purpose:** Collapses or expands the full Daily Summary finance block.
- **Parameters / Props:** None.
- **Returns / Renders:** Toggles `#summary-finance-content.hidden` and switches the Thai toggle text between `ซ่อน` and `แสดง`.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** This lets the receptionist move Current Shop Status upward without losing access to the financial cards.

### `formatStatusTime(value)`
- **Purpose:** Formats ISO timestamps from the backend status payload into Bangkok HH:mm display strings.
- **Parameters / Props:** `value` string, required.
- **Returns / Renders:** Thai locale 24-hour time string, or `-` when no value is present.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** Used for requested booking display. Busy-end display uses the backend-provided `busy_until` string when available.

### `getStatusLabel(row)`
- **Purpose:** Converts backend `current_state` values into Thai-first labels.
- **Parameters / Props:** `row` object, required.
- **Returns / Renders:** One of `กำลังนวด`, `มีจองใกล้ถึง`, or `ว่าง`.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** The backend owns state calculation; the template only translates it for display.

### `getStatusDetail(row)`
- **Purpose:** Builds the detail lines for each current status row.
- **Parameters / Props:** `row` object, required.
- **Returns / Renders:** An object with `primary` and `secondary` Thai-first detail lines. Busy rows show booked/start time, massage end time, free-again time after buffer, and remaining minutes. Booking rows show booking start/end and usable minutes before the booking. Free rows show clear available copy.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** Uses `busy_started`, `busy_until`, `free_at`, `remaining_minutes`, `next_booking.scheduled_start`, `next_booking.scheduled_end`, and `usable_minutes_before_booking` from the backend payload.

### `renderStatusSummary(staffRows)`
- **Purpose:** Builds the status summary strip above the detailed staff rows.
- **Parameters / Props:** `staffRows` array, required; each row follows the `/api/staff/current-status` staff contract.
- **Returns / Renders:** Populates `#current-shop-status-summary` with Thai-first cards for `ว่างตอนนี้`, `คนถัดไปว่าง`, and `สามคนถัดไป`.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** Available staff count uses `current_state === 'available'`. Future free times use busy rows with `free_at`/`free_at_iso`, sorted earliest first.

### `escapeStatusHtml(value)`
- **Purpose:** Escapes server-provided status values before inserting current-status rows with `innerHTML`.
- **Parameters / Props:** `value` string/number/null, optional.
- **Returns / Renders:** HTML-safe string with `&`, `<`, `>`, `"`, and `'` escaped.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** This helper is scoped to the new status renderer so staff names, states, error strings, counts, and generated detail lines cannot inject markup.

### `updateCurrentShopStatus()`
- **Purpose:** Fetches and renders the Daily Summary status snapshot.
- **Parameters / Props:** None.
- **Returns / Renders:** Populates `#current-shop-status` with stable rows showing staff name, current label/detail, and `นวดวันนี้` count.
- **Raises / Throws:** None to the page. API failures render an inline Thai-first error state.
- **Usage & Logic Notes:** Calls `loadCurrentShopStatus()` from `shared.js`, which delegates to `api.getCurrentShopStatus()`.

### `updateMasseusePerformance()`
- **Purpose:** Renders the fee-card drill-down table for per-masseuse services, revenue, and fees.
- **Parameters / Props:** None.
- **Returns / Renders:** Populates `#masseuse-performance`.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** Reads `transaction.masseuseFee`; using the misspelled legacy `masseuseeFee` field here produces `฿NaN` in the UI and is forbidden.

### `escapeSummaryHtml(value)`
- **Purpose:** Escapes API-backed expense descriptions before they are inserted into the expenses drill-down table.
- **Parameters / Props:** `value` string/number/null, optional.
- **Returns / Renders:** Returns HTML-safe text.
- **Raises / Throws:** None.
- **Usage & Logic Notes:** The stored `expense.description` is the display source of truth. Page-local aliases are forbidden because every page that consumes the expenses API must show the same description.

## Dependency Mapping

### Upstream Dependencies (Inputs)
- **Calling Modules/Services:** Browser page load, `DOMContentLoaded`, and page refresh loops invoke `loadData()` / `updateAllDisplays()`.
- **Input Data Contracts / Schemas:** `appData.currentShopStatus` follows `{ business_day, generated_at, buffer_minutes, staff: [{ staff_id, position, masseuse_name, queue_status, current_state, busy_started, busy_started_iso, busy_until, busy_until_iso, free_at, free_at_iso, remaining_minutes, today_massages, next_booking, usable_minutes_before_booking }] }`.

### Downstream Dependencies (Outputs)
- **Called Modules/Services:** `shared.js` (`loadCurrentShopStatus()`), `api.js` (`getCurrentShopStatus()`), `backend/routes/staff.js` (`GET /api/staff/current-status`), and CSS classes in `styles.css`.
- **Output Data Contracts / Schemas:** DOM rows with `.summary-status-row`, state modifiers `.summary-status-busy` and `.summary-status-booking_buffer`, `.summary-status-main`, `.summary-status-pill`, and `.summary-status-count`. Daily Summary does not render Today Staff queue numbers or `คิวถัดไป`.

## Bug & Resolution History

### Bug Summary: Daily Summary Did Not Show Live Shop Status (2026-07-13)
The Daily Summary page had financial totals and daily lists, but the receptionist still had to infer live operating status from Today Staff, New Customer recent transactions, and booking information.

### Validated Hypothesis
Daily Summary is the right surface for an overall shop snapshot as long as existing summary sections remain intact and the backend supplies one read-only status contract.

### Invalidated Hypotheses
- A separate status page was required.
- The recent transaction list near New Customer answered busy duration and next-booking constraints.
- The Daily Summary UI should replace the Today Staff order view.

### Resolution
Added a Thai-first Current Shop Status section to both Daily Summary templates and wired it to the server-authoritative status endpoint while preserving existing Daily Summary sections.

### Bug Summary: Financial Sections Were Too Tall and Duplicated (2026-07-13)
The top Daily Summary cards were large stacked blocks, while payment and masseuse breakdowns appeared again as large always-open lower sections. This pushed Current Shop Status too far down the page and made the screen feel like unrelated blobs instead of a single operational summary.

### Validated Hypothesis
The page needed compact top-level decision cards with inline drill-down details. This keeps status visible quickly while preserving every detail behind a clear tap target.

### Invalidated Hypotheses
- Larger cards were easier for staff to understand.
- Payment and fee tables needed to stay as separate always-open sections.
- English-first section headers were acceptable on this staff-facing page.

### Resolution
The four top financial cards now use Thai-first labels, compact sizing, and inline expandable details. Payment breakdown and transactions live under revenue; per-masseuse fees live under fees; expenses live under expenses; and net profit shows the calculation formula. Opening one detail card turns it into the full-width focused finance panel and hides the other three cards until the selected card is clicked again. The fee table now reads `masseuseFee` and no longer renders `฿NaN`.

### Bug Summary: Current Status Looked Like Today Staff Queue (2026-07-13)
The status rows showed `#1`, `#2`, and `คิวถัดไป`, which made Daily Summary look like the Today Staff ordering page instead of a live status page.

### Validated Hypothesis
Daily Summary should group staff by current operational state and show timing facts: booked/start time, massage end time, free-again time after buffer, booking windows, and today's massage count.

### Invalidated Hypotheses
- Roster position was the right first visual anchor.
- `คิวถัดไป` belonged on the Daily Summary status view.
- A single busy-until line was enough for reception to understand the state.

### Resolution
The renderer no longer displays queue numbers or `คิวถัดไป`. Busy rows show booked/start time, massage end time, free-again time, and remaining minutes; booking rows show booking windows; free rows state they can receive customers.

### Bug Summary: Preview Expense Seed Names Leaked Into Daily Summary (2026-07-13)
The preview database retained seeded descriptions with the `DAILY_SUMMARY_STATUS_DEMO_V1 -` marker. Daily Summary hid that problem with page-local aliases to `Oil` and `Big C`, while New Customer correctly rendered the raw API values. The two pages therefore presented different descriptions for the same expense rows.

### Validated Hypothesis
The database values, not the New Customer API path, were stale. The Daily Summary-only transformation masked those stale values and created two presentation sources of truth.

### Invalidated Hypotheses
- New Customer was using hard-coded expense data.
- New Customer was connected to a different database.
- Editing an expense on Daily Summary had already persisted the replacement description.

### Resolution
The two preview expense rows were updated at their data source to `Big C` and `Oil`. The Summary-only alias helper was removed, and both mirrored templates now escape and render `expense.description` directly so all pages reflect the same API/database value.

### Bug Summary: Current Status Could Show Staff Free Too Early (2026-07-14)
Current Shop Status derived active massage windows from transaction creation time plus duration, even though New Customer and booking arrival can submit canonical service start/end datetimes.

### Validated Hypothesis
Daily Summary correctly delegated to `/api/staff/current-status`; the backend status endpoint lacked canonical transaction timing fields and therefore used the wrong source for busy-end calculation.

### Invalidated Hypotheses
- The Daily Summary renderer needed to recompute end times in the browser.
- The legacy `staff_roster.busy_until` field should become the status source.
- Booking buffer rules alone caused the early-free display.

### Resolution
The backend now persists `transactions.start_datetime` and `transactions.end_datetime` and Current Shop Status prefers those canonical fields, falling back to `timestamp + duration` only for legacy rows.
