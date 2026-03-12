

## Soft Exhale: Simplify the Home Screen

### What changes

**1. Rewrite Daily Orientation as a gentle note** (`src/lib/dailyOrientation.ts`)
- Remove all section headers ("Today:", "Holding:", "Coming up:")
- Remove bullet points — just flowing prose-like sentences
- Remove "(overdue)" labels entirely
- Remove the "Holding" preview and "Coming up" preview (these duplicate Resting Here)
- Keep: greeting, milestones, today's calendar events woven in naturally
- When nothing is happening: "Nothing pressing. A quiet day."
- The tone shifts from structured summary → a short, warm note about your day

Example output:
```
Good morning.

🎂 Mom's Birthday — Tomorrow

You have a call at 10:00 AM, then lunch with Sara.

3 things resting here whenever you're ready.
```

**2. Remove "In Motion" and Overdue/Due Today sections** (`src/components/HomeView.tsx`)
- Delete the unnamed overdue/dueToday block (lines 194–203)
- Delete the "In motion" section (lines 234–241)
- Remove the `scheduled`, `todayEvents`, `dueToday`, `overdue`, `upcoming` memos — no longer needed
- Merge scheduled items into the main list: combine `active` + `scheduled` (excluding parsing/failed) into one flat list, sorted by position
- Remove the `Section` component (no longer used)

**3. Soften "Resting here"** (`src/components/HomeView.tsx`)
- Remove the `CalendarClock` schedule button from item rows — scheduling still works from card detail
- Remove the `onSchedule` prop from `ItemRow`
- Increase spacing between sections (`space-y-5` → `space-y-6`)
- The collapsible keeps its current gentle copy ("I'll hold these for you")

**4. Move "Help me get organized" below the list** (`src/components/HomeView.tsx`)
- Reorder so it appears after Resting Here, not before — feels less pushy

### Files changed
- `src/lib/dailyOrientation.ts` — rewrite to prose-style output, remove Holding/Coming up/overdue
- `src/components/HomeView.tsx` — remove In Motion, overdue block, merge all items into one list, reorder organize button, soften spacing

