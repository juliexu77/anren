# Project card polish and collapsible map

Three changes to the Home / Map surface.

## Project cards

- Remove the note count from the header. The meta label shows only "Active this week" when something has landed in the last seven days, and nothing otherwise.
- Let the project name take the available width so short titles like "Writing" and "This week's meals" stop being truncated. The meta label sits on the same row but wraps to its own line on narrow screens instead of squeezing the title.
- Empty projects still show "Nothing in here yet."

## Collapsible sections

- Make "Taking shape" and "Projects" collapsible sections, each with a header that toggles the body open/closed.
- "Taking shape" is expanded by default (this is the liminal space, the point of the page).
- "Projects" is collapsed by default (the user is here to see what is forming, not to manage already-claimed folders).
- "Recently on your mind" stays expanded as a simple list; it doesn't need its own toggle.
- Persist the user's collapse choices in `localStorage` so they stick across sessions.
- Use a small chevron or plus/minus treatment that matches the existing hairline, muted-text vocabulary.

## Technical notes

- Edit `src/components/ProjectOverviewCard.tsx` for the title and count changes.
- Add a reusable collapsible section component in `src/pages/Map.tsx` (or `src/components` if a natural abstraction exists) and wrap the "Taking shape" and "Projects" sections.
- Store the expanded state in `localStorage` under a key like `anren.mapSections`.
- No data changes; rely on existing `useThreads` and `useProjectOverview` data.
