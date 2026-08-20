# Two different things at the top of Home

Right now the line and the texture words are the same reading twice — both come from one prompt over the same week of notes, so the words just restate the sentence in shorthand. This splits them into two concepts that don't overlap:

- **The line — what you keep returning to.** One or two sentences, shorter and plainer than today's paragraph. No "from 3 notes" link underneath; if it isn't trustworthy enough to stand alone, it shouldn't be shown. Tapping it still lets it go for the day.
- **The words — how you sound.** Your energy and state across the week, not its subject matter: `drained`, `restless`, `steady`, `energized after Tuesday`, `running on fumes`. This is register, not content — the thing you'd hear in someone's voice rather than read in their notes. These persist and re-read themselves as new notes land.

The rule that keeps them separate: a word may never name a topic, a person, or anything the line already names. If the line says you keep circling maintenance, the words say what that circling sounds like.

## What it looks like

```text
You keep landing on trapped — the routine you chose,
the days going into logistics.

HOW THIS WEEK SOUNDS
  drained    restless    briefly lit up    bracing
```

Tapping a word opens one sentence of grounding beneath it ("Tuesday and Wednesday both start mid-sentence and end without landing"), so it's felt but never unfounded. The line and the words each stand on their own; either can be present without the other.

## When it appears

Unchanged: at least 4 notes in the last 7 days, recomputed at most every 6 hours or whenever 2 new notes have landed. Below that threshold Home shows the plain greeting and nothing else. The model may return no line, no words, or neither — an empty answer is better than a padded one.

## Technical notes

- `supabase/functions/home-note/index.ts`: split the prompt into two independent asks in one call — `observation` (1-2 sentences, hard cap enforced server-side) and `textures` reframed as energy/state words with an explicit prohibition on topics, people, and any noun the observation uses. Keep the lowercase, max-two-word (allow three when it carries a day, e.g. "quiet after Tuesday") shape and the one-sentence `detail`. Drop the requirement that an observation must cite note ids to be shown, since the link is going away.
- `src/components/HomeNote.tsx`: remove the "from N notes" disclosure and its source list; render the words under a small "How this week sounds" label with the existing `ThemePills` tap-to-detail; drop the note-title lookup that only fed the removed link.
- Force one recompute after deploy (the currently stored row is fresh and has no words yet, so Home would otherwise show nothing new for hours).
- No schema change — `home_notes.textures` and `line` already hold both.
