# Swap the capture mic button to the left of the text input

Today the bottom composer has the text input on the left and the round mic/send button on the right. This is a quick layout change to put the recording button first and the typing/pasting field to its right, which feels more natural for a voice-first app.

## What changes

In `src/components/CaptureBar.tsx`:

- Reorder the inner flex row so the round action button (mic/send/stop) renders first, followed by the text area or the recording/saving status read-out.
- Keep all existing behavior: the mic starts recording, the square stops it, the arrow sends a typed note, and the spinner shows while saving.
- Keep all existing styling, animation, spacing, and accessible labels.
- No state logic, API, or routing changes.

## Verification

- Typecheck passes.
- In the preview, the composer shows a round button on the left and the text input on the right in idle state; during recording it shows the stop button on the left with the timer/cancel on the right; during a save it shows the spinner on the left with the saving message on the right.
