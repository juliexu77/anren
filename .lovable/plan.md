# Keeping it should take a second, not twenty

## What the spinner is actually waiting for

Right now "Keep it" holds the screen through the entire pipeline, in this order:

1. Final slice flush + confirm the audio is in storage — fast (a second or two; the slices went up while you talked).
2. `process-note` — **transcribe the whole recording** (an 8-minute note is ~6 pieces, transcribed 4 at a time, so two rounds) **and then** the AI write-up (title + bullets) in the same request. The client waits for the whole thing.
3. A second read of the note row for the title.
4. `associate-note` ("reading it against what you keep") — raced against a 4-second timeout, so up to 4 more seconds.
5. A 1.4-second hold on the landing line.

So yes — transcription and synthesis are bundled into one call the user is made to wait on, plus two more waits after it. For 8 minutes of speech that's the 15–20 seconds you felt, and if you navigate away mid-flight the invoke can be cut off before the write-up ever runs.

## The principle

The only thing the user should ever wait for is **the recording being safely on the server**. Everything after that — transcription, title, bullets, filing — is anren's work, and should happen server-side whether or not the app is open.

## The fix

**1. Hand off, don't hold**
- On stop: flush the last slice, confirm the audio path, and leave the capture screen immediately. Target: **under ~2 seconds**, independent of note length.
- The write-up is requested and not awaited.

**2. Make the write-up survive the client**
- `process-note` acknowledges the request right away and runs the whole pipeline in a background task (`EdgeRuntime.waitUntil`), so closing the app or navigating away can't kill it. Today the work only runs while the client holds the connection.
- Split the pipeline into two saves instead of one: **transcript first**, written to the note the moment the words exist (it already saves partial transcript per chunk — this makes it a real checkpoint), then title + bullets as a second update. A note becomes readable at your own words well before the synthesis lands.

**3. Show the progression instead of a spinner**
- The note lands in the feed and on the note screen straight away, moving through honest states: "still saving" → "writing down your words" → "writing it up" → done. Live-updating, no reload.
- Navigate straight to the note (or back to the blank page, as today) with the note already present — no full-screen blocking beat.

**4. Move the noticing beat off the critical path**
- Drop the extra title read and the `associate-note` race from the save flow. The filing pass runs server-side after synthesis; when it decides something, the "this sits with…" line appears on the note screen where you're already looking. The "aha" beat is kept — it just arrives instead of being waited for.

**5. Retry, don't lose**
- If the hand-off request itself fails (offline, backgrounded), the note keeps `status: processing` with audio in storage, and the next app open re-requests the write-up. A note with audio and no transcript is always recoverable.

## What you'll feel

An 8-minute note: tap Keep it, the screen lets go in a second or two, the note is in your list immediately with its words filling in, and the title and bullets settle in on their own — visible whether you stayed on that screen or not.

## Technical notes

- `src/contexts/RecorderContext.tsx` / `src/lib/recordingFinish.ts` — stop returns as soon as `audio_path` is set; `requestWriteUp` stays fire-and-forget.
- `src/pages/VoiceCapture.tsx`, `src/pages/WriteCapture.tsx`, `src/lib/noticing.ts` — remove the awaited notice sequence from capture; keep staged labels only as note-level state. (Typed notes are cheap, so they may still show a brief beat.)
- `supabase/functions/process-note/index.ts` — respond 202 immediately, run transcription → transcript save → synthesis → filing → embeddings inside `waitUntil`; call `associate-note` from the function rather than the client.
- `src/hooks/useNotes.ts`, `src/components/NoteRow.tsx`, `src/pages/NoteDetail.tsx` — realtime/poll on the processing note; derive the stage from `transcript`/`synthesis`/`audio_path` presence.
- No schema change; existing `status` plus field presence is enough.
- Verify with a real long recording: measure time from tap to leaving the screen, and confirm the write-up completes with the app closed mid-flight.
