# Ask disappears into Search

Ask stops being its own box anywhere in the app. Search becomes the one place where you either look for a note or ask a question — and it works out which you meant.

## What changes

**Note screen**
- Remove the "Ask about this note" section entirely (field, sparkle button, answer block). The note stays: title, Notes / Your words, related, continue.

**Search**
- One field, unchanged look. Placeholder becomes something that covers both: "A word, a title, or a question".
- On submit, search runs as it does now. If what you typed reads like a question (ends in "?", or opens with what/why/how/when/where/who/did/do/have/should/am/is/was), anren also writes the short reading and shows it above the results, without you asking for it.
- If it doesn't read like a question, results only — no reading, no button.
- The manual "See what these have in common" toggle stays for non-question searches, so a plain keyword search can still be interpreted on request.
- The reading keeps its current quiet paper card and warm, tentative voice.

## Technical notes

- `src/pages/NoteDetail.tsx`: delete the ask section and its `question` / `answer` / `asking` state, the `ask` handler, and the now-unused `Sparkles` import.
- `src/pages/SearchPage.tsx`: add a small local `looksLikeQuestion(q)` helper; when true, call `search-notes` with `explain: true` on the first pass and open the answer panel automatically. Keep the existing explain-on-demand path for the non-question case.
- Edge functions: `search-notes` already handles `explain`, so no backend change. Leave `ask-note` deployed but unused (nothing in the UI calls it) — say the word and it gets deleted too.
