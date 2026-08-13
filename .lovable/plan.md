# What do I have going on in here?

Turn the Threads screen into a bird's-eye view of your mind-space: the areas you've deliberately made, and the material accumulating outside them.

## The screen

The sidebar entry stays **Threads** on the `/threads` route — only what's on the screen changes.

**1. Your projects**
Each project appears as a substantial block, not a sidebar row:

```text
✒  Writing concepts                      9 notes
    Deciding what the essay is about        Aug 11
    A better opening line                   Aug 9
    2 new since you last looked
    Open →
```

- Ordered by most recent activity, not sidebar position.
- Shows the 2 most recent notes inside, with dates, each a link to the note.
- "N new since you last looked" when notes arrived after your last visit to this screen (last-looked timestamp per project, kept locally).
- Empty projects show a single quiet line: "Nothing in here yet."

**2. Outside your projects**
Loose notes (no project) grouped by what anren noticed:

```text
Leaving tech · 3 notes
These seem to belong together
Gather into a project →

Parenting thoughts · 4 notes
These have been accumulating
Gather into a project →

2 other loose notes
Not enough connection yet.
```

- A grouping needs 2+ loose notes. Notes already inside a project are dropped from the grouping so nothing is double-counted.
- Second line is a plain read of the shape: "These seem to belong together" (recent/tight), "These have been accumulating" (spread over weeks), "You came back to this" (a gap then more).
- One action: **Gather into a project →** (existing promote path — creates the project, files the notes). Plus the quiet "Not this" dismissal already in place.
- Trailing line counts loose notes that landed in no grouping, and links to Notes.

**3. Empty states**
- No projects yet: "Nothing gathered on purpose yet — anren will point out what's clumping together."
- Nothing loose: "Everything you've kept has found a home."

Softness distinction is preserved: projects get emoji/glyph, a firmer heading and a hairline block; loose groupings stay lighter weight, provisional, with the gather action as the only commitment.

## Technical notes

- `src/pages/Threads.tsx`: rewritten as two sections; keeps `useThreads` plus a new `useProjectOverview` hook.
- New `src/hooks/useProjectOverview.ts`: per-project note count + 2 most recent notes (single `notes` query grouped client-side), and a `localStorage` map of last-looked timestamps per project id to compute "N new".
- New `src/components/ProjectOverviewCard.tsx` and a reworked `src/components/ThreadCard.tsx` (loose-only: filters `thread.notes` to notes with no `projectId`, hides groupings that fall under 2 notes, drops the "Already a Project" branch since project material now lives in section 1).
- `src/hooks/useThreads.ts`: `promote` unchanged; add derived loose-note counts so the "N other loose notes" line can be computed from all loose notes minus those in shown groupings (needs a count of loose notes, added to the hook).
- `src/components/ProjectRail.tsx`: nav label Threads → Overview.
- No schema or edge-function changes; `notice-threads` keeps producing the groupings.
