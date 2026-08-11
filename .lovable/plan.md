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

Deliberately not copied: templates, sharing/permissions, calendar integration, attendee handling, teams.

Folders are worth keeping as a later addition — not for organization, but because a long chronological feed eventually needs a way to say "these are all about one thing." They would be simple named collections, private to the user, added after v1.

## What gets deleted

Everything currently in the app is a different product. Removing it all:

- Screens: tasks/cards list, Run My Day, weekly life review, Energy/patterns, address book, connections hub, household sharing, daily brief, current onboarding
- All health/calendar/fitness integrations (Google Calendar, WHOOP, Oura, Strava, Apple Health) and their sync jobs
- The Chrome extension folder, the MCP data-proxy, inbound email capture, push notifications
- All existing tables except `profiles` (auth stays, along with Google sign-in)

The 74 existing cards and 5 reflections will be dropped. If you want them preserved as read-only memories, say so and I'll migrate them into the new notes table instead.

Kept: the design system (Cormorant Garamond + Inter, sanctuary palette, no red), auth, the Capacitor iOS shell, and the microphone/wake-lock recording logic.

## What gets built

**1. Feed (home)** — reverse-chronological, grouped by day ("Today", "Yesterday", then dates). Each entry: title in serif, two-sentence synthesis, time. Freshly captured entries fill in live. A persistent record button sits above the tab bar on every screen.

**2. Capture** — tap to start, tap to stop. Elapsed time, soft pulse, live transcript, screen stays awake. Stopping returns you straight to the feed with the new entry already there.

**3. Note detail** — title, synthesis, "Transcript" toggle, audio playback, and "Ask about this" at the bottom. Edit title, delete.

**4. Search** — one box. Keywords and questions both. Results show the entry plus the matching passage.

**5. On my mind** (built last) — a weekly pass naming the threads across recent entries. Appears only once there's enough to say something honest.

## Technical approach

**Data**

- `notes`: user_id, title, synthesis, transcript, audio_path, duration_seconds, recorded_at, status (`processing` / `ready` / `failed`)
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
