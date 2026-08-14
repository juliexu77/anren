# Collapsible project cards on the Map

Change the Projects section on the Map so the section itself stays open, but each individual project card is collapsed by default.

## Goals

- The "Projects" section on the Map is always visible/expanded.
- Each project card is collapsed by default, showing only its name, emoji, "new" dot, and "Active this week" label when applicable.
- Tapping the project header row expands the card to reveal its recent notes, "new since you last looked" meta, and the "Open →" link.
- Empty projects still show "Nothing in here yet." in the collapsed view.
- Persist which projects are expanded in `localStorage` so the state survives reloads.

## Current state

`src/pages/Map.tsx` wraps the entire "Projects" section in an `AccordionItem` that is collapsed by default. `src/components/ProjectOverviewCard.tsx` renders the full card content unconditionally.

## Proposed changes

1. **Map.tsx**: Remove the "Projects" section from the top-level accordion (or keep it permanently open). Render the project cards as a plain list.
2. **ProjectOverviewCard.tsx**: Add internal collapse state driven by the card header. Use a small chevron or plus/minus icon that matches the existing hairline/muted vocabulary. Keep the title row as the toggle.
3. **Persistence**: Store expanded project IDs in `localStorage` under a key like `anren.mapExpandedProjects`.
4. **Defaults**: All project cards start collapsed. The "Projects" section is open.

## Open questions

- Should the "Open →" link still be reachable when collapsed, or only visible when expanded?
- Should empty projects be allowed to expand, or stay fixed showing "Nothing in here yet."?
