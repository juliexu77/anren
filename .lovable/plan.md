# Threads — what's emerging across your notes

A new surface between Notes and Search. A Thread is emergent (anren notices it); a Project is intentional (you gather it). You never create a Thread.

```text
Notes  →  Threads  →  Projects  →  Reflect
raw       noticed      chosen      mirror
```

Sidebar order becomes: New thought · Notes · Threads · Search · Reflect · Projects list (unchanged below).

## What a Thread looks like

Not another list of AI summaries — each thread shows the evidence that made anren notice it.

```text
Protecting my energy
Showing up more lately · 6 notes over two weeks
"I don't want to be reachable all day"
"the coworking thing drains me"
Leaving tech · Wednesday coworking · friendship boundaries
                                     Make this a Project →
```

- Name in editorial serif, plain and in your own register.
- One quiet aliveness line: "showing up more lately", "you returned to this after three weeks", "quiet for a week".
- 2-3 actual phrases pulled from the notes — the reason it was noticed, in your words, not paraphrase.
- The notes themselves as small tappable rows underneath (collapsed to the first few).
- A single quiet action: **Make this a Project**, which creates the project and files those notes into it. No editing, no renaming, no deleting.

At most 3-6 active threads on the page, warmest first. Empty state before there's enough material: "Threads appear once a few thoughts start rhyming. Keep talking."

## How threads behave over time

anren re-reads recent notes on a cadence (at most once a day, and only after enough notes exist) and returns the handful of threads currently alive. Existing threads are matched by name so they **evolve** rather than duplicate: notes get added, the aliveness line updates, `last_seen` moves. A thread with no new notes for ~3 weeks goes dormant and drops off the page (kept in the table, not deleted). Two threads that collapse into one merge under the surviving name. A thread promoted to a Project is retired so it can't shadow the project.

## Note detail

The note screen gains a single quiet line under Related: "Part of: Protecting my energy" linking to the thread — so a note tells you which conversation it belongs to.

## Technical notes

**Data** — new `threads` table (`id, user_id, name, blurb, note_ids uuid[], quotes jsonb, status: active|dormant|promoted, project_id, first_seen_at, last_seen_at, created_at, updated_at`) with GRANTs to `authenticated`/`service_role`, RLS `auth.uid() = user_id`, index on `(user_id, status, last_seen_at desc)`. No changes to `notes`.

**Edge function** `notice-threads` — pulls the last ~60 ready notes (title, synthesis, recorded_at, project_id) plus the current active threads, asks Claude Sonnet 4.5 (existing `_shared/ai.ts` `chat`, same quota/own-key handling as `suggest-projects`) for 0-6 threads with `name`, `blurb`, `note_ids`, `quotes` (verbatim fragments, must appear in the source), and `merges_into` for consolidation. Upserts by lowercased name, marks stale threads dormant. Prompt inherits the voice rules from `suggest-projects`: no folder/organize/productivity language, second person, no diagnosis.

**Frontend** — `src/pages/Threads.tsx`, `src/components/ThreadCard.tsx`, `src/hooks/useThreads.ts` (load + daily refresh trigger modelled on `useProjectSuggestions`), route `/threads` in `src/App.tsx`, nav row in `src/components/ProjectRail.tsx` between Notes and Search. Promotion reuses the existing project-create + note-association path from `ProjectSuggestion`. Styling stays borderless editorial: serif names, muted Inter meta, clay for quotes and the promote action.

Reflect, Search, and the notes feed are untouched.
