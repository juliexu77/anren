# Show me what I'd be agreeing to

The suggestion in the sidebar ("2 notes seem to belong together — Anren · Make it / Not now") asks for a yes with nothing to go on: no reason, no note titles, and a name that reads like the app itself rather than something you'd say. The fix is to make the suggestion legible before you answer it.

## What changes

**The suggestion shows its evidence.** In both places it appears (sidebar and Reflect):

```text
These sound like one thing — Wednesday coworking
Both are about the coworking day draining you.
· The coworking thing again
· Saying no to Wednesdays
Make it        Not now
```

- The name stays the headline, in editorial serif.
- The one-sentence reason anren already generates is shown in the sidebar too (today it's dropped there).
- The actual note titles it would gather are listed as small rows — that's the real answer to "what am I deciding?".
- Tapping a note title opens that note, so you can check before committing. The suggestion stays put when you come back.
- For an existing project, the line reads "These belong in Wednesday coworking" and the same titles are listed.

**Make it says what happens.** Copy becomes "Make it" / "Add them" as now, with a quiet line under the actions: "Creates the project and files these two notes into it." No hidden effects.

**Names that sound like the app get rejected.** "Anren" was a bad suggestion — the model named the group after the product. The prompt gains an explicit ban on the app's own name and on the words note/thought/journal-as-a-generic, and the server drops any suggestion whose name matches the app name before it ever reaches you.

Nothing else moves: the once-a-day cadence, the dismiss behaviour, and the acceptance path stay as they are.

## Technical notes

- `useProjectSuggestions.ts`: after loading the pending row, fetch `id, title` for its `note_ids` and expose them as `notes` on the suggestion so both variants can render titles. Reject rows whose `name`, lowercased and trimmed, equals `anren`.
- `ProjectSuggestion.tsx`: rail variant gains the reason line, the note-title rows, and the effect line; card variant gains the same title rows. Titles link to `/note/:id`. Styling stays hairline/muted Inter with the clay accent on the affirmative action only — no red on "Not now".
- `supabase/functions/suggest-projects/index.ts`: add to the naming rules that the group must never be named after the app ("anren") or use generic labels already banned; server-side guard drops a suggestion where the name matches the app name, alongside the existing `asleep` check.
