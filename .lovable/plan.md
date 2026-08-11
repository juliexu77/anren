# Long recordings: no length a note can't be

## What the 25 MB limit actually is

It's not ours. The transcription API rejects any single audio file over 25 MB. At the format anren records in (16 kHz, 16-bit mono) that's about 13 minutes of talking. Nothing in anren caps length — the cap is one upload to the transcriber.

That part is already handled: audio longer than one chunk is split into 10-minute pieces, each transcribed on its own, then stitched back into one transcript. A 30-minute ramble already becomes three pieces and one note.

So the fix isn't "add splitting" — it's closing the four ways that splitting can still lose or stall a long note.

## What still breaks on a 30+ minute note

1. **Words fall in the cracks.** The split happens at an exact byte count, which lands mid-word roughly every time. Each cut currently costs a word or two.
2. **Memory.** The whole recording is pulled into memory as one blob, then copied again per chunk. Thirty minutes is ~58 MB, an hour ~115 MB — near the ceiling a function gets, and the recovery path that stitches the 5-second pieces holds all of them in memory at once as well.
3. **Wall clock.** Chunks are transcribed strictly one after another. Six chunks of an hour-long note, in sequence, can outrun the time the function is given — and if it dies, the whole thing restarts from zero.
4. **One bad chunk kills the note.** If a single piece fails, the error throws and the entire transcript is lost rather than the other 55 minutes surviving.

## The fix

- **Cut at a quiet moment.** Near each 10-minute boundary, scan a few seconds either side for the lowest-energy window and cut there, so splits fall between sentences instead of through a word. Overlap each piece slightly and drop the repeated words when joining.
- **Never hold the whole thing.** Read the recording from storage in ranges, one chunk at a time, and let each go before the next. On the recovery path, group the 5-second pieces into ~10-minute batches and transcribe each batch as it's assembled, instead of building one giant file first.
- **Transcribe in parallel, bounded.** Run three chunks at a time and reassemble in order. An hour goes from six sequential calls to two rounds, well inside the time budget.
- **Save progress as it lands.** Write each finished chunk's text to the note as it completes, so a mid-run failure resumes from the last good chunk instead of starting over. Retry a failed chunk twice; if it still won't go, keep the rest of the transcript and mark that stretch rather than failing the note.
- **Say something honest while it works.** A long note gets "Writing this up — this one's long" instead of the same spinner a 30-second note gets.

## Notes on the technical side

Changes are confined to `supabase/functions/process-note/index.ts` (chunk boundary selection, ranged reads, bounded concurrency, per-chunk persistence and retry) plus a small status/label change where processing notes render in the feed. No schema change; no client recording changes. Verified after with a synthetic long-audio run through the function.
