# Never lose a recording in progress

Today, everything about a recording lives in memory until you press stop: the audio samples sit in a JavaScript array, the note row is only created at the end, and the live words are React state. If the phone locks, Safari backgrounds the tab, the browser reclaims memory, or the app reloads, the whole thought is gone. This makes recording durable while you're still talking.

## What changes for you

- The moment you start talking, the note already exists. Audio is written to your device continuously, in short segments, plus a running copy of the live words.
- If the screen locks, you switch apps, or the app reloads mid-recording, reopening anren shows: "You were part-way through something — keep it?" with **Keep it** (saves and writes it up) or **Discard**.
- If the mic stops because the system interrupted it (call, lock, another app), the recording pauses rather than dies, and resumes when you come back.
- Nothing about the finished note changes: same write-up, same transcript, same quality.

## How it works

**1. Local durable buffer (device-side)**
- New `src/lib/recordingStore.ts`: a small IndexedDB store holding one in-progress session — `{ sessionId, noteId, projectId, startedAt, sampleRate, elapsed, liveText, segments[] }`.
- `RecorderContext` flushes accumulated PCM to IndexedDB every ~5 seconds as its own segment (`Float32Array` blob), and clears the in-memory array. Live text and elapsed seconds are written on the same tick.
- IndexedDB survives tab suspension, screen lock, backgrounding, and reload — `localStorage` is too small for audio, so it isn't used here.

**2. Create the note up front**
- On `start()`, insert the `notes` row immediately (`status: 'processing'`, project, `recorded_at`) and store its id in the session record. Stopping then only uploads and processes.
- If the browser is offline at start, the session still records locally and the row is created at recovery time.

**3. Server-side safety net for long recordings**
- Every ~30 seconds, upload the segments accumulated so far to `voice-notes` as `${user.id}/${noteId}/partNNN.wav` (best effort, failures ignored and retried on the next tick).
- On stop, the local segments are still the source of truth: they're concatenated into one WAV and uploaded to `${user.id}/${noteId}.wav` exactly as today, then `process-note` runs unchanged. Partial parts are deleted after a successful final upload, and only used if the final upload never happened.

**4. Interruption handling**
- Listen for `visibilitychange`, `pagehide`, `freeze`, audio-track `ended`/`mute`, and `AudioContext` state changes.
- On interruption: flush immediately, mark the session `interrupted`, and keep the wake lock request logic; on return, re-acquire the wake lock, re-open the mic if the track died, and continue appending to the same session.
- `beforeunload`/`pagehide` performs a synchronous-ish final flush of whatever is buffered.

**5. Recovery on launch**
- New `useRecordingRecovery` hook (mounted in `AppShell`) checks IndexedDB for an unfinished session on load.
- Shows a quiet inline banner above the capture bar with **Keep it** / **Discard**, matching existing hairline/paper styling — no red, no alarm language.
- **Keep it**: assembles the stored segments into a WAV, uploads (or reuses uploaded parts), invokes `process-note`, clears the session, and navigates to the note.
- **Discard**: soft-deletes the placeholder note row and clears the session.

**6. Cleanup**
- Sessions older than 7 days are pruned on launch. Successful stop always clears the store, so no stale banners.

## Technical notes

- Files touched: `src/contexts/RecorderContext.tsx` (flush loop, up-front insert, interruption handling), `src/lib/recordingStore.ts` (new), `src/lib/wav.ts` (small helper to encode from many segments), `src/hooks/useRecordingRecovery.ts` (new), `src/components/AppShell.tsx` and/or `src/components/CaptureBar.tsx` (recovery banner).
- No database migration and no edge function changes; `process-note` and `transcribe-audio` stay as they are.
- Live on-device speech text is stored purely as a recovery aid — the paid transcription of the saved audio remains the source of truth for the note.
