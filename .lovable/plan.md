# Search becomes Ask

The Search tab becomes Ask — a place to query your own notes in plain language and have anren read them back to you. Closer in feel to the old Reflect surface than to a results list.

## What it feels like

- Nav item: "Ask" with a plain sparkle/question mark mark, at `/ask`.
- Opening line: "Ask anything about what you've been saying." One quiet underlined field, autofocused: "What's been on my mind about work?"
- On submit, your question stays on the page and anren's reading appears beneath it — warm, tentative, second person, leaning on your own phrasing.
- Under each reading, the notes it drew on appear as a small "From your notes" list of titles, each tappable to open the note.
- Follow-ups stack down the page, so a session reads like a short conversation. anren remembers the last few turns while you're on the tab; leaving clears it.
- A few starter questions show on the empty state, in the app's existing starter-prompt style ("What keeps coming up lately?", "What have I been avoiding?", "What was I excited about last month?").
- If nothing in your notes speaks to it, anren says so plainly instead of inventing an answer.
- Keyword-ish queries still work: the same reading appears, and the note list underneath doubles as the results.

## Technical notes

- `src/pages/SearchPage.tsx` → `src/pages/AskPage.tsx`. Route `/ask`; keep `/search` as a redirect to `/ask` so old links and any bookmarks still land.
- `src/components/ProjectRail.tsx`: nav label/icon and target change to Ask / `/ask`.
- Swap the backend call from `search-notes` to the existing `ask-notes` function, which already does hybrid retrieval, returns `{ answer, sources }`, and accepts a `history` array of `{ question, answer }` turns (last 4 used). No edge-function changes needed.
- Local state: `turns: { question, answer, sources }[]` plus a pending question; send the last 4 turns as `history` on each call. Reuse the underlined `CaptureLine`-style field treatment already used for Continue-note inputs.
- Reuse `StarterPrompts` for the empty state; tapping one fills and submits.
- Handle the `needsKey` / quota response the same way other AI surfaces in the app do.
- `search-notes` stays deployed (unused by the UI) unless you'd like it removed.
