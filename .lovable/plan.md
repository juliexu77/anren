# One map: loose → taking shape → yours

Anren has too many peer concepts for a simple loop. Collapse to three places: capture, one map of your thinking, and retrieval.

```text
Notes (stream)  ·  Home = the map  ·  Search (plumbing)
loose  →  taking shape  →  projects
```

Sidebar becomes:

```text
+ New thought
Home        ← the map, at "/"
Notes
Search

PROJECTS
  Dream journal
  Writing concepts
  +

Settings
```

Reflect leaves the sidebar entirely, and so does "Threads" as a product noun — the map contains threads, projects and loose thoughts, so it isn't named after one of them. Being Home, it carries no page title at all: you open the app and see Taking shape → Projects → Recently on your mind.


## The map

One vertical surface, three tiers, where visual weight signals how formed something is. No section is labelled with our internal model.

```text
Taking shape

  Opening a café
  7 thoughts · since February
  ▤▤▤   the corner space · menu ideas · talking to my aunt…
  The corner space keeps coming up.
  See the pieces →    Make this a project →    Dismiss

  anren + relationships
  3 thoughts lately
  ▤▤    where AI could serve a relationship, not a person
  See the pieces →


Projects

  🌱 Writing concepts        12 notes · active this week
  🌙 Dream journal            6 notes

Recently on your mind

  Whole Foods run and Amazon return          Aug 13
  Something Caleb did this morning           Aug 12
  … (10 most recent unfiled notes)           see all notes →
```

- **Taking shape** leads. Each item gets a small stack of overlapping paper edges whose thickness grows with the number of notes — you watch your own thinking thicken. Name in editorial serif, one line of count-and-span ("7 thoughts · since February"), the note titles as a faint inline trail, and at most one observational line naming what literally recurs ("The corner space keeps coming up."). No interpretation, no diagnosis — if there's nothing concrete to point at, the line is omitted; the count and the pieces are already enough. "See the pieces" expands the note rows in place; "Make this a project" gathers them; "Dismiss" hides this proposed grouping and nothing more. anren never declares something a project on its own.
- **Projects** are the formed tier: stronger card container, glyph, count, last activity — what the current overview cards already do. They sit below because they no longer need discovering.
- **Recently on your mind** is the loose tier: ten most recent unfiled notes as bare typographic rows, almost no container, then "see all notes →".
- Empty states: nothing forming yet → "Nothing has started rhyming yet. Keep talking." No projects → single line, no card.

## Reflect goes away

Delete the Reflect destination, the weekly digest surface, and the standalone ask-your-notes chat. Reflection survives only where it's earned: inside a project, `Reflect on these notes` (unchanged). Search stays plain retrieval. `/reflect` and `/on-my-mind` redirect to the map.

## Taking a project with you

The primary action on a project is **Take this project with you** — one tap downloads `<project-name>.md`: project title, then every note in date order with its date, anren's summary, and your words, ready to hand to Claude or ChatGPT. The mechanism (Markdown) is named in the ••• menu as "Export as Markdown", not in the primary label. The promise is that you never have to reconstruct your thinking when you're ready to make something.


## Technical notes

**Removed** — `src/pages/Reflect.tsx`, `src/components/AskNotes.tsx`, `src/hooks/useLookBack.ts`, `ProjectSuggestion` on Reflect (the rail suggestion stays), the `weekly-digest` edge function invocation and its route; the `weekly_digests` table is left in place, unread. The thread link `/reflect?thread=…` becomes an in-card "See the pieces" expander instead.

**Map** — rewrite `src/pages/Threads.tsx` as the three-tier map. `ThreadCard.tsx` gains the paper-stack visual (2-4 stacked, rotated hairline rects sized by note count), the collapsed/expanded pieces list, and drops the reflect link; keeps the existing gather animation, "Add to <project>" suggestion, and dismiss. `ProjectOverviewCard.tsx` keeps its container, gains "active this week" phrasing from `lastActivityAt`. `useProjectOverview` additionally returns the 10 most recent loose notes for the bottom tier (it already fetches every note, so no new query). Thread copy tweaks: `blurb` is shown (it currently isn't) and the count reads "N thoughts · since <month>" from `firstSeenAt`.

**Rail** — `ProjectRail.tsx`: drop the Reflect NavLink and the `Sparkles` import.

**Export** — new `src/lib/exportProject.ts` builds the markdown string from notes already loaded by `useNotes(projectId)` (title, `recorded_at`, `synthesis`, `transcript`/`body`) and triggers a Blob download; small trigger in `src/pages/Index.tsx` header, visible only in a project. No backend work.

No database migrations and no edge-function changes in this plan.
