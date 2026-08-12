# Adopt the compact notes list

Bring the notes feed in line with the reference: one tidy meta line, a strong title, a single-line preview, and tighter rows — so more thoughts fit on a phone screen without feeling crowded.

## What changes

**Row layout (`NoteRow.tsx`)**
- Merge metadata into one top line: `PROJECT · Today · 8:14 PM`, small caps, project name in colour, date/time in muted grey.
- Title stays the editorial serif, sits directly under the meta line.
- Preview drops to a single line (`line-clamp-1`) instead of two.
- Duration and the typed-note pencil move onto the same meta line so no third row is needed.
- Vertical padding tightens (roughly `py-7` → `py-5`), keeping the hairline divider between rows.

**Feed (`Index.tsx`)**
- Remove the "Today / Yesterday / Monday" day-group headings; the date now lives on each row, exactly as in the reference. Notes render as one continuous hairline-divided list in reverse-chronological order.
- Heading becomes "All notes" for the unfiled feed (project views keep the project name).
- Drop the "N notes" counter line under the heading so the capture line sits right below the title; the auto-filed note remains visible inside project views only.

**Capture line**
- Unchanged in behaviour; spacing tightened slightly so it hugs the title like the reference.

Inside a project view the project label stays hidden (it would repeat the page title), so those rows show `Today · 8:14 PM` only.

## Notes
No data, schema, or capture-flow changes — presentation only. Existing context menu (open / add to project / delete) stays where it is.
