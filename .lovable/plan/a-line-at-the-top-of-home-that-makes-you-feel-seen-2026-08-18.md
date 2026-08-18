# A line at the top of Home that makes you feel seen

Today Home is a blank page with one capture line. This adds a single quiet line above it: usually a soft, personalized greeting; when the recent notes actually have a current running through them, an observation instead — the thing a friend would say ("this seems like it's really been on your mind lately").

## What it feels like

- **Most of the time:** one short rotating line, chosen by time of day and how long since you last wrote. Not a dashboard, not a stat. Examples: "Morning." / "Quiet Tuesday." / "It's been a few days." / "Late again." No location, no weather.
- **When there's something to say:** the greeting is replaced by one or two sentences naming what keeps coming back — in anren's existing voice: second person, settled, no praise, no advice, no productivity language. Example: "Marcus keeps coming up — the third time this week you've circled the timing rather than the decision."
- **Traceable:** when an observation names something, a small "from 3 notes" link underneath opens Search prefilled with that thread, so it's never a claim you can't check.
- **Never in the way:** the line sits above the capture line at the same weight as the rest of the page. Tapping it dismisses it for the day. It never appears while a kept-note echo is showing, and never on a first-run empty account.

## When an observation appears

You chose "fairly often": any time the last week has a discernible current. Concretely:

- At least 4 notes in the last 7 days, otherwise greeting only.
- The model is allowed to return nothing. If it can't point at specific notes, we show the greeting — a padded observation is worse than none.
- Computed at most once every 6 hours, and re-computed when 2+ new notes have landed since the last one. Otherwise the stored line is reused, so Home is instant and costs nothing to open.

## How it works

- **New table `home_notes`** (one row per user): `line`, `kind` ('greeting' | 'observation'), `note_ids`, `notes_analyzed`, `dismissed_at`, `computed_at`, with RLS scoped to `auth.uid()` and the standard grants.
- **New edge function `home-note`**: pulls the user's last 7 days of notes (titles + synthesis, not full transcripts), plus project and thread names for shared vocabulary, and asks Claude for `{ "observation": string | null, "note_ids": [...] }` with the same hard prohibitions as the weekly digest prompt (no summarising, no throat-clearing, no invented detail, no therapy voice). Stores the result; returns it.
- **Greeting is client-side** — no AI, no request. A small `src/lib/greeting.ts` picks from a set of lines using local hour and days since the last note, so it's instant on load and varies without feeling random.
- **New `src/components/HomeNote.tsx`**: renders the line above `HomeCaptureLine` inside `CaptureSurface`. On mount it shows the greeting immediately, then calls `home-note` in the background (throttled per the rules above) and cross-fades in the observation if one comes back — the page is never blocked or shifted by a pending request.
- **Refreshed after capture:** keeping a note invalidates the stored line so the next visit to Home can reflect what you just said.

## Technical notes

- Files: new `supabase/functions/home-note/index.ts`, new `src/lib/greeting.ts`, new `src/components/HomeNote.tsx`, edits to `src/components/CaptureSurface.tsx` (render the line, suppress while `KeptEcho` is up) and one migration for `public.home_notes`.
- Reuses `chat`, `parseJsonBlock`, `jsonResponse`, and the existing quota/own-key handling from `supabase/functions/_shared/ai.ts`, so the trial gate and personal-key path behave exactly as elsewhere.
- Failures are silent: any error, quota block, or empty result leaves the greeting in place.
