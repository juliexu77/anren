# Project cards: let the name breathe

Two small fixes to the project cards on Home.

## What changes

- Drop the note count. The meta line shows only "Active this week" when the project has had something land in the last seven days, and nothing at all when it hasn't.
- Give the project name the room it needs so titles like "Writing" and "This week's meals" stop being cut off after a few characters. The name takes the available width; the short meta label sits after it and wraps to its own line on narrow screens instead of squeezing the title.
- Projects with nothing in them still say "Nothing in here yet."

## Technical notes

In `src/components/ProjectOverviewCard.tsx`:

- Replace the `{count} note{s}` + `· active this week` span with a conditional "Active this week" label rendered only when `active` is true.
- Fix the header layout so the title link is `flex-1 min-w-0` and the meta label no longer competes for space: use a wrapping flex row (`flex-wrap`) with the label allowed to drop below the title on small widths, keeping `truncate` only as a last resort for very long names.
- No data or hook changes; `count` stays in the overview data for the empty-state check.
