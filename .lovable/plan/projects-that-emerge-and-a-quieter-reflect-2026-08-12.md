# Projects that emerge, and a quieter Reflect

Two moves: calm the Reflect screen down, and make Projects something anren notices rather than something you maintain.

## 1. Reflect screen

- Remove the theme pills entirely from Reflect. No vibe tags there anymore.
- The weekly reading is collapsed by default: the header shows the week, and below it a quiet underlined line — *Read this week back* — that expands the narrative paragraph. Collapsed again on tap.
- Everything else stays: "Look again", the read-back date, and Ask about your notes below.
- Folder reflections (inside a project) keep their pills for now — the ask was specific to Reflect.

## 2. Folders become Projects

Rename every user-facing "Folder" to "Project": drawer heading, new-project button and placeholder, note context menus ("Move to project"), empty states, toasts. Routes stay `/folder/:id` so existing links keep working.

Copy shift: nothing in the UI says "organize" or "file". Projects are described as bodies of thinking — "a thread you keep coming back to".

## 3. anren notices the shape (the real change)

### Suggestions in the feed

Above the Notes feed, at most one quiet card at a time:

```text
These sound like one thing — Meals & cooking
4 recent notes                          Yes, make it   Not now
```

and for projects that already exist:

```text
This sounds like Writing concepts
2 recent notes aren't in it yet         Add them   Not now
```

Accepting creates the project (with its ink glyph) or adds the notes, then confirms softly: "Meals & cooking — anren will keep an eye on it." Dismissing puts that shape to sleep so it doesn't nag again.

### Quiet association afterwards

Once a project exists, each newly processed note is matched against existing projects in the background. A confident match is associated silently — no prompt, no "moved" language. The note still appears exactly where it always did in the chronological Notes feed; a project is a lens over notes, never a place they leave. Low-confidence matches do nothing; they may later show up as a suggestion card.

A project page gains a small line when notes were associated this way, so it never feels like something happened behind your back: *anren added 3 notes here.*

### Cadence

anren looks for shapes when there are at least 5 unassociated notes, then at most once a day. No suggestion appears during onboarding or on a near-empty account.

## Technical notes

- `src/pages/Reflect.tsx`: drop the `ThemePills` import and render; wrap `digest.narrative` in a collapsible disclosure (same pattern as `FolderReflection`'s toggle). `ThemePills` stays in the codebase for folder reflections.
- New table `project_suggestions`: `id`, `user_id`, `kind` ('new' | 'existing'), `name`, `project_id` (nullable), `note_ids uuid[]`, `status` ('pending' | 'accepted' | 'dismissed'), `created_at`. RLS scoped to `auth.uid()`, plus GRANTs for `authenticated` and `service_role`.
- New edge function `suggest-projects`: pulls recent notes lacking `project_id` with their titles/synthesis, asks Claude for at most one coherent grouping, prefers an existing project when the fit is clear, writes a pending row. Called from the client on the cadence above, deduped against pending/dismissed rows.
- New edge function `associate-note` (or a step at the end of `process-note`): given a note and the user's projects, returns a confident `project_id` or nothing, and sets `notes.project_id` when confident. Records nothing else.
- New component `src/components/ProjectSuggestion.tsx` + `src/hooks/useProjectSuggestions.ts` (fetch pending, accept, dismiss). Rendered at the top of `src/pages/Index.tsx` for the unfiled feed only.
- Accepting a 'new' suggestion reuses `createProject` from `useProjects` (keeping the emoji suggestion and the stipple-in animation), then bulk-updates `notes.project_id`.
- Copy-only rename pass across `ProjectRail.tsx`, `NoteRailItem.tsx`, `NoteRow.tsx`, `Index.tsx`, `useProjects.ts` toasts, `Settings.tsx`, and onboarding cards.
