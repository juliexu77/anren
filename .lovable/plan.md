# Collapsible project cards on the Map

Change the Projects section on the Map so the section itself stays open, but each individual project card is collapsed by default.

## Goals

- The "Projects" section on the Map is always visible/expanded.
- Each project card is collapsed by default, showing only its name, emoji, "new" dot, and "Active this week" label when applicable.
- Tapping the project header row expands the card to reveal its recent notes, "new since you last looked" meta, and the "Open →" link.
- Empty projects always show "Nothing in here yet." and are not collapsible.
- Persist which projects are expanded in `localStorage` so the state survives reloads.

## Current state

`src/pages/Map.tsx` wraps the entire "Projects" section in an `AccordionItem` that is collapsed by default. `src/components/ProjectOverviewCard.tsx` renders the full card content unconditionally, including the recent notes list and the "Open →" link.

## Proposed changes

1. **Map.tsx**: Remove the "Projects" section from the top-level accordion (or keep it permanently open). Render the project cards as a plain list with the section header always visible.
2. **ProjectOverviewCard.tsx**: Add internal collapse state. Make the title row the toggle, with a small chevron/plus-minus icon that matches the existing hairline/muted vocabulary. Keep the title row always visible; hide the notes list, the "new since you last looked" footer, and the "Open →" link when collapsed. Empty projects are always expanded and show the empty-state message.
3. **Persistence**: Store expanded project IDs in `localStorage` under `anren.mapExpandedProjects`.
4. **Defaults**: All project cards start collapsed. The "Projects" section is open.

## Implementation details

- Use `lucide-react` icons for the expand/collapse indicator.
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

