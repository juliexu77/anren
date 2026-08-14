# Transcribe while you talk; title it after you leave

## Why it isn't already doing that

The words you see moving on the capture screen aren't a transcript. They come from the browser's own on-device recogniser (`src/lib/speech.ts`) and are never saved — they're a preview, and on the native iOS WebView they often don't appear at all.

What actually gets uploaded during recording is audio: a 5-second slice every 5 seconds (`pushPart`). Nothing transcribes those slices while you talk. Real transcription starts only after you tap Keep it, and `process-note` does the whole job in one request the client waits on: transcribe all ~6 pieces of an 8-minute note, then the AI title + bullets, then the note-read, then the filing pass raced for 4 seconds, then a 1.4s hold. That's your 15–20 seconds.

So you're right on both counts: transcription is bundled with synthesis, and the transcription could largely be done before you ever press stop.

## The shape it should have

**During recording — transcription runs behind the audio, a few seconds back.**
Slices already land in storage every 5 seconds. As each group of slices lands, transcribe it and append to the note's transcript. By the time you press stop, everything except the last stretch is already written down.

**On stop — only the tail is left.**
Flush the final slice, transcribe just that remaining stretch, and the transcript is complete. The screen lets go in about a second or two regardless of whether you talked for 40 seconds or 40 minutes.

**After you leave — title, bullets, filing, search indexing.**
None of that needs you on screen. It runs server-side in a background task and appears on the note when it's ready.

## The fix

**1. A rolling transcription pass during recording**
- Transcribe in ~30-second windows rather than per 5-second slice: batch the slices as they land, so each transcription request is a sensible chunk of speech and the cost/call count stays sane. Roughly a 5–30 second lag behind your voice.
- Each window's text is appended to `notes.transcript` as it returns, in order, using the same quiet-cut/overlap stitching that already exists so nothing falls in a crack and nothing is duplicated.
- This also replaces the browser-recogniser preview as the source of on-screen words where it exists at all — the capture screen can show the real transcript arriving, which fixes the native-iOS case where the preview shows nothing.

**2. Split the pipeline in two**
- `transcribe-part`: small, cheap, called repeatedly during recording. Only job: turn a window of audio into text and append it.
- `process-note`: on stop, transcribe only what's left, save the transcript, then respond. Title, bullets, filing (`associate-note`) and search embeddings all move into a background task (`EdgeRuntime.waitUntil`) so they finish whether or not the app is open.

**3. Keeping it stops waiting for the write-up**
- Capture returns as soon as the transcript is saved. No awaited notice sequence, no 4-second filing race, no hold.
- The note appears immediately in the feed and on the note screen, live-updating through honest states: your words are already there, then the title lands, then the bullets, then "this sits with…" if anren notices something.

**4. Nothing gets lost if the app dies**
- Audio slices in storage remain the fallback: a note with audio and a gap in its transcript is re-requested on next open. Interrupted recordings recover exactly as they do today, only now most of their words are already transcribed.

## What you'll feel

An 8-minute note: your words accumulate on screen as you speak, Keep it releases the screen in a second or two, and the title and bullets settle onto the note a few seconds later — even if you've already walked away.

## Technical notes

- New `supabase/functions/transcribe-part/index.ts` — accepts `{ noteId, fromPart, toPart }`, downloads that range of slices, transcribes, appends with `joinOverlap`, records how far the transcript has got. Guard against overlapping runs on the same note (a `transcribed_parts` counter on `notes` — one small column, the only schema change).
- `src/contexts/RecorderContext.tsx` — after `pushPart`, when ~30s of unsent audio has accumulated, fire `transcribe-part` (not awaited). Keep the on-device preview as an instant filler until real text arrives.
- `supabase/functions/process-note/index.ts` — transcribe only parts past `transcribed_parts`; save transcript; respond; run synthesis + `associate-note` + embeddings inside `waitUntil`. Reprocess/regenerate path unchanged (it re-does everything from the stored transcript).
- `src/pages/VoiceCapture.tsx`, `src/pages/WriteCapture.tsx`, `src/lib/noticing.ts` — drop the awaited notice sequence from capture; move staged labels onto the note surfaces.
- `src/hooks/useNotes.ts`, `src/components/NoteRow.tsx`, `src/pages/NoteDetail.tsx` — live-update a processing note; derive its stage from transcript/synthesis presence.
- Cost note: transcription is billed per second of audio, so windowed transcription costs the same as one big call; only the request count goes up. Retries on a failed window cost that window again, not the note.
- Verify with a real 8-minute recording: time from tap to leaving the screen, transcript completeness against a single-shot transcription, and that the write-up completes with the app closed right after Keep it.
