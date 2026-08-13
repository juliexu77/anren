# Sidebar "New thought" button + note screen reorder

Two changes: adopt the solid dark "New thought" button from the mockup, and rebuild the note screen so your own words come first.

## 1. Sidebar: New thought as a solid button

Currently a hairline-outlined row in clay-rose. In the mockup it's a full-width, filled dark ink block with centered label.

- Full-width, filled dark ink surface (deep espresso, a token added to the palette — not black), ivory label, centered `+ New thought`, radius ~14px, generous padding.
- Keeps the existing route (`/`) and mobile rail close behavior.

What else is worth taking from that mockup (and what isn't):
- Worth it: the small clay star beside the **anren** wordmark; roomier vertical rhythm between nav rows; the dotted-border SUGGESTED block (already close to our ProjectSuggestion — nudge it to match).
- Skip: colored dots per project (we use hand-drawn ink glyphs on purpose), and the "FOLDERS" label — we say Projects now.

## 2. Note screen: two tabs, Granola-style

The note becomes two views of the same thought, switched by a quiet underlined tab pair — no cards, no boxes.

```text
‹ Notes
Mural wall concept                (large editorial serif, wraps freely)
Notes | Your words                (tab pair, clay underline on active)
─────────────────────────────────
  · Go more abstract this time…   (synthesis, bulleted, editorial serif)
  · Something felt, not read…
Today · 8:14 PM · cleaned up by anren
```

**Notes tab (default)** — the AI write-up, set in editorial serif at reading size, rendered as clay-dotted bullets when the write-up comes back as points, plain paragraphs otherwise. Still editable in place. Footer line: `Today · 8:14 PM · cleaned up by anren`.

**Your words tab** — the raw transcript (or your typed body) in italic editorial serif, muted, exactly as spoken. Footer line: `Today · 8:14 PM · exactly as you said it`. The audio player lives here too.

Below the tab panes (outside the tabs, always visible): Related, Continue this note, Ask about this note.

Fixes carried in with it:
- **Title clipping** — title becomes a wrapping auto-growing field with right padding, so long titles run to a second line instead of off-canvas.
- **Write-up loses its box** — the rounded grey container is gone; the synthesis is just type on paper.
- **Related quiets down** — regular Inter at a smaller size, muted, not display serif, so it can't read like more of your writing. Dates stay right-aligned.
- **Pencil icon** — removed. Tapping the footer date row is the way to change the date; the title edits in place.
- **Header** — `‹ Notes` on the left; the project pill and delete move into a single `…` menu on the right, so trash can't be mis-tapped.

To honour the journaling instinct: the app remembers which tab you last chose per session, so if you prefer your own words first, it stays there.

Nothing changes in the data model, edge functions, or save behavior — this is layout, order, and typography only.

## Technical notes

- `src/components/ProjectRail.tsx`: restyle the New thought NavLink; add star to wordmark; loosen nav spacing.
- `src/index.css` + `tailwind.config.ts`: add an `ink` surface token pair for the filled button (no hardcoded colors).
- `src/pages/NoteDetail.tsx`: restructure into a `Tabs` pair (shadcn `Tabs`, restyled to underline-only), title becomes an auto-growing textarea, synthesis card removed, bullet rendering when synthesis lines start with `-`/`•`, delete moves into a dropdown, Related restyled, tab choice persisted in `sessionStorage`.

