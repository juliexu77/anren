# Home becomes the blank page

Two changes: the project suggestion moves to Reflect, and Home stops being the notes list.

## 1. Move the project suggestion to Reflect

Today the suggestion card renders at the top of the notes feed (`Index.tsx`, only when no project is selected and there are 5+ notes). It moves to the Reflect screen, above **Ask anren**, since Reflect is where you pause and let anren hand something back.

The card itself doesn't change: anren names one grouping at a time, you accept or wave it away.

## 2. Home = capture surface

New route `/` renders a Home screen instead of the notes list. Notes moves to `/notes`.

Home contains, vertically centred on the page:

- the `anren` mark
- one soft line: "What's on your mind?"
- the capture object, large and central — big mic as the primary action, with a text field beneath it that reads "Type or copy/paste from elsewhere…"

Nothing else. No recent notes, no projects, no digest, no reflection nudge.

**The reset loop.** On Home only:

1. You press the mic → the line and mark recede, the live transcript appears in place of the prompt as you speak.
2. You stop → "anren is writing it up…"
3. Once saved → a brief quiet confirmation: "Kept it." plus, if anren filed it, "in <Project>" — with an unobtrusive *open it* link.
4. After a few seconds it fades and Home returns to blank.

You are never navigated away from Home by capturing. Typed notes follow the same loop.

**Everywhere else** (Notes, a project, Search, Reflect, a note) keeps the existing persistent bottom composer, unchanged — including its current behaviour of opening the new note after recording.

## Sidebar

Nav becomes: Home · Notes · Search · Reflect, with Projects listed below as today. The `anren` wordmark at the top of the rail and the mobile top bar both link to Home.

## Technical notes

- `src/pages/Home.tsx` — new. Reuses `RecorderContext` (`start`/`stop`/`liveText`/`elapsed`/`level`) and the same typed-note insert + `process-note` / `associateNote` calls the composer uses, factored into a small shared hook (`src/hooks/useTextCapture.ts`) so Home and `CaptureBar` don't diverge.
- `src/components/CaptureSurface.tsx` — new. The large centred mic + textarea + live transcript + confirmation states. Styled from the auth/onboarding capture object.
- `src/App.tsx` — `/` → `Home`, add `/notes` → `Index`; `/folder/:projectId` unchanged.
- `src/components/AppShell.tsx` — hide `<CaptureBar />` on `/`; Home manages its own vertical centring (no bottom-bar padding reservation on that route). The recording-recovery card still needs a host on Home — it renders inside `CaptureSurface`.
- `src/pages/Index.tsx` — drop `ProjectSuggestion`; keep `ReflectNudge`, feed, project header, folder reflection. Empty state copy for the no-project case shifts to "Nothing kept yet — start on Home."
- `src/pages/Reflect.tsx` — render `ProjectSuggestion` above `AskNotes`, enabled once the user has 5+ notes (count read via `useNotes`).
- `src/components/ProjectRail.tsx` — add the Home nav item; `Notes` points at `/notes`.
- No database or edge function changes.
