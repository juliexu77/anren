# Patterns: short write-ups anren offers you, unprompted

Ask waits for a question. Patterns doesn't. It's a small stack of written observations drawn across everything you've kept — each one a named pattern with a few sentences of reading and the notes it rests on. You open it to see what anren has been noticing, not to query anything.

Deliberately open-ended: it surfaces patterns without committing to a frame (energy, decisions, moods). Once you've lived with it a week, we can narrow it.

## What you see

New sidebar item **Patterns**, directly above Ask.

```text
Patterns
  Last read across 34 notes · 2 days ago      Look again

┌─ competence becoming responsibility
│  The moment you understand what's wrong in a room, you become the
│  one expected to fix it. It happens in three different settings here,
│  and each time you describe it as something that happened to you
│  rather than something you agreed to.
│  "…and then somehow it was mine to sort out"
│  Tuesday call · Studio note · Sunday walk
└─

┌─ rules arriving too late
│  …
└─
```

Each card:
- A lowercase title naming the pattern — a shape or dynamic, not a topic.
- 2-4 sentences of reading, editorial serif, second person.
- One verbatim line from a note, quiet and indented, when there's a good one.
- The notes it rests on, as underlined links.
- Nothing to configure, no counts, no scores.

Rules that keep it honest:
- A pattern needs at least two notes. One-note cleverness is dropped server-side.
- 3-6 cards. Fewer if the notes genuinely don't support more; the page says so plainly rather than padding.
- Quotes must appear verbatim in a note or they're dropped.
- Under 8 notes total, the page shows a single quiet line: nothing has repeated enough to read yet.

## When it runs

- Cached: opening the page shows the last reading instantly.
- Recomputes on open when the reading is older than 24 hours or 3+ notes have landed since. Otherwise it stands.
- "Look again" forces a fresh pass.
- Same voice rules as the rest of anren: no productivity language, no therapy voice, no throat-clearing, no invented details.

## Technical notes

New table `public.patterns`:
`id`, `user_id`, `title`, `reading`, `quote` (nullable), `note_ids uuid[]`, `position int`, `notes_analyzed int`, `computed_at timestamptz`, `created_at`. RLS `auth.uid() = user_id` for all commands, plus `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role`. A pass deletes the user's existing rows and inserts the new set, so the table always holds the current reading.

New edge function `supabase/functions/notice-patterns/index.ts`:
- Auth from the caller's header, same shape as `home-note`.
- Pulls up to 60 recent ready notes (title, synthesis, transcript excerpt, recorded_at) plus project and thread names for shared vocabulary.
- One `chat()` call via `_shared/ai.ts` with the usage/exempt gate, returning `{ patterns: [{ title, reading, quote, note_ids }] }`.
- Server-side filtering: drop patterns with fewer than two valid note ids, drop quotes not found verbatim in a source transcript, cap at 6, then replace the stored rows.
- Returns the saved patterns so the page can render without a refetch.

Frontend:
- `src/hooks/usePatterns.ts` — loads cached rows, applies the staleness rule, invokes the function, exposes `{ patterns, loading, working, lookAgain }`.
- `src/components/PatternCard.tsx` — title, reading, quote, note links (titles fetched by id, same approach as `HomeNote`).
- `src/pages/Patterns.tsx` — header line, "Look again", card stack, empty and thin states.
- `src/App.tsx` route `/patterns`; `src/components/ProjectRail.tsx` nav entry above Ask.

No changes to `home-note`, `notice-threads`, or the Map — Patterns is additive.
