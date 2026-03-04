

## Google Calendar Parity Review

### What's already working
- Time grid with hour/half-hour lines ✓
- Event blocks positioned by time ✓
- Current time indicator ✓
- All-day events strip in `CalendarTimeGrid` ✓
- Month picker dropdown ✓
- Day chips for navigation ✓
- Swipe to change days ✓

### Gaps to fix

**1. Day label on top-left (like Google Calendar)**
Google Calendar shows the current day number prominently in the time gutter's top-left corner (e.g., a large "4" with "Tue" below it). Currently the sheet only shows "March 2026" as a title — there's no prominent day indicator next to the time gutter.

**Fix:** In `CalendarTimeGrid`, add a day-of-month label at the top of the time gutter column (large number + short weekday), styled like Google Calendar's top-left corner. This replaces the blank space above the hour labels.

**2. All-day events not visible from AgendaSheet**
The `CalendarTimeGrid` already has all-day event rendering logic (`getAllDayEvents` + the strip at the top), but it only shows when `hasAllDay` is true. This should already work — but the events fetched via `useGoogleCalendar` need to include all-day events (events with `start.date` instead of `start.dateTime`). The code handles both formats, so this should display correctly if the API returns them. No code change needed here — it's already implemented.

**3. Day chips should show day-of-week above the number (like Google Calendar)**
Currently chips show "Today" / "Tmrw" / "Mon" above the date number. This matches Google Calendar's style already. No change needed.

### Plan

**File: `src/components/calendar/CalendarTimeGrid.tsx`**
- Add a day header row above the time grid (between all-day strip and scrollable area)
- For single-day view: show large day number + weekday abbreviation in the gutter area, with "today" styling (circled/highlighted) if it's today
- For multi-day view: show day headers across columns
- Style: large day number (like Google Calendar's ~24px bold number), small weekday text above it, primary color circle behind it if today

**File: `src/components/CalendarAgendaSheet.tsx`**
- No changes needed — the day chips already serve as navigation and the month/year title is tappable

### Summary
One file to edit. Add a Google Calendar-style day header showing the weekday and large day number at the top of the time gutter, with today's date circled in the primary color.

