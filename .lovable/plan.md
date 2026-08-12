# A first five minutes that shows the magic

Right now a new account lands on an empty Notes list with one line of copy and a composer. Nothing explains what anren does with a voice memo, and Reflect, folders and search all look dead until several notes exist. There is no onboarding code anywhere — only an unused `onboarding_completed` flag on the profile.

The fix is a short sequence, in this order: a few calm intro cards, a guided first note, then a single nudge toward Reflect.

## 1. Intro (three cards)

Full-screen, paper ivory, one thought per card, serif heading and a small "next" — plus a quiet "skip" on every card.

1. **anren** — "Where the mental load rests." Talk to yourself, and anren keeps the thought.
2. **Say it once** — you speak; anren transcribes, titles it and writes it up. You don't take notes.
3. **It remembers** — file notes in folders, search what you said, and once a week anren reads the whole thing back to you.

## 2. Guided first note

The intro hands the mic over instead of dropping the user into an empty feed.

- A prompt with something easy to answer: "What's on your mind right now? A minute is plenty."
- The real composer mic, framed by the onboarding surface, with a soft ring drawing attention to it. Typing works too for anyone who won't talk out loud.
- On stop, the user stays on this screen while the note processes, with the live transcript and a line about what anren is doing (transcribing, then writing it up).
- When the write-up lands, it appears in place — title, synthesis, the words they said — as the "here's what that became" moment, with one button into the note.

## 3. Two example notes, clearly marked

Seeded once, at the end of onboarding, so folders, search and Reflect aren't empty rooms:

- Two short notes with real-sounding synthesis, filed in an example folder, each labelled as an example in the row.
- A single "clear the examples" action in Settings and on the seeded folder, deleting both notes and the folder in one tap.

## 4. The Reflect nudge

Once, after the user has recorded their own notes and a weekly reading is available, a dismissible line at the top of the feed: "anren has read your week back — see Reflect." No tour, no coach marks stacked on top of each other.

## Also

- Rewrite the empty Notes state to say what happens next rather than only what it is.
- "Show me around again" in Settings replays the intro and the Reflect nudge.

## Technical notes

- Gate on the existing `profiles.onboarding_completed` (already `false` by default) — no schema change. A small `useOnboarding` hook reads and flips it; the app shell renders the onboarding overlay above the routes while it is `false`, so no new routes are added.
- The guided note reuses `RecorderContext` / `useRecorder` and the same insert path as `CaptureBar`, and watches the note row for `status` moving off `processing` — no new edge function, no change to the recording or synthesis pipeline.
- Example notes are inserted client-side with `source: 'typed'` and pre-written `title`/`synthesis`, plus a marker so they can be identified and removed; they are not embedded, so they don't pollute vector search.
- Copy stays lowercase "anren", contemplative voice, no productivity language.
