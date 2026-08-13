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
- Two quiet actions only: **Make this a Project**, which creates the project and files those notes into it, and a small **Not this** dismiss. No renaming, no editing, no thread detail page.

**Not this** sets the thread to `dismissed` and it leaves the page immediately. anren won't re-raise a near-identical thread for a few weeks (checked by embedding-free similarity on the name plus overlap of its note set), so a wrong inference can't sit there feeling authoritative.

At most 3-6 active threads on the page, warmest first. Empty state before there's enough material: "Threads appear once a few thoughts start rhyming. Keep talking."

## How threads behave over time

Each thread has a **stable id**. When anren re-reads the notes (at most once a day, only once enough notes exist) it is given the active threads *with their ids*, and every cluster it returns must declare either `existing_thread_id` or `"new"`. Matching never happens on the name — so a thread can be renamed by the model as it clarifies ("Protecting my energy" → "Protecting my time") and still be the same thread, gaining notes, an updated blurb, and a moved `last_seen_at`.

A thread with no new notes for ~3 weeks goes dormant and drops off the page (kept in the table, not deleted). Merges are also by id: `merges_into: "<thread_id>"` folds one thread's notes into the survivor and retires the absorbed one. A thread promoted to a Project is retired so it can't shadow the project.

## Note detail

The note screen gains a single quiet line under Related: "Part of: Protecting my energy" linking to the thread — so a note tells you which conversation it belongs to.

## Technical notes

**Data** — new `threads` table (`id uuid pk, user_id, name, blurb, note_ids uuid[], quotes jsonb, status text: active|dormant|dismissed|promoted|merged, merged_into uuid, project_id, first_seen_at, last_seen_at, dismissed_at, created_at, updated_at`) with GRANTs to `authenticated`/`service_role`, RLS `auth.uid() = user_id`, index on `(user_id, status, last_seen_at desc)`. No changes to `notes`.

**Edge function** `notice-threads` — pulls the last ~60 ready notes (id, title, synthesis, recorded_at) plus active threads **as `{ id, name, note_ids }`** and recently dismissed threads as a do-not-resurface list. Asks Claude Sonnet 4.5 (existing `_shared/ai.ts` `chat`, same quota/own-key handling as `suggest-projects`) for 0-6 clusters:

```text
{ "threads": [ {
    "existing_thread_id": "<uuid>" | null,   // null means new
    "name": "...", "blurb": "...",
    "note_ids": ["<uuid>", ...],
    "quotes": ["verbatim fragment", ...],
    "merges_into": "<uuid>" | null
} ] }
```

Server-side: ids are validated against the user's own rows (unknown ids are treated as new, never trusted blindly); `existing_thread_id` updates that row in place including its name; `merges_into` unions note ids into the target and marks the absorbed row `merged`; active threads the model didn't return and that haven't gained notes in ~3 weeks go `dormant`; clusters resembling a recent dismissal are dropped. Prompt inherits the voice rules from `suggest-projects`: no folder/organize/productivity language, second person, no diagnosis, quotes must appear verbatim in the source.

**Frontend** — `src/pages/Threads.tsx`, `src/components/ThreadCard.tsx`, `src/hooks/useThreads.ts` (load, daily refresh trigger modelled on `useProjectSuggestions`, `promote`, `dismiss`), route `/threads` in `src/App.tsx`, nav row in `src/components/ProjectRail.tsx` between Notes and Search (Projects stay below; Search remains global utility). Promotion reuses the existing project-create + note-association path from `ProjectSuggestion`. Styling stays borderless editorial: serif names, muted Inter meta, clay for quotes and the promote action; "Not this" is muted, never red.

Out of V1 on purpose: thread detail pages, graphs, relationship maps, related-threads, permanent thread history. Reflect, Search, and the notes feed are untouched.
