

## Fix Calendar Sheet: black background, missing close button, scroll broken

### Root cause analysis

**Black background**: In `sheet.tsx` line 58, the background is set via `style={{ background: 'hsl(var(--bg))' }}` but then `{...props}` spreads after it. Since `CalendarAgendaSheet` passes `style={{ overflow: 'hidden' }}`, React replaces the entire style object — the background is lost, resulting in no background (appears black).

**Missing close button**: The class `[&>button:last-child]:hidden` hides the Radix close button, but there's no other X button since it was removed in a previous edit.

**Can't scroll**: The `overflow: hidden` applied via the style prop override is clobbering the inner layout. The `CalendarTimeGrid` has `overflow-y-auto` on its scroll container, but the parent's `overflow: hidden` style combined with the flex layout isn't allowing proper height calculation.

### Plan

#### 1. `src/components/CalendarAgendaSheet.tsx`
- Remove `[&>button:last-child]:hidden` from SheetContent className — restore the default X close button
- Remove the `style={{ overflow: 'hidden' }}` prop entirely — let the flex layout and inner `overflow-y-auto` handle scrolling naturally
- Keep `h-[100dvh]`, `p-0`, `flex flex-col` which are correct

#### 2. No changes to `CalendarTimeGrid.tsx` or `sheet.tsx`
The time grid's scroll container (`overflow-y-auto` on line 137) is correct. Once the parent stops overriding the background/overflow, scrolling should work.

### Result
- Sheet gets proper themed background from `sheet.tsx`
- X button appears in top-right corner
- Time grid scrolls vertically as expected

