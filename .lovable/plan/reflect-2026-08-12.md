# Reflect

Rename "On my mind" to **Reflect**, and make it two things in one place: the weekly read-back you already have, plus somewhere to ask anren a question about your own notes and get a real answer back.

## The screen

```text
Reflect
Week of August 10

[ weekly narrative blurb ]
[ theme pills ]

────────────────────────
Ask about your notes
[ What have I been avoiding?            ↑ ]

You seem to keep circling…
Drawn from: Tuesday morning · Writing concepts · 3 more
```

- Heading, sidebar link and route become "Reflect" (`/reflect`). The old `/on-my-mind` link keeps working so nothing bookmarked breaks.
- The weekly section stays exactly as it is: short reading, then the theme pills, with "Look again" to regenerate.
- Below a hairline divider, an ask field in the same ivory capsule shape as the composer. Ask a question, get a few sentences back, with the notes it leaned on listed underneath as tappable chips that open those notes.
- Follow-up questions stay in view for the session, oldest at the top, so a train of thought reads as a short exchange. Nothing is saved to the database — leaving the screen clears it.
- A few starter suggestions when the field is empty ("What kept me up this month?", "What have I stopped mentioning?"), tappable to fill the field.
- Empty and thin states are honest: with almost no notes, it says there isn't much to read yet rather than inventing something.

## How it answers

A new `ask-notes` edge function, close in shape to the existing note-level ask:

- Retrieve first: the question is embedded and run through the existing `hybrid_search_notes` retrieval across all your notes (no folder filter), taking the strongest passages.
- Then interpret: those passages plus the current week's themes go to the model, which answers in 2–5 sentences of plain second-person prose, quoting your own phrasing, and says plainly when the notes don't cover it. No bullets, no therapy voice.
- Prior turns in the session are sent along so follow-ups make sense.
- Returns the answer plus the note ids it drew on, which become the chips.
- Same trial/own-key gating and quota handling every other AI surface uses.

## Technical notes

- `src/pages/OnMyMind.tsx` → `src/pages/Reflect.tsx`; route `/reflect` added in `src/App.tsx` with `/on-my-mind` redirecting to it; `src/components/ProjectRail.tsx` nav label updated.
- New `src/components/AskNotes.tsx` holds the field, the session transcript, suggestions and source chips.
- New `supabase/functions/ask-notes/index.ts`: auth via the caller's JWT, validated question (max 500 chars) and a capped turn history, `embed` + `hybrid_search_notes`, then `chat` from `_shared/ai.ts` with `QuotaError` → `needsOwnKeyResponse` like `ask-note` and `search-notes`.
- No schema changes; retrieval reuses the existing RPC and RLS, so only your own passages are ever read.
- Search stays where it is — it remains the place to find a note; Reflect is the place to ask about the whole body of them.
