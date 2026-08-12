# Fix duplicate folders, empty-state copy, and lowercase "anren"

## 1. Folder created twice

The new-folder input saves on Enter **and** on blur. When you press Enter (or tap the check), the row closes, which fires a blur whose handler still holds the old typed name — so a second folder is inserted with the same name. `createProject` has no guard against this, so both rows show up in the sidebar.

Fix:
- Add a `submitting` guard in the rail so a save can only run once per opened input; clear the name synchronously via a ref before hiding the row, so a trailing blur has nothing to submit.
- Keep Escape as cancel; blur still saves when the user clicks away without pressing Enter.

Existing duplicate folders can be removed with the row's "Delete folder" menu.

## 2. Empty-state copy

Today the Notes list and a brand-new empty folder render the exact same invitation card ("Talk or write. Anren will keep the thought and write it up."), while the folder header separately says "Nothing here yet" — so the folder view reads like two different messages stacked.

Ideal split:
- **Notes (all notes, no notes yet)** — the welcome invitation: "Talk or write. anren will keep the thought and write it up."
- **Empty folder** — quieter, contextual: "Nothing filed here yet. Record or move a note in and it will live here."
- Drop the duplicated "Nothing here yet" subline in the folder header when the empty card is already showing.

## 3. "anren" always lowercase

Rewrite every user-visible mention to lowercase `anren` (mid-sentence too), across:
- `src/pages/Index.tsx`, `src/pages/ClaudeKey.tsx`, `src/pages/NoteDetail.tsx`
- `src/contexts/RecorderContext.tsx`, `src/hooks/useRecordingRecovery.ts`
- `supabase/functions/process-note/index.ts` (failure messages) — redeploy that function

Code comments and the brand marks (already lowercase) stay as they are.

## Technical notes

- No schema changes; nothing else in the recording pipeline is touched.
- One edge function (`process-note`) is redeployed for the copy change.
