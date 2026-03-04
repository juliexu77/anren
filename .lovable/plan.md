## Onboarding: Revised Plan

### Two concerns to address first

**1. Calendar scope: "Which calendars?"**
The `calendarList` action already returns ALL calendars the user has access to — personal, family, shared school calendars, etc. Google Calendar API's `calendarList` endpoint returns every calendar visible to the user, regardless of ownership. So yes, shared school calendars, family calendars, and any subscribed calendars will appear. The onboarding step just needs to show all of them with checkboxes, not filter by type. No work/personal distinction needed from our side — the user simply picks which ones matter to them.

**2. Voice and copy direction**
Current copy issues spotted:

- HomeView line 138: "Empty your head" → needs replacing
- HomeView line 253: "Your mind is clear. Tap below to empty your head." → needs replacing  
- BrainDumpSheet line 192: header says "Empty your head" → needs replacing
- BrainDumpSheet line 103: toast "Added to your dump" → needs replacing

The voice should channel Mary Oliver / Rumi / David Whyte — contemplative, gentle, never clinical or productivity-speak. "Brain dump" and "empty your head" are out. The spirit is "set it down here" / "what are you holding?" / "let it rest."

---

### Plan

#### A. Fix app-wide copy (voice alignment)

**File: `src/components/HomeView.tsx**`

- Line 138: "Empty your head" → "clear your mind
  "
- Line 253: "Your mind is clear. Tap below to empty your head." → "Nothing resting here yet."

**File: `src/components/BrainDumpSheet.tsx**`

- Line 192 header: "Empty your head" → "Set it down"
- Line 103 toast: "Added to your dump" → "Heard you"
- Line 200 subtitle: "Speak or type freely. No structure needed." → "Say what's on your mind. I'll hold it."
- Line 207 placeholder: "Everything on your mind right now…" → "What's weighing on you…"

#### B. Onboarding flow (5 steps, value-first)

**New file: `src/pages/Onboarding.tsx**`
Multi-step full-screen page with thin progress bar at top.


| Step | Screen              | Auth? | Copy direction                                                                                                                                                              |
| ---- | ------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Welcome             | No    | "ANREN — Where the mental load rests." / "A quiet place for everything you're carrying." / [Begin]                                                                          |
| 2    | First capture       | No    | "What's one thing on your mind right now?" — single text input, saved to localStorage. Optional skip.                                                                       |
| 3    | Visual capture      | No    | "Notice something you want to hold onto?" — camera/photo prompt, saved to localStorage. Optional skip.                                                                      |
| 4    | Value bridge + Auth | Yes   | Shows count of held items. "Now let's anchor these to your day. Your calendar gives Anren the rhythm of your life." [Sign in with Google]                                   |
| 5    | Calendar prefs      | Yes   | "Which calendars feel like yours?" — checkboxes from `calendarList` API (personal, family, school, any shared). Toggle: "Hold birthdays and milestones from your contacts?" |


**New file: `src/hooks/useOnboarding.ts**`

- Manages step state, localStorage for pre-auth cards
- On auth: migrates localStorage cards → database
- Stores onboarding completion in profile

**New file: `src/hooks/useBirthdaySync.ts**`

- Calls `google-calendar?action=birthdays` (already exists)
- Creates cards with `source: 'birthday_scan'` for each birthday
- Deduplicates by name + approximate date against existing cards
- Birthdays are all-day events, not timed — creates cards with `due_at` set to the birthday date, no time component

**Modified: `src/App.tsx**`

- Add `/onboarding` route
- Unauthenticated users hitting `/` → redirect to `/onboarding` instead of `/auth`
- After onboarding completes → home

**Database migration:**

- Add to `profiles`: `selected_calendars text[] default ARRAY['primary']`, `birthdays_enabled boolean default false`, `onboarding_completed boolean default false`

#### C. Calendar selection logic

The `calendarList` endpoint returns all calendars the user can see — personal, family, shared (school, sports, etc.), subscribed. We show them all with their Google-provided display name and color swatch. The user checks the ones they want. Selected IDs are saved to `profiles.selected_calendars` and used when fetching events (the `list` action would be called once per selected calendar, or we update the edge function to accept a `calendarId` param).

**Modified: `supabase/functions/google-calendar/index.ts**`

- `list` action: accept optional `calendarId` param (defaults to `primary`). This allows fetching events from non-primary calendars.

#### D. Birthday scan details

When the user toggles "Hold birthdays and milestones":

1. Call `google-calendar?action=birthdays` (fetches next 365 days from contacts birthday calendar)
2. For each birthday returned, create a card: `{ title: "Sarah's birthday", source: "birthday_scan", due_at: "2026-06-15", category: "milestone" }`
3. These appear in "In motion" section on the home screen as they approach
4. Re-scan can happen weekly via the existing `send-daily-brief` edge function