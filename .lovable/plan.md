

## Combined Plan: Data Proxy Expansion + Calendar Removal

### A. Data Proxy — Updated Actions

**File:** `supabase/functions/data-proxy/index.ts` — rewrite the switch block.

**Updated existing actions:**

| Old name | New name | Changes |
|---|---|---|
| `get_cards` | `get_todo_list` | Rename. Add required `user_id` filter, raise limit to 500, exclude archived |
| `get_people` | `get_people` | Keep name. Add `user_id` filter |
| `get_weekly_synthesis` | `get_weekly_synthesis` | Keep name. Add `user_id` filter |
| `get_daily_brief` | `get_daily_brief` | Keep name. Add `user_id` filter |

**New read actions:**

| Action | Table | Details |
|---|---|---|
| `get_texture` | `reflection_summaries` | Returns only `texture`, `period_start`, `period_type`. Params: `user_id` (required), `period_type` (optional, default "weekly") |
| `get_household` | `households` + `household_members` + `profiles` | Params: `user_id`. Returns household info and partner details |

**New write actions:**

| Action | Table | Details |
|---|---|---|
| `add_card` | `cards` | Insert a card. Params: `user_id`, `title`, `body`, `category`, `due_at`, `source` (default "companion") |
| `complete_card` | `cards` | Update status to "complete". Params: `card_id` |
| `archive_card` | `cards` | Update status to "archived". Params: `card_id` |
| `process_brain_dump` | calls `process-brain-dump` edge function | Params: `user_id`, `text`. Server-to-server fetch, returns resulting cards |

No `get_reflections` — raw transcripts stay private. Only synthesized texture is exposed.

---

### B. Remove Google Calendar Integration

**Delete 14 files:**
- `supabase/functions/google-calendar/index.ts`
- `supabase/functions/extract-event-details/index.ts`
- `src/hooks/useGoogleCalendar.ts`
- `src/hooks/useGoogleCalendarList.ts`
- `src/hooks/useBirthdaySync.ts`
- `src/components/GoogleCalendarView.tsx`
- `src/components/CalendarAgendaSheet.tsx`
- `src/components/CalendarEventSheet.tsx`
- `src/components/CalendarPlaceholder.tsx`
- `src/components/DesktopCalendarPanel.tsx`
- `src/components/ScheduleSheet.tsx`
- `src/components/calendar/CalendarHeader.tsx`
- `src/components/calendar/CalendarTimeGrid.tsx`
- `src/pages/GoogleCallback.tsx`

Also delete the deployed `google-calendar` and `extract-event-details` edge functions.

**Modify files:**

| File | Changes |
|---|---|
| `src/pages/Index.tsx` | Remove calendar imports, state, icon button, desktop sidebar, all calendar sheets |
| `src/components/HomeView.tsx` | Remove `calendarLoading` prop |
| `src/components/CardDetailSheet.tsx` | Remove calendar event creation UI and `useGoogleCalendar` import |
| `src/components/SettingsPage.tsx` | Remove calendar picker section |
| `src/pages/Onboarding.tsx` | Remove calendar step, reduce total steps by 1 |
| `src/hooks/useDailyPlan.ts` | Remove `calendarSummary` parameter |
| `src/App.tsx` | Remove `/google-callback` route |

Google OAuth sign-in stays (it's the auth method). DB columns like `google_access_token` remain unused — no migration needed.

---

### Execution order

1. Expand data-proxy with renamed + new actions
2. Delete calendar files and clean up imports

