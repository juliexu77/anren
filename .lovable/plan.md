

## Remove "scheduled" status — simplify to two states

### Current state audit

The database `cards.status` column currently holds three values:
- **active** — items with no due date
- **scheduled** — items with a due date (set by ScheduleSheet, brain dump, birthday sync)
- **complete** — done items

Now that there's no separate "In Motion" or "Overdue" section, **"scheduled" has no UI purpose**. Items with due dates already show the date as metadata in the row. The `dueAt` field is the source of truth for timing — the status is redundant.

### Changes

**1. Collapse `ItemStatus` to two values** (`shared/types/card.ts`)
- Remove `"scheduled"` from `ItemStatus` type → `"active" | "complete"`
- Update `mapStatus`: map `"scheduled"`, `"routed"`, `"inbox"` all to `"active"`

**2. Stop writing "scheduled" status** (3 files)
- `src/hooks/useCards.ts` (`addItems`): Remove the `hasFutureDue ? "scheduled" : "active"` logic — always use `"active"`. Keep setting `due_at` normally.
- `src/components/ScheduleSheet.tsx`: Change `status: "scheduled"` → `status: "active"` when linking to Google Calendar
- `src/hooks/useBirthdaySync.ts`: Change `status: "scheduled"` → `status: "active"` for birthday cards

**3. Simplify HomeView filter** (`src/components/HomeView.tsx`)
- `allItems` filter: remove `c.status === "scheduled"` check — just `c.status === "active"`
- Remove `onSchedule` from Props interface (leftover from before, still listed but unused in the merged view)

**4. Simplify orientation count** (`src/lib/dailyOrientation.ts`)
- Remove the separate `scheduled` filter — just count `active` items

**5. Remove `onSchedule` prop plumbing** (`src/pages/Index.tsx`)
- Stop passing `onSchedule` to `HomeView` if it's no longer in Props

### What stays
- `dueAt` field on cards — still tracks when something is due
- Date display in item rows — still shows "Mar 5" etc.
- ScheduleSheet — still works, just sets `dueAt` + `googleEventId` without changing status
- `complete` status — still used to hide finished items
- The `routed_type` / `ItemType` (`task`, `ongoing`, `event`) — unrelated to this, still used for labeling

### Files changed
- `shared/types/card.ts`
- `src/components/HomeView.tsx`
- `src/components/ScheduleSheet.tsx`
- `src/hooks/useCards.ts`
- `src/hooks/useBirthdaySync.ts`
- `src/lib/dailyOrientation.ts`
- `src/pages/Index.tsx` (remove leftover `onSchedule` prop if present)

