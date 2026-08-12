# Continue a note

Right now you can't. When a note is open, the composer at the bottom still creates a brand-new note — the only editing on an existing note is retyping the write-up, or the body text of a typed note. Voice notes have a read-only transcript, so there is no way to speak more into a thought you already started.

## What we'll build

When a note is open, the composer becomes "continue this note":

- Placeholder reads **"Continue this thought…"** instead of "Write something…".
- Typing and sending appends your words to that note (a blank line, then the new text) and the write-up is rewritten to include them.
- Tapping the mic records a continuation. When you stop, the new audio is transcribed and appended to the existing transcript, then the title and write-up are refreshed over the whole thing.
- A small "new note instead" toggle above the composer, so you can still capture an unrelated thought while a note is open.
- The transcript section shows the appended part with a quiet divider and a timestamp, so it reads as sessions rather than one blurred block. The audio player lists each recording session in order.
- While a continuation is being written up, the note shows "Adding what you just said…" instead of the first-time transcribing line.

## How it works

- New nullable column `continues_note_id` on `notes` so a continuation recording is captured exactly like a normal note (same durability, snapshots, chunked upload, recovery) but knows its parent.
- `process-note` gains an append path: after transcribing, if `continues_note_id` is set, it appends the new transcript to the parent, moves the audio segment under the parent, regenerates the parent's title/write-up/embeddings from the combined text, and removes the placeholder child row so it never appears in the feed or Recent list.
- Typed continuations append directly to the parent's `body`/`transcript` from the client and reuse the existing `regenerate: true` call.
- Recorder gains an optional `continuesNoteId` argument; `CaptureBar` passes it when the route is `/note/:id` and the toggle isn't flipped.
- Related notes and passages are recomputed for the parent after an append, since the text changed.

## Notes

- Existing notes are unaffected; the column defaults to null.
- Continuations respect the same AI credit/key rules as any other write-up.
