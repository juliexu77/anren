# Make "What am I noticing?" open in place

The problem is the navigation, not the feature. Tapping a small line of text and landing on a whole new page reads like a mode change — and because the label is a question, it looks like it might want an answer from you.

## The change

Keep the affordance exactly where it is, under the note count, but make it expand in place instead of routing.

- Label becomes a statement, not a question: **Reflect on these notes** — with a small chevron so it reads as something that opens, not something that takes you somewhere.
- Tapping expands a panel directly below it, above the day-grouped notes. The archive stays visible underneath; you never leave the folder.
- While it thinks: "Reading these back…" in the panel, no spinner takeover.
- Once open, the label flips to "Hide reflection" with the chevron rotated. Collapsing keeps the result cached, so reopening is instant.
- The panel content is the same as today's page: 3-5 grounded observations, each linking back to its notes, then the hairline-separated "One way to read this" block. Slightly inset with a hairline left edge so it's visually distinct from the notes list without becoming a loud card.
- "Read again" stays, but as a quiet text link at the bottom of the panel rather than a button in the header.

```text
Dreams
4 notes
Reflect on these notes  ⌄
┌─ (hairline)
│  Houses appear in two of these.
│     The house in the March note isn't the same house…
│     Unfamiliar house · Long hallway
│
│  … 3-5 observations …
│  ─────────────────
│  ONE WAY TO READ THIS
│     Something more tentative, set apart.
│
│  Read again
└─
TODAY
  note
  note
```

## What gets removed

The `/folder/:projectId/reflection` route and page go away. Nothing else about the folder screen changes, and the capture bar is still untouched.

## Technical notes

- New `src/components/FolderReflection.tsx` as a collapsible section, receiving `projectId` and the folder's notes; it owns the fetch from `folder_reflections`, the `folder-reflection` invoke, and open/closed state.
- Rendered from `src/pages/Index.tsx` under the header, only when `projectId` is set and there are 2+ notes.
- Delete `src/pages/FolderReflection.tsx` and its route in `App.tsx`.
- Generation no longer auto-fires on mount — it runs on first expand only, so opening a folder never triggers a model call.
- The edge function and `folder_reflections` table stay as they are.
