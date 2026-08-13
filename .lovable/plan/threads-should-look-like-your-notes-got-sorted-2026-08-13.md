# Threads should look like your notes got sorted

Threads stops reading as a feed of AI insight cards. Each thread becomes a small visual cluster: a name, a quiet count line, and the notes anren gathered tucked beneath it — then one action.

```text
Leaving tech
6 notes · active lately

  ┌ Why I left tech and what I'm doing now
  ├ Writing from a place of wholeness
  ├ What the corporate career promised
  └ Energy and work

  Gather into Project →
```

## What changes on the page

- **Hierarchy inverts.** Thread name → grouped notes → action. The AI blurb and the verbatim quotes stop being the body of the card. The blurb becomes at most one short muted line under the name (and is dropped entirely if it reads like interpretation); the quotes are removed from the surface.
- **Notes read as one physical group.** Indented under the name, tight row spacing (no dividers between rows), a single hairline vertical connector running the height of the group, and a very faint warm wash behind the group so it reads as a stack of paper rather than a list. Up to 5 notes shown, then a quiet "and 3 more" row in the same group.
- **Breathing room between groups.** Generous vertical space between threads, no borders around them, no card chrome. 3–6 groups max (already the query limit).
- **Softer than a Project.** Thread names stay editorial serif but a size below a Project heading, no glyph, no emoji, no colored tags — the visual weight says "loosely gathered".
- **Count line replaces the aliveness sentence.** Format: `6 notes · active lately` / `4 notes · growing` / `3 notes`, derived from the same recency signals already computed, just shortened.
- **Action line.** Single quiet clay link `Gather into Project →` with `Not this` beside it in muted type. When a project already exists whose notes overlap this thread, the line instead reads `Already a Project · Add 2 notes →` and files only the notes that aren't in it yet.

## Empty and loading states

Unchanged in copy, restyled to match the quieter page: "Threads appear once a few thoughts start rhyming. Keep talking."

## Technical notes

- `src/components/ThreadCard.tsx` — rewritten presentation: heading, one-line meta, grouped note stack with connector line and wash, action row. `aliveness()` collapses to a short `countLine()` helper. Quote rendering removed.
- `src/hooks/useThreads.ts` — the note lookup also selects `project_id` so each thread can tell whether its notes already live in one project; `promote` gains a branch that, when a matching project is found, associates the unfiled notes instead of creating a new project. Retires the thread the same way.
- `src/pages/Threads.tsx` — spacing between threads widened, `gap-8` → larger rhythm; "Look again" stays.
- `src/index.css` — one new component class for the cluster wash/connector so the treatment is a token, not inline hex. No new colors: uses `--paper-sunk` and `--hairline`.

No schema changes, no edge function changes.
