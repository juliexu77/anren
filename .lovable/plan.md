# Fix the ghost note after delete, QA pass, and long-press note menu

## 1. Why a deleted note still shows up

Confirmed from the code and the database:

- **Live updates are off.** No tables are in the realtime publication, so the `postgres_changes` subscriptions in the notes hooks never fire. Nothing in the sidebar or the feed ever refreshes on its own — this also means a note being written up never flips from "Writing this up…" to its finished title without a manual reload.
- **The delete isn't awaited.** Deleting from a note screen fires the update without waiting, then immediately navigates to the archive, which refetches. The refetch can win the race and read the note as still alive.
- **The sidebar list is a separate copy.** Even a correct refetch on the feed doesn't touch the "Recent" list in the sidebar, so the note lingers there.

Fixes:
- Add `notes` and `projects` to the realtime publication (with replica identity set) so live fill-in and cross-screen removal actually work.
- Await the soft delete before navigating away, and remove the note from local state optimistically in both the feed and the sidebar.
- Give the archive and the sidebar one shared source of truth for the note list, so a delete anywhere disappears everywhere at once.

## 2. Long-press menu on sidebar notes

Each note in "Recent" gets the same menu the folders already have, opened by:
- long press (~500 ms) on touch, or right-click / the hover "…" button on desktop,
- long press suppresses the navigation tap and any text selection.

Menu items: **Rename**, **Move to folder** (submenu of folders + "Remove from folder"), **Delete** — delete keeps the quiet Undo toast, no red styling.

## 3. Wider QA pass

Checks and fixes across the app:
- Soft-deleted rows left behind when the 6-second Undo window is interrupted by a reload — sweep them so they can't resurface or hold audio.
- Stuck `processing` notes: make sure the feed and detail views describe them honestly rather than looking broken.
- Verify deleting a folder correctly leaves its notes intact and navigates out of the folder view.
- Verify note edits (title, date, folder, body) persist and don't get overwritten by an in-flight refetch.
- Walk the main flows in a browser pass (record → feed → open → edit → delete, search, folder reflection, on my mind) and fix whatever breaks.

## Technical notes

- Migration: `alter publication supabase_realtime add table public.notes, public.projects;` plus `alter table ... replica identity full` so deletes/updates carry the row.
- `src/hooks/useNotes.ts`: make `softDeleteNote` async/awaited; lift the notes list into a small shared store (or a context provider around the shell) consumed by `Index.tsx` and `ProjectRail.tsx`.
- `src/pages/NoteDetail.tsx`: await delete, then navigate.
- `src/components/ProjectRail.tsx`: add a `NoteRailItem` with a `useLongPress` hook driving the existing `DropdownMenu`.
