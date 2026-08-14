# Collapsible project cards on the Map

Change the Projects section on the Map so the section header is always open and plain, but each individual project card is collapsed by default.

## Goals

- The "Projects" section on the Map is always visible and never collapsible.
- Each project card is collapsed by default, showing only its name, emoji, "new" dot, and "Active this week" label when applicable.
- Tapping the project header row expands the card to reveal its recent notes, "new since you last looked" meta, and the "Open →" link.
- Empty projects always show "Nothing in here yet." and are not collapsible.
- Persist which projects are expanded in `localStorage` so the state survives reloads.

## Current state

`src/pages/Map.tsx` wraps the entire "Projects" section in an `AccordionItem` with a chevron toggle. `src/components/ProjectOverviewCard.tsx` renders the full card content unconditionally, including the recent notes list and the "Open →" link.

## Proposed changes

1. **Map.tsx**: Remove the "Projects" section from the top-level accordion. Render it as a plain, always-open section with a static header row (no chevron/toggle). Keep the project count label if it exists today.
2. **ProjectOverviewCard.tsx**: Add internal collapse state. Make the title row the toggle, with a small chevron or plus/minus icon that matches the existing hairline/muted vocabulary. Keep the title row always visible; hide the notes list, the "new since you last looked" footer, and the "Open →" link when collapsed. Empty projects are always expanded and show the empty-state message.
3. **Persistence**: Store expanded project IDs in `localStorage` under `anren.mapExpandedProjects`.
4. **Defaults**: All project cards start collapsed. The "Projects" section is open.

## Implementation details

- Use `lucide-react` icons for the expand/collapse indicator on each project card only.
- The expanded state can be managed with a small helper hook in `ProjectOverviewCard.tsx` or inline `useState`/`useEffect` backed by `localStorage`.
- Preserve the existing "new since you last looked" dot behavior on the title row.
- Keep the existing title truncation rules for the visible header; the title can take full available width.


---

# One recording screen everywhere

Continuing a note by voice currently starts recording silently in the background: the mic button in "continue this note" calls the recorder directly, so there is no visual signal that anren is listening. Recording should always feel the same, no matter where it starts.

## Goals

- Tapping the mic in "continue this note" opens the same full-screen recording room used for a new thought: timer, waveform, live transcript, Cancel, and "Keep it".
- The new audio still attaches to the existing note.
- After "Keep it", you land back on the note you were continuing, where the write-up refreshes on its own.
- Cancel returns to the note without changing it.
- Any future recording entry point routes through the same screen.

## Proposed changes

1. **VoiceCapture**: accept a `continues` (note id) search param alongside the existing `folder` and `prompt` params, and pass it into the recorder start call the way `ContinueNote` does today. When `continues` is present, "Keep it" navigates back to `/note/<id>` instead of the capture/notes screen, and the header copy reflects that you're adding to an existing note.
2. **ContinueNote**: replace the direct recorder call with navigation to `/capture?continues=<noteId>` (carrying the note's project when it has one). Typing behavior is unchanged.
3. **Note detail**: on return, refresh the note so the appended transcript and refreshed write-up appear — reuse the existing realtime/refresh path rather than adding new fetching.

## Technical notes

- `src/pages/VoiceCapture.tsx` reads params and calls `start(folderId)`; extend to `start(folderId, continuesId)`, which the recorder already supports.
- `src/components/ContinueNote.tsx` drops its `useRecorder().start` usage for the speak path.
- Keep the existing "words are already saved, synthesis finishes in the background" behavior — no change to `process-note`.


---

# Editing a voice note's own words

Typed notes are already editable under "Your words" — editing the body saves it and re-runs the write-up. Voice notes render the transcript as read-only text, so a mis-transcribed word can't be fixed.

## Goals

- Under "Your words", the transcript of a voice note is editable the same way a typed note's body is.
- Saving an edit re-runs the write-up so the Notes tab summary reflects the corrected words.
- While it re-runs, the existing "You changed the words — reading it over again." state shows.
- If the write-up fails, the edited words are still kept.

## Proposed changes

1. **NoteDetail**: replace the read-only transcript paragraph with a textarea mirroring the typed-note editor (same editorial italic styling, auto-growing rows). Keep a draft in state, seeded from `note.transcript`, and commit on blur when it changed.
2. **Save path**: generalize the existing `saveBody` helper so it writes `transcript` for voice notes and `body` for typed ones, then sets status to `processing` and invokes `process-note` with `regenerate: true` exactly as it does today.
3. **Meta line**: the "exactly as you said it" caption no longer fits an edited transcript — show it only when the words are unedited, otherwise drop it.

## Technical notes

- `src/pages/NoteDetail.tsx` around the `words` tab and the `saveBody` function.
- Reuse the existing `patch` + `process-note` + `reload` flow; no edge function or schema changes needed.
- Keep the audio player below the editor untouched — the original recording stays available.
