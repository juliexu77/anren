# Patterns: a letter anren writes you, unprompted

Ask waits for a question. Patterns doesn't. It's a single letter — a few short paragraphs reading across everything you've kept, naming the patterns it sees — that anren writes on its own and keeps current. You open it to be read to, not to query anything.

Deliberately open-ended: it surfaces patterns without committing to a frame (energy, decisions, moods). Once you've lived with it a week, we can narrow it.

## Starting point: Plum Tarot Journal's pattern engine

I reviewed the tarot app (`Plum Tarot Journal`, `/patterns` route, `journal.functions.ts`, `prompts.server.ts`). Their engine is exactly the right shape, translated to notes:

- **The letter itself.** One cached write-up per period, written in second person, reading the entries as an ordered sequence with an arc — not a list of recaps. Ours reads across your recent notes the same way.
- **The prompt's best ideas.** Name the arc plainly, including when it's uncomfortable; notice the movement, not just the content; end with one honest line naming what this is *not* asking of you, so the read stays honest rather than tidy. Our prompt adopts that voice directly.
- **Cached result + explicit rewrite.** Their `reflections` table upsert and "Rewrite the letter" button become our `patterns` table and "Read again" button.
- **Cheap deterministic recurrences alongside the AI layer.** Their "words you keep using" is pure counting, no model. We get the equivalent for free: a quiet word strip computed client-side from note transcripts (stop-word filtered, recurs across notes), rendered below the letter. It grounds the page even when the letter is being rewritten.

What we don't take: tarot framing, card sequences, month pickers, counts/bars.

## What you see

New sidebar item **Patterns**, directly above Ask.

```text
Patterns
  Last read across 34 notes · 2 days ago      Read again

┌─ (hairline, editorial serif, ~1.15rem)
│  This stretch keeps circling the same bargain: the moment you
│  understand what's wrong in a room, you become the one expected
│  to fix it. It shows up in three different settings, and each
│  time you describe it as something that happened to you rather
│  than something you agreed to.
│
│  Underneath it, a quieter pattern: the rules arrive late …
│
│  What this is not asking of you: to stop being the one who
│  notices. …
└─

WORDS YOU KEEP USING
[energy] [rules] [fix] [somehow] [choice]
```

The letter:
- 4-6 short paragraphs, plain prose, no headings, no bullets — one continuous reading in editorial serif.
- Names the patterns it finds inside the prose (shapes and dynamics, not topics), each grounded in at least two notes.
- Opens with the strongest observation, never with throat-clearing.
- Ends with the honest "what this is not asking of you" line.
- After the letter, a quiet line of underlined links to the notes it drew from.

Below it, the **Words you keep using** strip: single words that appear in 2+ notes, small bordered chips, no counts.

Rules that keep it honest:
- Patterns named in the letter must recur across at least two notes. One-note cleverness is cut.
- Under 8 notes total, the page shows a single quiet line: nothing has repeated enough to read yet — plus the word strip if it has anything.

## When it runs

- Cached: opening the page shows the last letter instantly.
- Rewrites on open when the letter is older than 24 hours or 3+ notes have landed since. Otherwise it stands.
- "Read again" forces a fresh letter.
- Same voice rules as the rest of anren: no productivity language, no therapy voice, no throat-clearing, no invented details.

## Technical notes

New table `public.patterns`:
`id`, `user_id`, `body text`, `note_ids uuid[]`, `notes_analyzed int`, `computed_at timestamptz`, `created_at`. One row per user — a pass upserts on `user_id`, so the table always holds the current letter. RLS `auth.uid() = user_id` for all commands, plus `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role`.

New edge function `supabase/functions/notice-patterns/index.ts`:
- Auth from the caller's header, same shape as `home-note`; CORS via the SDK import; JSON responses with `corsHeaders` on every path.
- Pulls up to 60 recent ready notes (title, synthesis, transcript excerpt, recorded_at) plus project and thread names for shared vocabulary.
- One `chat()` call via `_shared/ai.ts` with the usage/exempt gate. The prompt is adapted from the tarot `MONTHLY_LETTER_SYSTEM`: read the notes as an ordered sequence with an arc; stay at the synthesis layer; second person, plain prose; name the arc plainly; end with the "what this is not asking of you" line. Returns `{ body, note_ids }` — `note_ids` lists the notes each named pattern rests on, server-side filtered to ids that actually exist.
- Upserts the letter row and returns it so the page renders without a refetch.

Frontend:
- `src/hooks/usePatterns.ts` — loads the cached row, applies the staleness rule, invokes the function, exposes `{ letter, loading, working, readAgain }`.
- `src/pages/Patterns.tsx` — header line, "Read again", the letter (paragraphs split on blank lines), the source-note links, the **Words you keep using** strip (tokenize transcripts client-side, stop-word filter adapted from the tarot app's `words` computation, words in 2+ notes only), empty and thin states.
- `src/App.tsx` route `/patterns`; `src/components/ProjectRail.tsx` nav entry above Ask.

No changes to `home-note`, `notice-threads`, or the Map — Patterns is additive.
