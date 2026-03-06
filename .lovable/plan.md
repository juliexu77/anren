

# Sanctuary Visual Review — Remaining Issues

## Current State
After reviewing all screens and components, the design system consolidation is mostly working — `.sanctuary-card`, `.sanctuary-btn`, `.accent-btn`, `.item-row` classes are in place, and most components use Tailwind tokens. However, several components still have **hardcoded inline `style={{}}` attributes** and inconsistencies that break the sanctuary feel.

## Issues Found

### 1. NightSkyBackground — Hardcoded fog HSL values (not theme-aware)
`NightSkyBackground.tsx` lines 69-74 use hardcoded `hsl(35 25% 80%)`, `hsl(30 20% 75%)` etc. for fog gradients. These warm cream tones look wrong on Forest, Ink, or Mustard themes. Should derive fog colors from `var(--text-muted)` or `var(--surface)`.

### 2. CalendarAgendaSheet — Heavy inline styles throughout
Lines 99-208 contain ~15 inline `style={{}}` blocks for chip backgrounds, text colors, month picker buttons. Uses `hsl(var(--primary) / 0.15)`, `hsl(var(--text) / 0.4)` etc. as inline styles rather than Tailwind classes.

### 3. CalendarTimeGrid — Inline styles for events and time indicator
Lines 154-227 use inline `style={{}}` for event blocks (`hsl(var(--primary) / 0.2)`), border-left colors, and the current-time indicator. Also uses `text-muted-foreground` and `text-foreground` (old Tailwind tokens) instead of `text-text-muted-color` / `text-text-primary`.

### 4. VoiceRecorder — Fully unstyled with inline HSL
Lines 111-163 use inline `style={{}}` for backdrop, card background, border. Uses old tokens like `text-muted-foreground`, `bg-muted/30`, `bg-destructive/20`. No sanctuary depth applied — feels like a generic modal, not a sanctuary space.

### 5. Auth page — Old tokens, no sanctuary feel
Uses `text-foreground`, `text-muted-foreground` instead of design system tokens. The sign-in page is the first thing returning users see and should feel grounded.

### 6. Onboarding Step 3 — Mic button has inline `style={{}}` with hardcoded HSL
Lines 351-373 use inline styles for the mic button background (`hsl(0 70% 55% / 0.15)`, `hsl(var(--accent) / 0.12)`). The recording state uses red/destructive tones which contradict the "no anxiety" principle.

### 7. SettingsPage — Theme swatches use inline `style={{}}` (acceptable)
The theme picker buttons at lines 223-237 use inline styles to preview each theme's actual colors — this is intentionally dynamic and should stay. However, the Account section (line 77) uses `border-border` and `text-foreground` instead of sanctuary tokens.

### 8. CardDetailSheet — Uses old Tailwind tokens
Lines 131-178 use `text-foreground/70`, `text-muted-foreground/60`, `text-foreground/90`, `text-muted-foreground/40` — these should be `text-text-primary`, `text-text-muted-color`, `text-text-secondary-color`.

### 9. Extension Onboarding — Separate CSS, not in scope
`ExtensionOnboarding.tsx` uses its own CSS classes (`onboarding-btn-primary`, etc.) which is expected for the Chrome extension context.

## Plan

### Files to Edit

1. **`src/components/ui/NightSkyBackground.tsx`** — Replace hardcoded fog HSL values with CSS variables derived from theme. Add new vars `--fog-color` in `index.css` that themes can override.

2. **`src/components/CalendarAgendaSheet.tsx`** — Replace all inline `style={{}}` with Tailwind classes using the design system tokens. Convert chip selected/unselected states, month grid button styles.

3. **`src/components/calendar/CalendarTimeGrid.tsx`** — Replace inline styles for event blocks and time indicator with Tailwind classes. Swap old tokens (`text-muted-foreground`, `text-foreground`) for sanctuary tokens.

4. **`src/components/VoiceRecorder.tsx`** — Restyle as a sanctuary overlay. Replace inline styles with sanctuary tokens. Use `bg-bg-color/90` backdrop, `sanctuary-card` for the modal, `sanctuary-btn` for controls. Remove red/destructive recording colors in favor of the accent color.

5. **`src/pages/Auth.tsx`** — Replace `text-foreground`, `text-muted-foreground` with `text-text-primary`, `text-text-muted-color`. Use `accent-btn` class for the sign-in button instead of Button variant="cta".

6. **`src/pages/Onboarding.tsx`** — Replace inline mic button styles with Tailwind classes using accent tokens instead of hardcoded red for recording state.

7. **`src/components/CardDetailSheet.tsx`** — Swap all `text-foreground/*`, `text-muted-foreground/*` references to `text-text-primary`, `text-text-secondary-color`, `text-text-muted-color`.

8. **`src/components/SettingsPage.tsx`** — Minor: swap `text-muted-foreground` → `text-text-muted-color`, `text-foreground` → `text-text-primary`, `border-border` → `border-divider-color/25` in Account section.

9. **`src/index.css`** — Add `--fog-color` CSS variable (derived from theme surface) for the NightSkyBackground fog layer.

10. **`src/contexts/ColorThemeContext.tsx`** — Add `--fog-color` to theme derivation so fog adapts per theme.

