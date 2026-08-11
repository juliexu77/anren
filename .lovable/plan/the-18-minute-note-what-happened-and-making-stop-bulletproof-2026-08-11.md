# The 18-minute note: what happened, and making stop bulletproof

## What I found on your account

- There is a note row for it: created 22:48:54 UTC, `duration_seconds: 1113` (18m33s), `status: processing`, **no audio file attached**, not deleted.
- Storage has no file for that note. Your five earlier notes tonight all have one (7–19 MB each).
- So the recording stopped fine, but the audio upload never completed before you navigated away — and the feed deliberately hides voice notes that have no audio yet, so it vanished from view rather than showing as stuck.

Why the upload didn't survive: an 18-minute note encodes to roughly **35 MB** of WAV, uploaded as one request at the moment you press stop. Leaving the browser kills that request. The 30-second server-side safety snapshot also skipped this recording, because it's capped at 12 MB and this one passed that within about 6 minutes.

Good news: the audio was written to your phone every 5 seconds, so unless you cleared browsing data it is still in on-device storage, and the recovery prompt should offer it back. Recovering it is step 1.

## The fix

**1. Get this recording back**
- Open anren in the same browser you recorded in. If the "You were part-way through something — keep it?" prompt appears, tap **Keep it** and it will upload and write itself up.
- I'll also verify the recovery check offers sessions that reached the stop-and-upload stage (not just ones interrupted mid-recording), and soft-delete the empty placeholder row so you don't end up with a duplicate.

**2. Upload while you talk, not only at the end**
- Replace the single big upload with progressive part uploads: each flush appends `${user}/${noteId}/partNNN.wav` in the background during recording, with no size cap.
- On stop, if the final combined upload can't complete, the parts are already in storage; `process-note` stitches the parts (in order) when no single file exists.
- Remove the 12 MB snapshot ceiling — long recordings are exactly the ones that most need the safety net.

**3. Make leaving mid-save safe**
- Retry the final upload with backoff, and keep the local session until the upload is confirmed, so the next launch can resume rather than restart.
- On stop, keep the session marked as unfinished until storage confirms; if you close the tab, the next open resumes the upload automatically instead of waiting for you to tap anything.
- Encode at 16 kHz as samples arrive rather than at the end, cutting both memory and upload size.

**4. Never silently hide a note again**
- Instead of filtering out voice notes with no audio, show them in the feed in a quiet "still saving" state, with a tap action to resume or discard. A note you spoke should never disappear from the archive without a word.

## Technical notes

- Files: `src/lib/recordingFinish.ts` (part uploads, retry, stitching handoff), `src/contexts/RecorderContext.tsx` (snapshot cap, session lifecycle on stop), `src/lib/recordingStore.ts` (keep session until upload confirmed), `src/hooks/useRecordingRecovery.ts` (resume finishing sessions, auto-resume), `src/hooks/useNotes.ts` + `src/components/NoteRow.tsx` (saving state instead of hiding), `supabase/functions/process-note/index.ts` (concatenate parts when the single file is absent).
- One data cleanup: soft-delete note `ef8ed7e6…` once the real recording is recovered.
- No schema change needed; `status: 'processing'` plus presence of parts is enough to drive the UI.
- The row for this note appears to have been created at stop time rather than at the first word, which suggests the up-front note insert didn't take effect. I'll confirm that while wiring the above, since it also affects recovery naming.
