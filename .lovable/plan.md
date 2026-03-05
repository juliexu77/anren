

# Consolidate Hardcoded Styles into the Design System

## Problem
Across ~16 component files, styling is applied via inline `style={{}}` attributes with hardcoded `hsl(var(--text-muted))`, `hsl(var(--accent-1))`, `hsl(40 30% 97%)`, etc. instead of using Tailwind utility classes that reference the existing design system tokens. This means:
- Styles don't consistently respect theme changes
- Hardcoded values like `hsl(40 30% 97%)` (a cream white) won't adapt across themes
- The sanctuary depth tokens (`--sanctuary-surface`, `--glass-border`, etc.) aren't used everywhere they should be

## What Changes

### 1. Add Missing Tailwind Color Tokens
Add new color mappings in `tailwind.config.ts` so we can use classes like `text-text-muted`, `bg-surface`, `border-divider` instead of inline styles:
- `text-primary-color` → `hsl(var(--text))`  
- `text-secondary-color` → `hsl(var(--text-secondary))`
- `text-muted-color` → `hsl(var(--text-muted))`
- `surface` → `hsl(var(--surface))`
- `divider` → `hsl(var(--divider))`
- `accent-1` → `hsl(var(--accent-1))`
- `card-bg` → `hsl(var(--card-bg))`

### 2. Create Reusable Component Classes
Add Tailwind `@layer components` classes in `src/index.css` for repeated patterns:
- `.sanctuary-card` — the rounded-xl container with glass border, depth shadow, inner highlight
- `.sanctuary-btn` — action button with sanctuary surface styling  
- `.accent-btn` — primary action (currently hardcoded `hsl(var(--accent-1))` + `hsl(40 30% 97%)`)
- `.item-row` — the repeated item row with bottom divider border

### 3. Replace Inline Styles Across Components
Convert all `style={{}}` to Tailwind classes in these files:

| File | Issue |
|------|-------|
| **HomeView.tsx** | ~25 inline styles for colors, borders, backgrounds |
| **CardDetailSheet.tsx** | ~10 inline styles on suggestion box, buttons, text |
| **BrainDumpSheet.tsx** | ~15 inline styles, hardcoded `hsl(40 30% 97%)` on buttons |
| **ScheduleSheet.tsx** | Hardcoded `hsl(40 30% 97%)` on save button |
| **DailyBriefOverlay.tsx** | ~8 inline styles for backgrounds and text colors |
| **SettingsPage.tsx** | ~12 inline styles for labels, borders, inputs |
| **CalendarEventSheet.tsx** | Minor inline color styles |
| **CalendarAgendaSheet.tsx** | Inline styles on date chips and grid |
| **Onboarding.tsx** | ~15 inline styles, hardcoded accent colors |
| **NightSkyBackground.tsx** | Hardcoded gradient HSL values (needs theme-aware CSS vars) |
| **button.tsx** | `cta` variant has hardcoded `amber-400` and `rgba(212,175,55,...)` — should use accent tokens |

### 4. Fix the Worst Offender: Hardcoded `hsl(40 30% 97%)`
This cream-white is used as the text color on accent buttons in BrainDumpSheet, ScheduleSheet, and Onboarding. It should be `hsl(var(--accent-foreground))` or the Tailwind class `text-accent-foreground` so it adapts per theme.

## Files to Edit
1. `tailwind.config.ts` — add color token mappings
2. `src/index.css` — add `.sanctuary-card`, `.sanctuary-btn`, `.accent-btn` component classes
3. `src/components/HomeView.tsx` — replace all inline styles
4. `src/components/CardDetailSheet.tsx` — replace all inline styles
5. `src/components/BrainDumpSheet.tsx` — replace all inline styles
6. `src/components/ScheduleSheet.tsx` — replace inline styles
7. `src/components/DailyBriefOverlay.tsx` — replace inline styles
8. `src/components/SettingsPage.tsx` — replace inline styles
9. `src/components/CalendarEventSheet.tsx` — minor cleanup
10. `src/components/CalendarAgendaSheet.tsx` — replace inline styles
11. `src/pages/Onboarding.tsx` — replace inline styles
12. `src/components/ui/button.tsx` — replace hardcoded amber/rgba in `cta` variant
13. `src/components/ui/NightSkyBackground.tsx` — use CSS vars for gradient colors

