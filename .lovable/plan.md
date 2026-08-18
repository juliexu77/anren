# Something said back after you keep a note

Right now the moment after "Keep it" is a single line: *Kept it. open it* — plus a filing guess when there is one. It's correct and it's empty. This makes anren say one true thing back about what you just said.

## What you'll see

After you finish speaking (or writing) and land back on the blank page:

1. **Straight away** — the same quiet "Kept it." line, so nothing feels slower than it does today.
2. **A second or two later, as the write-up lands** — the note's title, and beneath it one or two sentences addressed to you: what you were working through, said plainly. Not a summary, not bullets — a reply.
3. **When it's true** — one connecting line under that: *This sits with Kitchen remodel* or *This rhymes with 3 other notes about leaving the agency*, with the project or thread tappable.
4. **Always** — *open it* to go read the whole thing, and *not that?* to undo a filing guess.

The whole thing fades in line by line rather than popping, stays up long enough to actually read (about 12 seconds, longer than today's 4), and dismisses on tap or on your next capture. If the write-up fails or takes too long, it degrades to exactly today's behaviour — never a spinner, never an apology.

## Voice

The reflection is one to two sentences, second person, settled and descriptive — the same register as the synthesis. It names what you were actually working out. It never diagnoses you, never praises you ("great thinking"), never asks a follow-up question, never uses productivity language.

Examples of the intended shape:

- "You were circling whether to tell them before the quarter closes, and you kept coming back to timing rather than the decision itself."
- "You talked through the kitchen layout twice and landed on keeping the island."

## Technical notes

**Database** — add a nullable `echo text` column to `public.notes`. No new table, no policy changes (existing note policies and grants already cover it).

**`process-note`** — extend both synthesis prompts to return a third field, `echo`, described as one or two sentences spoken back to the person. It's written in the same background `writeUp()` pass as `title`/`synthesis`, so it costs no extra model call and no extra capture latency. Saved alongside them in the same `notes` update; if the model omits it, the field stays null and the UI simply doesn't show that line.

**Types** — add `echo` to the `Note` type and `mapNote`; add it to `NoteEdits` only if regeneration should clear it (it will be overwritten on regenerate anyway).

**`CaptureSurface.tsx`** — the kept-confirmation block becomes a small component that:
- subscribes to the kept note's row (same realtime pattern `useNotes` already uses) and fills in title then echo as they arrive;
- reuses `landingLine()` from `src/lib/noticing.ts` for the connecting sentence, driven by the filing state already passed in `location.state` plus the thread info returned by `associate-note`;
- raises the linger from 4.2s/9s to ~12s, restarts the timer when new text arrives so a late echo isn't cut off, and clears on tap.

**Continuations** — a continued note's echo is written for the merged parent note, and the capture screen already returns to that note, so no confirmation card is shown there. Unchanged.

## Out of scope

No change to the recording screen, the note detail layout, the Map, or the synthesis bullets themselves.
