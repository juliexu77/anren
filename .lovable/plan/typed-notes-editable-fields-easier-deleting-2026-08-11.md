# Typed notes, editable fields, easier deleting

## What you'll be able to do

1. **Write a note instead of speaking one.** Next to the microphone there's a small "Write" affordance. It opens a plain sheet: a body field (paste from Claude, ChatGPT, anywhere), an optional title, and a date. Save and it lands in the feed like any other note.
2. **Backdate it.** Typed notes let you set the date and time, so something you said elsewhere last Thursday files itself under Thursday, not today.
3. **Anren still writes it up.** After saving, the pasted text is titled and summarised (and indexed for search and Related) the same way a recording is. If you gave it your own title, yours is kept.
4. **Edit any note.** On a note page, the title, the date, the write-up, and — for typed notes — the body itself become editable in place. Click, change, it saves. Recordings keep their transcript read-only (it's what you actually said), but their title, date and write-up are yours to fix.
5. **Deleting feels light, the way Granola does it.**
   - Feed rows get a quiet "…" menu on hover (always visible on touch) with **Open**, **File in…**, **Delete**.
   - Deleting removes it right away and drops a small "Note deleted · Undo" toast. Undo restores it. No modal, no "are you sure".
   - Folders get the same treatment in the sidebar: hover a folder, "…" menu with **Rename**, **Change icon**, **Delete folder** — plus the same undo toast. Notes inside are never deleted, they just return to the main list.
   - The trash icon on the note page stays, but also gets undo instead of silent deletion.

## Notes on behaviour

- Empty typed notes can't be saved — the body is required.
- Date editing is a compact date + time picker defaulting to now; the feed's day grouping and On my mind follow whatever date you set.
- Undo has a short window (a few seconds). After it passes, the delete is permanent, and audio is only removed from storage once the window closes.

## Technical outline

**Database (one migration)**
- Add `notes.source text not null default 'voice'` (`'voice' | 'typed'`) and `notes.body text` for typed content.
- Add `notes.deleted_at timestamptz` for soft-delete, so undo is trivial and audio cleanup can be deferred. Existing RLS covers it; all note reads gain `.is('deleted_at', null)`.

**Frontend**
- `src/components/ComposeSheet.tsx` — new typed-note sheet (body, optional title, datetime, folder defaults to the folder you're viewing). Inserts a `notes` row with `source: 'typed'`, `body`, `recorded_at`, `status: 'processing'`, then invokes the write-up function.
- `src/components/CaptureBar.tsx` — add a pencil button beside the mic that opens the sheet.
- `src/hooks/useNotes.ts` — extend `updateNote` to cover `title`, `synthesis`, `body`, `recordedAt`; replace hard delete with soft delete plus `restoreNote`; filter out soft-deleted rows.
- `src/components/NoteRow.tsx` — hover "…" dropdown (Open / File in… / Delete).
- `src/components/ProjectRail.tsx` — hover "…" dropdown per folder (Rename inline, Change icon via the existing picker, Delete).
- `src/hooks/useProjects.ts` — soft-delete/restore for folders (add `projects.deleted_at` in the same migration) so folder undo works too.
- `src/pages/NoteDetail.tsx` — inline-editable title (contenteditable-style input), a date/time editor on the timestamp line, editable write-up, editable body for typed notes.
- `src/lib/undo.ts` — small helper wrapping the sonner toast with an action button and a timer that finalises the delete.
- `src/types/note.ts` — add `source`, `body` to `Note` and map them.

**Edge functions**
- `process-note` — accept notes with no audio: when `source = 'typed'`, skip transcription and run the same synthesis + chunk/embed path over `body`. Keep an existing user-supplied title if present.
- `delete-account` and the data-proxy note reads — respect `deleted_at`.
- A tiny scheduled cleanup isn't needed; finalising a delete on the client removes the row and its audio, and any row left soft-deleted stays hidden.

**Prompt note**
Typed notes are your own words already, so the synthesis prompt gets a short variant: summarise without implying it was spoken, and keep the three-voice rule (body stays "I", write-up stays "you").
