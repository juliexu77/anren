# Folder reflections: "What am I noticing?"

Keep the folder screen as a calm archive. Add one quiet text affordance under the note count that opens a separate reflection view, generated on request from every note in that folder.

## The affordance

Directly under "4 notes", a small underlined text action: **What am I noticing?** — muted, no button chrome, no icon. Hidden when the folder has fewer than 2 notes (nothing to notice yet). Tapping navigates to `/folder/:projectId/reflection`.

## The reflection view

A separate page, same editorial typography as the rest of the app. No cards interleaved with notes anywhere.

Structure, loosely:

```text
[folder emoji] Dreams
What you're noticing · 4 notes

Houses appear in two of these.
   The house in the March note isn't the same house, but both times
   you're moving through rooms you don't recognise.

Safety and threat keep surfacing.
   ...

(3-5 observations, each grounded in a specific note)

──────────────────────────────────

One way to read this
   Something more speculative, visually set apart — lighter weight,
   indented, hairline rule above, labelled as a reading rather than
   a fact.
```

Each observation links to the notes it draws from, so you can jump back to your own words. Regenerate is available but quiet; the reflection is cached so revisiting doesn't re-run it.

## Voice rules for the generation

- Observations name what recurs, and must cite something actually in the notes — no invented details, days, or people.
- Loose, not a template: no fixed headings, no scores, no advice.
- The observations layer stays factual-ish ("houses appear in two dreams"). Interpretation lives only in the single speculative closing block, hedged and labelled ("One way to read this…").
- Second person, tentative, matching the existing look-back voice.
- If the folder is thin or the notes don't relate, say that plainly and stop — better than manufacturing a pattern.

## Recording bar

No change now. Noted for later: collapse the bar to just the round mic on scroll-down on mobile, restore on scroll-up or tap. Worth doing once actual use confirms the archive feels obscured.

## Technical notes

- New edge function `folder-reflection`: loads all non-deleted `ready` notes for a `project_id`, sends title + synthesis + trimmed transcript to Gemini via the shared `chat` helper, returns strict JSON `{ observations: [{ text, grounding, note_ids }], reading }`.
- Reuse the existing `weekly_digests` table (it already carries a nullable `project_id`) or add a small `folder_reflections` table keyed on `(user_id, project_id)` with a `notes_analyzed` count — I'll use a dedicated table so the look-back digest stays untouched, with RLS scoped to `auth.uid()` and the standard GRANTs.
- Cache invalidation: if `notes_analyzed` no longer matches the folder's current note count, show the cached reflection with a quiet "3 new notes since this" line and a refresh action.
- Files: new `src/pages/FolderReflection.tsx`, route in `App.tsx`, affordance added to the header block in `src/pages/Index.tsx`.
