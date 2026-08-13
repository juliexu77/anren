# Why "keeping it" took a minute — and how to make it land fast

## What actually happened with your 4½-minute note

I traced the exact note (266 seconds, recorded 16:24:46, kept ~16:29:12) through the server logs. The spinner covered roughly **a minute of work**, in four stages:

| Stage | Time | What it was doing |
| --- | --- | --- |
| On your phone, after you tapped Keep it | ~26s | Reading the whole recording back out of on-device storage, encoding it into one 8.5 MB WAV in the main thread, and uploading that whole file |
| Write-up (`process-note`) | 24s | Transcribing the entire 4½ minutes as a *single* request, then writing the title and bullets, then building search embeddings — all before replying |
| Reading it against what you keep (`associate-note`) | 12s | Threads/projects pass |
| Follow-up calls | ~1s | — |

Two of those stages are avoidable almost entirely:

1. **The 26 seconds re-uploading audio the server already had.** During recording, anren pushes a slice to storage every 5 seconds — by the time you pressed stop, the whole recording was already up there. Then it encoded and uploaded a second complete copy from scratch.
2. **The write-up transcribed 4½ minutes in one shot** even though it already knows how to split audio at quiet moments and transcribe pieces in parallel — the splitter only kicks in past 10 minutes. And embeddings (search indexing) run *before* the response, so you wait for work you can't see.

## The fix

**1. Stop re-uploading what's already there**
- On stop, flush the final slice and use the parts already in storage instead of encoding and uploading a whole second copy. That removes the biggest single chunk of the wait — the note gets handed to the write-up within a second or two of the tap.
- Keep the whole-file upload only as a fallback when parts are missing (e.g. a session recovered from an older recording), and do it in the background rather than in front of the spinner.

**2. Transcribe in parallel pieces, not one long request**
- Lower the chunk size from 10 minutes to about 90 seconds so a 4½-minute note becomes three pieces transcribed at once. Roughly a third of the transcription time for the same words, with the existing quiet-cut and overlap-stitch logic unchanged.

**3. Don't make you wait for invisible work**
- Move search indexing (embeddings) to after the response is sent, so the note lands as soon as the title and bullets exist.
- Run the "reading it against what you keep" pass without holding the screen: land on the note and let the "this sits with…" line appear when it arrives, instead of adding 12 seconds to the spinner.

**4. Make the wait honest while it lasts**
- The staged labels already exist ("writing it up…", "titling it…"). With the above, they'll actually track the work. Add the elapsed feel of progress for long notes by showing the transcript-so-far line the server already saves as each piece finishes.

Expected result for a note this length: **a few seconds to leave the capture screen**, and the write-up settling in around 8–10 seconds instead of a minute.

## Technical notes

- `src/contexts/RecorderContext.tsx` — on stop, prefer the parts prefix; don't block on `uploadAudio`.
- `src/lib/recordingFinish.ts` — `finishSession` checks parts first, falls back to whole-file upload in the background; keeps the local copy until storage is confirmed either way.
- `supabase/functions/process-note/index.ts` — `CHUNK_BYTES` to ~90s, keep `CONCURRENCY` at 3 (raise to 4 if the transcriber tolerates it); move the passage/embedding block after the JSON response using a background task so it still runs.
- `src/lib/noticing.ts` / `src/pages/VoiceCapture.tsx` — return after the write-up, run `associateNoteAsync` without awaiting the navigation; show the landing line on the note screen if it arrives late.
- No schema change.
