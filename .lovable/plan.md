# Starter prompts in the empty states

Right now the mic opens a blank waveform with no guidance. This adds a small set of tappable prompts wherever a surface is empty, each one opening the voice screen with that prompt printed above the transcript as a quiet cue.

## Where they appear

- **Home (blank capture page)** and **Notes with nothing kept**: the global set.
  - What's on my mind right now?
  - What have I been avoiding today?
  - An idea I don't want to lose
  - What happened today that's worth remembering?
- **Inside an empty project**: project-specific set (the project name is spoken back in the heading copy already).
  - Where did I leave this?
  - What's not working yet?
  - What am I actually trying to say here?
- **Threads — "Outside your projects" with nothing gathered**:
  - Something that's been nagging at me
  - A decision I'm putting off

Shown as two or three wrapped, hairline-bordered pills in the ivory/clay palette — quiet, not a call-to-action block. They disappear once a surface has content.

## What a prompt does

Tapping one opens the voice capture screen (folder carried through when tapped inside a project). The prompt sits above the live transcript in muted italic editorial type so you can see what you're answering, and it fades out once you start speaking. It is a visible cue only — it is not saved into the note, not transcribed, and does not affect the write-up. A small "write it instead" affordance keeps the typed path reachable, opening the write screen with the same prompt as a heading cue.

## Technical notes

- New `src/components/StarterPrompts.tsx`: takes a prompt list plus optional `projectId`, renders the pills, navigates to `/capture/voice?prompt=<encoded>&folder=<id>`.
- New `src/lib/prompts.ts`: the three named prompt sets in one place.
- `VoiceCapture.tsx` / `WriteCapture.tsx`: read `prompt` from search params and render it above the transcript / textarea. Hide once `liveText` (or typed text) is non-empty. No changes to the recorder, `noticeNote`, or any edge function.
- Wire into `CaptureSurface.tsx` (blank home, only when no confirmation is showing), `Index.tsx` empty state (global set, or project set when `projectId` is present), and the `looseCount === 0` branch in `Threads.tsx`.
