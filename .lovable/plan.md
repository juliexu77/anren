

## Three-tab nav: HOME · MIND · ENERGY

### Tabs

1. **HOME** (default) — `WeeklyReview` component (already drafted in `src/components/WeeklyReview.tsx`). The "you've been seen" weekly life review built from existing reflections + digest + cards data.
2. **MIND** — Existing `HomeView` (Run My Day + active items list).
3. **ENERGY** — Reflection patterns content (currently at `/patterns`), embedded inline.

### Bottom nav

Fixed bottom bar, three text-only buttons in all-caps. No icons.
- `text-label uppercase tracking-[0.2em]`, `py-4`, full-width split in thirds
- Active: `text-foreground` + 1px underline
- Inactive: `text-text-muted-color`
- Subtle top border (`border-divider-color`), backdrop blur, safe-area aware (`pb-[env(safe-area-inset-bottom)]`)
- Main content gets `pb-24` so nav doesn't cover it

### HOME tab feel

Uses only existing data — no new integrations:
- `useReflections` (last 7 days: textures, energy givers/drainers, threads)
- `useReflectionDigest` (weekly + monthly AI synthesis)
- `useCards` (completed this week, overdue/pressing)

Sections (Cormorant for felt lines, Inter muted for lists, no metrics, no red):
- Header: `Weekly life review` micro-label + date range (e.g. "Apr 9–Apr 16")
- **The arc** — digest texture in italic serif + what created it; falls back to date-stamped daily textures
- **What's working** — energy givers (deduped, `+` prefix) + count of items moved this week
- **The friction points** — energy drainers (`−` prefix) + pressing/overdue threads
- **The pattern underneath** — digest's recurring patterns, or unresolved threads
- **What this reveals** — digest's `what_this_reveals` in italic serif
- Closing: gentle muted italic line

Empty state: single contemplative line ("Your week will take shape here as you move through it.")

### Files

1. **`src/pages/Index.tsx`** — Add `activeTab` state (`"home" | "mind" | "energy"`, default `"home"`). Conditionally render the three views. Add fixed bottom nav. Remove top-right Orbit icon (replaced by ENERGY tab); keep Users (address book) + Settings in top header. Add `pb-24` to content wrapper.

2. **`src/components/EnergyView.tsx`** (new) — Extract body of `src/pages/Patterns.tsx` (reflections list + digest sections) into a chrome-less reusable component.

3. **`src/pages/Patterns.tsx`** — Redirect `/patterns` → `/` (Energy tab) so old deep links still work; or render `<EnergyView />` inside existing page chrome. Going with redirect for simplicity.

4. **`src/components/WeeklyReview.tsx`** — Already exists; polish during build if needed.

### Out of scope

No new data sources (Whoop, calendar, glucose). HOME runs strictly off existing reflection + card data; richer integrations come later.

