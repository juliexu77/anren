# Sidebar "New thought" button + note screen reorder

Two changes: adopt the solid dark "New thought" button from the mockup, and rebuild the note screen so your own words come first.

## 1. Sidebar: New thought as a solid button

Currently a hairline-outlined row in clay-rose. In the mockup it's a full-width, filled dark ink block with centered label.

- Full-width, filled dark ink surface (deep espresso, a token added to the palette — not black), ivory label, centered `+ New thought`, radius ~14px, generous padding.
- Keeps the existing route (`/`) and mobile rail close behavior.

What else is worth taking from that mockup (and what isn't):
- Worth it: the small clay star beside the **anren** wordmark; roomier vertical rhythm between nav rows; the dotted-border SUGGESTED block (already close to our ProjectSuggestion — nudge it to match).
- Skip: colored dots per project (we use hand-drawn ink glyphs on purpose), and the "FOLDERS" label — we say Projects now.

## 2. Note screen: your words outrank the AI

New order, top to bottom:

```text
back / project pill / … menu (destructive behind menu)
date · duration (editable, no bare pencil)
Title  (wraps, never clipped)
Your words / transcript      <- full, immediately below the title
Write-up  (subtle, collapsed by default)
Audio player
Related  (quiet, non-editorial)
Continue this note
Ask about this note
```

Specific fixes:
- **Title clipping** — title becomes a wrapping textarea-style field with right padding, so long titles run to a second line instead of off-canvas.
- **Body first** — the typed body / transcript block moves directly under the title, no section label shouting over it, set in the reading serif at full size (it's the content, not metadata grey).
- **Write-up loses its box** — no rounded card. Rendered as italic editorial text behind a thin clay left rule, under a quiet "Write-up" toggle that starts collapsed. Still editable when open.
- **Related quiets down** — regular Inter at a smaller size with muted colour, not display serif, so it can't read like more of your writing. Dates stay right-aligned.
- **Pencil icon** — removed. The date row itself is the affordance ("Change the date" on tap); the title edits in place.
- **Trash moves into the … menu** next to the project pill, with clear spacing from it, so no mis-taps.

Nothing changes in the data model, edge functions, or save behavior — this is layout, order, and typography only.

## Technical notes

- `src/components/ProjectRail.tsx`: restyle the New thought NavLink; add star to wordmark; loosen nav spacing.
- `src/index.css` + `tailwind.config.ts`: add an `ink` surface token pair for the filled button (no hardcoded colors).
- `src/pages/NoteDetail.tsx`: reorder JSX sections, replace the synthesis card with a collapsible rule-marked block (`Collapsible` from shadcn), swap title input for an auto-growing wrapping field, move delete into a dropdown, restyle Related rows.
