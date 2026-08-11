# Anren v2: a private voice-memo notetaker

Reset the app to one idea: tap, ramble, and get back a titled, synthesized, searchable memory.

## Review of your thinking

You're right on the core bet, and right to make it smaller than Granola. Granola's complexity comes from meetings — attendees, calendar hooks, templates, shared notes, folders, teams. Solo capture removes all of that, which leaves exactly the part that made it feel magical: messy capture in, a titled synthesis out, permanently findable.

Two refinements worth making:

- **The title is the product.** A title that names the actual thought — not "Recording 47" — is what makes the feed feel like a mind rather than a folder. That deserves its own prompt pass with real care; it is not a byproduct of the summary.
- **Skipping Google Docs in v1 is correct.** Export can arrive later as plain markdown; a Doc is a worse database.

And I agree the synthesis surface is worth keeping — just quiet, and built last.

## How it compares to Granola as a user

The product grammar is the same: capture → AI synthesis → archive → ask. Where it differs:

| | Granola | Anren |
| --- | --- | --- |
| Trigger | Joins a meeting, listens to everyone | You tap one button and talk |
| Your input during capture | You type sparse notes while it listens | You just talk; nothing to type |
| Output | Structured meeting summary from a template | A title that names the thought + a short synthesis |
| Archive | Notes list with folders, people, shared links | One chronological feed, private |
| Ask | Chat with a note or across notes | One search box: keywords and questions both |

So it will feel very familiar, minus the meeting scaffolding. The moment that matters most — stop capturing, watch a mess become something titled and readable — is identical.

## Granola's UX moves worth copying exactly

1. **The archive is the home screen, not the recorder.** Granola opens on your notes list. Anren opens on the feed; recording is one persistent button, always reachable, never a screen you have to navigate to first.
2. **Capture is calm and shows it's listening.** Granola shows a small live panel, not a big waveform spectacle. Anren: elapsed time, a soft pulse, and live transcript text scrolling in so you trust it's working. Screen stays awake.
3. **Enhancement happens right after you stop, in place.** Granola swaps raw notes for the enhanced version on the same page with a brief shimmer. Anren does the same: the new entry appears at the top of the feed instantly with the transcript visible, then the title and synthesis fill in over it. No spinner screen, no "processing" limbo page.
4. **Summary first, transcript one tap away.** Granola's note detail leads with the summary and keeps the raw transcript behind a toggle. Anren mirrors that: title, synthesis, then a "Transcript" toggle, with audio playback understated below it.
5. **Search is one box, no mode switch.** Granola has a single search that feels like asking. Anren does the same — the box handles literal words and full questions with no toggle to think about.
6. **Ask this note.** Granola's per-note chat is one of its best moments. Anren gets a single-line "Ask about this" at the bottom of note detail — answers grounded in that transcript only.
7. **Keyboard/gesture-fast, quiet visuals.** Text-forward, generous whitespace, no chrome competing with the writing. Our existing serif/sans system already fits this.

8. **Sidebar with projects/folders.** Granola's left rail lists folders above the notes list. Anren keeps that shape: a projects rail, and any note can be filed into a project (or left unfiled in the feed).

Deliberately not copied: templates, sharing/permissions, calendar integration, attendee handling, teams — this is a single-user app throughout.

## What gets deleted

Everything currently in the app is a different product. Removing it all:

- Screens: tasks/cards list, Run My Day, weekly life review, Energy/patterns, address book, connections hub, household sharing, daily brief, current onboarding
- All health/calendar/fitness integrations (Google Calendar, WHOOP, Oura, Strava, Apple Health) and their sync jobs
- The Chrome extension folder, the MCP data-proxy, inbound email capture, push notifications
- All existing tables except `profiles` (auth stays, along with Google sign-in)

The 74 existing cards and 5 reflections will be dropped. If you want them preserved as read-only memories, say so and I'll migrate them into the new notes table instead.

Kept: auth, the Capacitor iOS shell, and the microphone/wake-lock recording logic. The visual system is being rebuilt (below) — the current sanctuary palette goes with the old product.

## Visual direction: Granola's structure, not Granola's masculinity

Granola looks like a tool made by men for men in enterprise sales: cool grays, tight blue accents, dense information, a slightly cold productivity edge. The layout logic is excellent and we keep it exactly. The surface gets rebuilt.

What we take from Granola: the calm document look, generous whitespace, text-forward hierarchy, small quiet UI chrome, a left rail, subtle dividers instead of heavy cards, and restraint in color.

What changes:

- **Palette** — warm neutrals instead of cool gray: soft ivory and oat backgrounds, a deep muted plum/ink for text, and one warm accent (dusty rose or clay) used sparingly for the record state and active items. No corporate blue. No red anywhere.
- **Typography** — a real editorial pairing rather than a UI sans everywhere: a warm serif for titles and note bodies, a clean humanist sans for interface labels. Titles get room to breathe; they read like a diary heading, not a row label.
- **Shape and texture** — softer radii, hairline warm-toned dividers, gentle shadowless surfaces, a hint of paper warmth in the background rather than flat white.
- **Density** — one notch looser than Granola. It should feel like reading, not scanning a CRM.
- **Motion** — slow and soft: a breathing pulse while recording, a quiet shimmer as the synthesis lands, cross-fades instead of slides.

Everything defined as semantic tokens in the global CSS so the whole app is themable in one place.

Once the shell exists I'll offer a few rendered directions for the feed and note detail so you can pick the exact look rather than accept mine.

## What gets built

**1. Feed (home)** — reverse-chronological, grouped by day ("Today", "Yesterday", then dates). Each entry: title in serif, two-sentence synthesis, time, and its project if it has one. Freshly captured entries fill in live. A persistent record button always within reach.

**2. Capture** — tap to start, tap to stop. Elapsed time, soft pulse, live transcript, screen stays awake. Stopping returns you straight to the feed with the new entry already there.

**3. Note detail** — title, synthesis, "Transcript" toggle, audio playback, project picker, and "Ask about this" at the bottom. Edit title, delete.

**4. Projects** — a rail (sidebar on desktop, slide-over on mobile) listing your projects with counts. Create, rename, delete. Tapping one filters the feed to it. A note can belong to one project, assigned from note detail or via long-press in the feed. Unfiled notes still live in the main feed — filing is optional, never a required step.

**5. Search** — one box. Keywords and questions both, across everything or scoped to the current project. Results show the entry plus the matching passage.

**6. On my mind** (built last) — a weekly pass naming the threads across recent entries, with the option to run it for a single project.

## Technical approach

**Data**

- `projects`: user_id, name, position — private per user
- `notes`: user_id, project_id (nullable), title, synthesis, transcript, audio_path, duration_seconds, recorded_at, status (`processing` / `ready` / `failed`)
- `note_embeddings`: note_id, chunk_index, content, embedding vector — transcripts are chunked so search points at passages, not whole notes
- `weekly_digests`: user_id, week_start, narrative, themes
- A generated `tsvector` column on `notes` for keyword search
- Private `voice-notes` storage bucket, one folder per user, RLS-scoped so audio is only reachable by its owner via signed URLs
- Enable the `vector` and `pg_trgm` extensions (both available, currently uninstalled)

**Pipeline** — client records PCM and uploads a complete WAV to storage, then calls `process-note`, which transcribes via Lovable AI speech-to-text → generates title + synthesis in one structured-output call → chunks the transcript and stores embeddings → flips status to `ready`. Live transcript during capture comes from streaming transcription; the feed subscribes to row changes so entries fill in without a refresh.

**Search** — a `hybrid_search_notes` database function combining full-text rank with vector cosine distance (reciprocal rank fusion). The query is embedded server-side in a `search-notes` function, so one box handles both literal and conceptual queries.

**Ask about this** — a small function that answers from a single note's transcript, no retrieval across the archive.

**Digest** — a weekly scheduled job builds the "On my mind" narrative.

## Order of work

1. Migration: drop old tables, create the new ones, extensions, bucket, RLS and grants
2. Strip the old app to auth + shell; feed-first layout with the persistent record button
3. Capture + upload + `process-note`, with the in-place fill-in moment
4. Note detail: summary/transcript toggle, playback, ask
5. Hybrid search
6. Weekly "On my mind"
7. Onboarding: record once, watch it become a memory

## What I need from you

Nothing new — transcription, synthesis, and embeddings all run on infrastructure already wired into this project. Just confirm whether to discard or migrate the existing 74 cards.
