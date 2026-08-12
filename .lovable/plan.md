# Capture becomes a mode, not a composer

Rewire how you *enter* capture. No visual redesign: same paper ground, clay-rose accent, Fraunces/Inter scale, hairline borders, spacing philosophy, sidebar and Reflect styling stay as they are.

## What changes

**1. The floating composer goes away**
The persistent mic + text bar disappears from Notes, folders, Reflect, Search and note detail. Browsing screens get their content space back (and the reserved bottom padding goes with it).

**2. A quiet capture line on Notes**
Under the title and note count, before the first day group, one printed-looking line:

```text
What's on your mind?                    ( mic )  ( pencil )
```

Italic editorial prompt in muted ink, two small unfilled icon buttons, hairline rule beneath — no pill, no container, no filled button. Tapping the prompt or pencil opens Writing capture; the mic opens Voice capture. The same line appears on a folder view (it captures into that folder). Not added to Reflect, Search or note detail.

**3. "New thought" in the sidebar**
Directly under the anren wordmark, above Notes: a `+ New thought` row styled like the existing nav rows (hairline-bordered, muted terracotta text, not a black block). It goes to the capture state where you choose voice or writing.

**4. Voice capture becomes a focused state**
Recording leaves the page behind and enters a full-screen private room on the paper ground: elapsed time, a soft clay-rose waveform driven by the existing level meter, live transcript as the dominant text, Cancel, and a clear finish control. On finish it goes to the new note, exactly as today. Light, not dark — derived from the current palette.

**5. Writing capture becomes a sheet**
A full-page writing state: `Cancel · NEW THOUGHT · Keep`, then a borderless auto-growing textarea with "Type it, or paste it from wherever it lives…". Long pastes are comfortable. Save path, synthesis and auto-filing are untouched.

**6. Entry state**
`/` stays the calm capture surface it already is (no Home nav item), now presenting the two modes rather than a mic plus an inline box.

**7. Folder suggestions**
The existing project suggestion (already built, currently on Reflect) also gets a quiet slot beneath Projects in the sidebar — one line, e.g. "3 notes seem to belong together", with a create/add action. No new folder-management system.

## Visual notes adopted from the references

Worth taking, all achievable inside the current system:
- **Roomier note rows** — more vertical breathing room per row, project label as a small uppercase tracked line above the title, title in editorial serif, one-line muted preview, hairline divider between rows. This is the spacing/format you liked.
- **Day/section labels** stay as-is (they already match).
- Everything else in the concepts (dark nav blocks, colored folder dots, beige sidebar, heavier type, new icon language) is skipped.

## Technical outline

- Routes: `/capture/voice` and `/capture/write` as focused full-screen states rendered outside the shell chrome, plus optional `?folder=<id>` so the Notes/folder affordance captures into the right place.
- `CaptureBar.tsx` is removed from `AppShell`; its logic already lives in `useRecorder` and `useTextCapture`, which both new states reuse unchanged. The recovery banner moves to the capture entry state.
- `CaptureSurface.tsx` is reduced to the two-mode chooser; the "Kept it… open it" confirmation behaviour is preserved.
- New: `CaptureLine.tsx` (the quiet Notes affordance), `pages/VoiceCapture.tsx`, `pages/WriteCapture.tsx`.
- Edits: `App.tsx`, `AppShell.tsx`, `ProjectRail.tsx`, `Index.tsx`, `NoteRow.tsx`, `Reflect.tsx`, `Home.tsx`.
- No edge function, schema, transcription, synthesis or association changes.
