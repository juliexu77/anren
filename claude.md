## Project summary

- **Name**: ANREN (\"Where the mental load rests\")
- **What it is**: A private, single-user voice‑memo notetaker. You record or type a thought; anren transcribes it, writes a short title + synthesis, and quietly keeps it — filing it into a project you deliberately keep, or noticing that it's part of a "thread" (a loose grouping of notes that keeps recurring on its own). There is a weekly/on‑demand "Reflect" read‑back, full‑text + semantic search over your own notes, and an "ask your notes" Q&A surface. This is a rewrite of an earlier "BrainCard" task/calendar app — that model (tasks, ongoing items, calendar‑bound events, Google Calendar sync, address book/people, household/partner nudges) has been removed from the product.
- **Stack**:
  - **Frontend**: React 18 + TypeScript + Vite, React Router, shadcn-ui, Tailwind.
  - **Data & auth**: Supabase (Postgres + pgvector, Auth, Storage, Edge Functions).
  - **AI**:
    - Chat / write‑ups (note synthesis, titles, threads, project suggestions, folder reflections, weekly digest, ask‑note/ask‑notes, search answers) call **Claude Sonnet 4.5 directly via the Anthropic Messages API** (see `supabase/functions/_shared/ai.ts`), on Anren's own `ANTHROPIC_API_KEY` up to a free allowance, then on the user's own connected key (BYO Claude key, see below).
    - Embeddings for semantic search (`google/gemini-embedding-001`) still go through **Lovable's AI gateway** (`LOVABLE_API_KEY`), not Anthropic.
    - Audio transcription calls **OpenAI's `gpt-4o-mini-transcribe`** directly (`OPENAI_API_KEY`) — not Claude, not Gemini.
  - **Mobile shell**: Capacitor (iOS primary target). Push notifications via `@capacitor/push-notifications`. Native Google sign‑in via **Capgo Social Login** (login only — no Google Calendar integration remains). `@capacitor-community/contacts` and `@perfood/capacitor-healthkit` are leftover npm dependencies from earlier experiments (Contacts, HealthKit) that are **no longer wired into any feature** — see "Things that look present but aren't wired up" below.
  - **Chrome extension**: Removed from the product. The `extension/` source, build tooling, and docs were deleted from git (see `git log --oneline -- extension/`, most recently commit `bdff46e`). What remains on disk under `extension/` (`node_modules/`, `dist/`, `.env`, a stray `src/.DS_Store`) is untracked build debris, not part of the shipped app — do not resurrect it or treat `npm run build:extension` as a supported script without checking with the user first (the script is still listed in `package.json` but its target no longer exists in git).

## Domain model

- **Note** (`src/types/note.ts`, table `notes`) — the core unit. Fields: `id`, `projectId`, `title`, `synthesis` (3–6 bullet write‑up), `transcript`, `body` (typed notes), `source` (`voice` | `typed`), `audioPath`, `durationSeconds`, `recordedAt`, `status` (`processing` | `ready` | `failed` | `needs_key`), `errorMessage`, `autoFiledAt` (set when anren auto‑filed the note into a project/thread on its own). `mapNote()` normalizes a DB row.
  - Notes can **continue** an earlier note (`continues_note_id` on the table): recording again on an existing note appends to its transcript and re‑synthesizes rather than creating a new row.
  - `notes.search_tsv` is a generated `tsvector` (title+synthesis+transcript) with a GIN index, used by `search-notes`; `note_passages` holds chunked transcript text + `vector(3072)` embeddings (HNSW index) for semantic search/answering.
  - Audio is transient by design: once transcribed, the audio file is deleted (`discardAudio` in `process-note`, and a `purge-audio` cleanup function) — only the text is kept.
- **Project** (`src/types/note.ts`, table `projects`) — a body of thinking the person *deliberately keeps*. Fields: `id`, `name`, `position`, `emoji`, `noteCount`. In the UI these are called **folders** (route `/folder/:projectId`, `FolderEmojiPicker`, `folder-glyphs.tsx`, `folder-reflection` edge function) even though the table/type name is `projects` — don't be thrown by the mismatch.
  - `project_suggestions` table + `suggest-projects` edge function: anren watches accumulating notes and proposes a new (or existing) project when several notes look like the same body of thinking; surfaced via `ProjectSuggestion.tsx` / `useProjectSuggestions.ts`.
  - `folder_reflections` table + `folder-reflection` edge function: an AI "reading" of one project's notes (`observations`, `reading`), shown via `FolderReflection.tsx`.
- **Thread** (table `threads`, hook `useThreads.ts`, component `ThreadCard.tsx`) — a *loose, self‑emerging* grouping the person never deliberately created: "the conversation they keep having with themselves without meaning to." Has `name`, `blurb`, `note_ids[]`, `quotes` (verbatim excerpts), `status` (active/dormant/dismissed), can `merged_into` another thread, and can optionally have a `project_id` once promoted. Populated by the `notice-threads` edge function, which explicitly avoids "folder/organize/category/tag" language in its prompt — a thread is not a folder.
- **AI access / usage** (tables `ai_usage`, `user_ai_keys`, column `profiles.ai_exempt`) — every account gets `FREE_GENERATIONS` (150) Claude generations on Anren's own key; after that, calls throw `QuotaError` → HTTP 402 (`needsOwnKeyResponse()`), and the note is marked `status: "needs_key"`. The frontend detects this via `isNeedsKeyError()` and routes the user to `/settings/claude` to connect their own Anthropic key. None of this budget is ever shown in the UI — see "BYO Claude key" below.
- People/address‑book/household/calendar‑integration concepts from the old model (`people` table, `usePeople`, `PeopleView`, `address_book_entries/contacts`, `households`) still exist as DB tables from earlier migrations but have **no corresponding frontend code** anymore (no hook or page references them) — treat them as dead schema, not an active feature.

## Key flows

### Capture → write‑up → filing

- **Voice**: `Home.tsx` → `CaptureSurface` → `/capture/voice` (`VoiceCapture.tsx`) uses `RecorderContext`/`useRecorder`. Audio is buffered client‑side in IndexedDB via `src/lib/recordingStore.ts` (`anren-recordings` DB) so a screen lock, backgrounded tab, or reload doesn't lose an in‑progress recording (`useRecordingRecovery.ts` picks interrupted sessions back up). Slices upload to Supabase Storage (`voice-notes` bucket) as they're recorded.
- **Typed**: `/capture/write` (`WriteCapture.tsx`) → `useTextCapture.ts` writes a `notes` row with `source: "typed"` and `body` text directly (no transcription step).
- **Processing**: the `process-note` edge function does everything after capture:
  1. Transcribes audio (OpenAI `gpt-4o-mini-transcribe`), splitting long recordings into ~90s chunks cut at quiet points and stitched back together with overlap de‑duplication (see the chunking/`quietCut`/`joinOverlap` logic in `process-note/index.ts`); for typed notes it just uses `body`.
  2. If the note `continues_note_id` another note, appends transcripts and merges into the parent, deleting the placeholder row.
  3. Calls Claude (`chat()` in `_shared/ai.ts`) with a synthesis prompt to produce `title` + `synthesis` (strict JSON), tracking usage against the free allowance or the user's own key.
  4. On success: discards the audio, chunks + embeds the note text into `note_passages` for search (`embed()` via the Lovable gateway).
  5. On `QuotaError`: leaves the transcript intact, sets `status: "needs_key"`.
- **Auto‑filing**: after a note is ready, `src/lib/associateNote.ts` calls the `associate-note` edge function, which decides (via Claude) whether the note belongs to an existing project or thread, and files it silently if confident (`autoFiledAt` gets set). This is a nicety and fails silently.
- **Threads noticing**: `notice-threads` edge function periodically re‑clusters notes that don't already belong to a project into named threads, can rename/merge existing threads, and marks threads dormant/dismissed over time. Surfaced on the home/`Threads.tsx` page (`useThreads.ts`) with a "noticing" animation (`NoticingBeat.tsx`, `src/lib/noticing.ts`).

### Reflect (read‑back)

- `Reflect.tsx` / `useLookBack.ts` calls `weekly-digest`, which reads a week of notes plus project/thread names and produces a structured JSON "reading" (named `movements`, an optional `tension`, `bullets`, and short mood `themes`/pills) — explicitly *not* a summary or metrics, per its system prompt. Stored per‑user/week in `weekly_digests`.
- `/on-my-mind` is a legacy route that now just redirects to `/reflect`.

### Search & Q&A

- `SearchPage.tsx` calls `search-notes` (full‑text `search_tsv` match plus an AI answer synthesized from top hits via `embed()` + `chat()`).
- `ask-note` answers a question about one specific note's transcript; `ask-notes` (`AskNotes.tsx`) answers across the whole embedded corpus (`note_passages`) — both are Claude calls scoped to only the note excerpts they're given.
- `related-notes` surfaces semantically similar notes for a given note (cosine similarity ≥ 0.78 over `note_passages.embedding`) — no AI call, just a vector query.

### BYO Claude key ("Connect Claude")

- `src/pages/ClaudeKey.tsx` (`/settings/claude`) lets a user paste their own Anthropic API key (`sk-ant-...`). It calls the `manage-ai-key` edge function (`action: "save" | "remove"`), which validates the key with a live 8‑token Anthropic call before storing it AES‑GCM‑encrypted (key derived from `AI_KEY_SECRET`) in `user_ai_keys`; it is never shown back to the user. `src/hooks/useAiAccess.ts` reads connection status via the `has_own_ai_key()` Postgres RPC. `src/lib/aiAccess.ts` holds the shared 402‑detection helper and the "connect your key" message shown when the free allowance runs out.
- This is a genuine BYO‑key flow **supplementing**, not replacing, `LOVABLE_API_KEY` — Lovable's gateway is still the path for embeddings; only chat/write‑up generation switches to a per‑user or house Anthropic key.

## Auth & platforms

- **Web auth**: `Auth.tsx` offers **Google** and **Apple** sign‑in, both via `lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin })` on web. On success, Lovable Cloud Auth calls `supabase.auth.setSession(tokens)` so Supabase remains the source of truth. (The Google OAuth scope requested here is just sign‑in — no calendar scope, no calendar UI exists anywhere in this app anymore.)
- **iOS native auth (Capacitor)** — still present and still the required path on native iOS, per the old CLAUDE.md's "do not remove" list, and it still works the same way:
  - `src/lib/authNative.ts`: generates a nonce + SHA‑256 digest, calls `SocialLogin.initialize({ google: { webClientId, iOSClientId, iOSServerClientId, mode: "online" } })`, then `SocialLogin.login({ provider: "google", options: { scopes: [...], nonce } })`, validates the ID token audience + nonce, and signs in via `supabase.auth.signInWithIdToken(...)`.
  - **Known drift to flag, not silently fix**: `authNative.ts` still requests the `https://www.googleapis.com/auth/calendar` scope even though there is no Google Calendar feature left in the app (no `GoogleCalendarView`, no `GoogleCallback` page, no `/google-callback` route, no `google-calendar`/`google-auth-callback` edge functions — all confirmed absent from `src/` and `supabase/functions/`). This scope request is very likely vestigial and worth raising with the user before touching it, since removing an OAuth scope can break already‑issued refresh tokens/consent for existing users.
  - `Auth.tsx` branches on `Capacitor.getPlatform() === "ios"` to call `signInWithGoogleNative()`; web keeps the Lovable OAuth flow. Apple sign‑in only has the web/Lovable path (no native Apple branch was found).
  - `ios/App/App/AppDelegate.swift` and `Info.plist` still carry the Google Sign‑In URL scheme (`com.googleusercontent.apps.642658972912-pg1g1hti6rkv53s2m30cve5auenjti7d`) and `GIDSignIn` URL handling — unchanged from before.
- **`getAppOrigin()`** (`src/lib/utils.ts`) still exists but is now **effectively unused** — grep finds no callers outside its own definition. It was load‑bearing for the old Google Calendar redirect (`${origin}/google-callback`), which is gone; `Auth.tsx` now just uses `window.location.origin` directly. Don't assume it's wired into anything before relying on it.
- **iOS permissions**: `Info.plist` currently declares only `NSMicrophoneUsageDescription` and the Google URL scheme. `NSContactsUsageDescription` and any HealthKit usage strings/entitlements have already been removed (git history shows `com.apple.developer.healthkit` + `healthkit.access` entitlements were added and then reverted in `ios/App/App/App.entitlements` / `App-release.entitlements`) — **there is no HealthKit or Contacts integration in the current app**, despite `@perfood/capacitor-healthkit` and `@capacitor-community/contacts` still sitting in `package.json` and `capacitor.config.ts`'s `plugins.Contacts` block. `docs/app-store-submission.md` explicitly calls out removing any remaining Health/Contacts permission strings before App Store submission.

## Environment & configuration

- **Frontend env (Vite)** — `.env` / `.env.local`:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase client.
  - `VITE_GOOGLE_WEB_CLIENT_ID`, `VITE_GOOGLE_IOS_CLIENT_ID` — used only by native iOS Google sign‑in (`authNative.ts`).
  - `VITE_PUBLIC_WEB_ORIGIN` — read by `getAppOrigin()`, but (see above) that helper has no remaining caller; keep it set for web‑origin correctness but don't expect it to gate any live redirect flow.
- **Edge function env (Supabase secrets)**:
  - `ANTHROPIC_API_KEY` — Anren's house key for Claude chat calls (`_shared/ai.ts`), used until a user's free allowance (150 generations) runs out or they connect their own key.
  - `AI_KEY_SECRET` — symmetric secret used to AES‑GCM encrypt/decrypt user‑supplied Anthropic keys stored in `user_ai_keys`.
  - `OPENAI_API_KEY` — audio transcription (`gpt-4o-mini-transcribe`) in `transcribe-audio` and `process-note`.
  - `LOVABLE_API_KEY` — Lovable's AI gateway, now used only for embeddings (`google/gemini-embedding-001`).
  - `SUPABASE_SERVICE_ROLE_KEY` — used by server‑side functions for admin DB access (e.g. `process-note`, `delete-account`, `manage-ai-key`).
  - Google Calendar env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are **no longer referenced anywhere in `supabase/functions/`** — confirmed by grepping every `Deno.env.get(...)` call across the functions directory. Don't reintroduce calendar edge functions expecting these to already be configured.

## Edge functions (current)

`supabase/functions/`: `ask-note`, `ask-notes`, `associate-note`, `delete-account`, `folder-reflection`, `manage-ai-key`, `notice-threads`, `process-note`, `purge-audio`, `related-notes`, `search-notes`, `suggest-folder-emoji`, `suggest-projects`, `transcribe-audio`, `weekly-digest`, plus shared helpers `_shared/ai.ts` (Claude chat + Gemini embeddings + JSON/text helpers) and `_shared/usage.ts` (key encryption, free‑allowance accounting, `QuotaError`).

All the old edge functions (`parse-image`, `classify-note`, `process-brain-dump`, `transcribe-voice`, `google-auth-callback`, `google-calendar`, `accept-invite`, `connect-provider`, `connections-callback`, `data-proxy`, `disconnect-provider`, `generate-daily-plan`, `generate-life-review`, `generate-reflection-digest`, `inbound-email`, `ingest-apple-health`, `nudge-partner`, `process-reflection`, `process-stream`, `research-next-step`, `send-daily-brief`, `send-weekly-synthesis`, `smart-reorder`, `sort-cards`, `sync-all-active`, `sync-provider`) are gone. If you see code or docs referencing any of them, it's stale.

## Shared module

- **`shared/` no longer exists** (it was deleted along with the extension it served — `git log -- shared/` shows no history at all in the current tree/branch, i.e. it was never part of this history; if you find references to `shared/types/card.ts` or `createSupabaseClient` anywhere, they're stale). Card/note types now live directly in `src/types/note.ts` (`Note`, `Project`, `mapNote()`), with no cross‑package re‑export layer — there's only one app to serve now.
- `src/types/card.ts` (the old `BrainCard` type file) is gone; don't recreate imports from `@/types/card`.

## Things to preserve when editing

- **Do not remove or bypass** without checking with the user first:
  - `src/lib/authNative.ts` and the iOS branch in `Auth.tsx` — native, nonce‑safe Google sign‑in for Supabase. (But do flag, don't silently strip, the leftover calendar OAuth scope inside it — see Auth section above.)
  - URL scheme and Google Sign‑In handling in `ios/App/App/Info.plist` and `ios/App/App/AppDelegate.swift`.
  - `supabase/functions/_shared/ai.ts` and `_shared/usage.ts` — the free‑allowance/BYO‑key mechanics (`QuotaError`, `needsOwnKeyResponse`, `assertHouseAllowance`, `encryptKey`/`decryptKey`) are relied on by every AI‑calling edge function; changing their contracts means updating every caller.
  - Edge functions' JSON/tool schemas that AI prompts expect back (`process-note`, `notice-threads`, `associate-note`, `suggest-projects`, `weekly-digest`, `suggest-folder-emoji`) — callers parse strict JSON shapes out of the model's text response via `parseJsonBlock()`.
  - The audio‑discard behavior (`discardAudio` in `process-note`, and `purge-audio`) — this is a stated privacy property of the app ("no recording is kept once it's transcribed"), not incidental cleanup.
- **Things that look present but aren't wired up** — worth a sanity check before building on them, and worth flagging to the user rather than assuming intent:
  - `getAppOrigin()` (unused).
  - `@capacitor-community/contacts`, `@perfood/capacitor-healthkit`, and `capacitor.config.ts`'s `plugins.Contacts` block (no corresponding feature code).
  - `npm run build:extension` script in `package.json` (target directory's source was deleted from git).
  - The `people`, `address_book_entries`, `address_book_contacts`, `households`, `household_members`, `household_invites` DB tables (no frontend code references them).
  - The `https://www.googleapis.com/auth/calendar` scope requested in `authNative.ts` (no calendar feature consumes it).

## How to run and build

- **Web dev**:
  - `npm install`
  - `npm run dev`
- **Prod build**:
  - `npm run build`
- **Tests**: `npm run test` (Vitest, one‑shot) / `npm run test:watch`.
- **iOS**:
  - `npm run build && npx cap sync ios`
  - `npx cap open ios` → build/run from Xcode, then Archive for TestFlight as usual.
  - Before submitting to App Review, see **`docs/app-store-submission.md`** — it has the required public URLs (`/privacy`, `/terms`, `/support`), the account‑deletion flow (`/delete-account`, backed by the `delete-account` edge function), the App Privacy nutrition‑label answers, and a reminder to strip any remaining Contacts/HealthKit permission strings before submitting since v2 uses neither.
- **Chrome extension**: not currently part of the product. `extension/` source was removed from git; treat any remaining files on disk under it as leftover build artifacts, not something to build or ship.
