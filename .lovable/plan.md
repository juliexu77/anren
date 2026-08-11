# Anren v2: a private voice-memo notetaker

Reset the app to one idea: tap, ramble, and get back a titled, synthesized, searchable memory.

## Review of your thinking

You're right on the core bet, and right to make it smaller than Granola. Granola's complexity comes from meetings — attendees, calendar hooks, templates, shared notes. Solo capture removes all of that, which leaves exactly the part that made it feel magical: messy capture in, a titled synthesis out, permanently findable.

Two refinements worth making:

- **The title is the product.** "Why Nancy's idea made me protective of mine" is what makes the feed feel like a mind, not a folder. That deserves its own prompt pass with real care — it is not a byproduct of the summary.
- **Skipping Google Docs in v1 is correct.** Export can arrive later as plain markdown; a Doc is a worse database.

One thing I'd push back on gently: don't defer "What's been on my mind?" too long. Once you have ~10 entries, the weekly synthesis is what turns a recorder into a second brain — but it should be a quiet fourth surface, not a homepage.

## What gets deleted

Everything currently in the app is a different product. Removing it all:

- Screens: tasks/cards list, Run My Day, weekly life review, Energy/patterns, address book, connections hub, household sharing, daily brief, current onboarding
- All health/calendar/fitness integrations (Google Calendar, WHOOP, Oura, Strava, Apple Health) and their sync jobs
- The Chrome extension folder, the MCP data-proxy, inbound email capture, push notifications
- All existing tables except `profiles` (auth stays, along with Google sign-in)

The 74 existing cards and 5 reflections will be dropped. If you want them preserved as read-only memories, say so and I'll migrate them into the new notes table instead.

Kept: the design system (Cormorant Garamond + Inter, sanctuary palette, no red), auth, the Capacitor iOS shell, and the microphone/wake-lock recording logic.

## What gets built

**1. Record** — one large button at center. Tap to start, tap to stop. Elapsed time, a soft waveform, screen stays awake. That's the entire screen.

**2. Feed** — reverse-chronological, grouped by day ("Today", "Yesterday", then dates). Each entry is a title in serif, a two-sentence synthesis underneath, and the time. Processing entries show a gentle "listening back…" state and fill in when ready.

**3. Search** — one box, no filters or toggles. Typing matches exact words; asking a question matches by meaning. Results show the entry plus the matching passage.

**4. Note detail** — title, synthesis, then the full transcript in comfortable reading type. Audio playback available but understated. Edit the title, delete the note.

**5. On my mind** (built last) — a weekly pass across recent entries that names the threads running through them. Appears only once there's enough to say something honest.

## Technical approach

**Data**

- `notes`: user_id, title, synthesis, transcript, audio_path, duration_seconds, recorded_at, status (`processing` / `ready` / `failed`)
- `note_embeddings`: note_id, chunk_index, content, embedding vector(1536) — transcripts are chunked so search points at passages, not whole notes
- `weekly_digests`: user_id, week_start, narrative, themes
- A generated `tsvector` column on `notes` for keyword search
- Private `voice-notes` storage bucket, one folder per user, RLS-scoped so audio is only reachable by its owner via signed URLs
- Enable the `vector` and `pg_trgm` extensions (both available, currently uninstalled)

**Pipeline** — client records PCM and uploads a complete WAV to storage, then calls `process-note`, which: transcribes via Lovable AI speech-to-text → generates title + synthesis via one structured-output call → chunks the transcript and stores embeddings → flips status to `ready`. The feed subscribes to changes so the entry fills in live.

**Search** — a `hybrid_search_notes` database function combining full-text rank with vector cosine distance (reciprocal rank fusion). The query is embedded server-side in a `search-notes` function, so one box handles both literal and conceptual queries with no mode switch.

**Digest** — a weekly scheduled job builds the "On my mind" narrative from the week's entries.

## Order of work

1. Migration: drop old tables, create the new ones, extensions, bucket, RLS and grants
2. Strip the old app down to auth + shell; three-tab nav (RECORD · FEED · SEARCH), all caps, text only
3. Record screen + upload + `process-note` pipeline
4. Feed with live status, and note detail with playback
5. Hybrid search
6. Weekly "On my mind"
7. A short, honest onboarding: record once, watch it become a memory

## What I need from you

Nothing new — the transcription, synthesis, and embedding models all run on infrastructure already wired into this project. Just confirm whether to discard or migrate the existing 74 cards.
