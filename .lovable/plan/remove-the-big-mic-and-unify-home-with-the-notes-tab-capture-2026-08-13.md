# Remove the big mic and unify Home with the Notes-tab capture line

## Goal
Replace the large circular microphone on the Home blank page (`/capture`) with the same compact capture line that already sits at the top of the Notes tab.

## Current state
- `/capture` renders `CaptureSurface`, which shows a centered 92px circular mic button and a secondary "or write it" link.
- `/notes` renders `CaptureLine` at the top: an italic "What's on your mind?" prompt with Mic and PenLine icons that route to `/capture/voice` and `/capture/write`.
- The new full-screen capture modes (`VoiceCapture`, `WriteCapture`) already exist and navigate back to `/capture` with the saved note state.

## Changes
1. **Delete the big mic from Home**
   - Remove the 92px circular mic button and the "Speak it" label from `src/components/CaptureSurface.tsx`.
   - Remove the secondary "or write it instead" link.
2. **Use the Notes-tab capture style on Home**
   - Render a centered, blank-page variant of the capture line: the same "What's on your mind?" prompt plus Mic and PenLine icons.
   - Prefer reusing the existing `CaptureLine` component if its layout works centered; otherwise create a minimal `HomeCaptureLine` variant so the two surfaces stay in sync.
3. **Preserve the rest of the page**
   - Keep the recovery banner (`useRecordingRecovery`) and the post-save "Kept it" / filed confirmation.
   - Keep the `/capture` route and the sidebar "New thought" button landing here.
4. **Verify the full flow still works**
   - Tap Mic → `/capture/voice` → save → return to `/capture` with state.
   - Tap Pen → `/capture/write` → save → return to `/capture` with state.
   - Confirm the page still looks like a blank piece of paper, not a dashboard.

## Out of scope
- No changes to `VoiceCapture.tsx`, `WriteCapture.tsx`, or `CaptureLine.tsx` themselves.
- No changes to routes, sidebar navigation, or the Threads home at `/`.
