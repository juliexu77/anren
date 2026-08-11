# Transcription on your OpenAI key, silent 150-generation gate, Apple branding

## Transcription: OpenAI directly, not Lovable credits

`transcribe-audio` keeps working exactly as it does — same request shape, same one call per recording — but points at OpenAI's own API with your `OPENAI_API_KEY` instead of the Lovable gateway. Nothing else in the capture flow changes.

Model: `gpt-4o-mini-transcribe`, roughly **$0.003 per minute** — a two-minute memo is about half a cent. That's the cheaper sibling of what the app uses today, and the difference in accuracy on clear dictation is negligible.

One thing worth fixing while we're in there: the live preview currently re-transcribes a rolling window **every 7 seconds** while you speak, so a five-minute recording pays for transcription 40-odd times over. I'll switch the live text to the browser's free Web Speech API (and Apple's on-device recognition once the app is native), and keep the paid OpenAI call for the single final transcript. That alone cuts transcription cost by roughly 90%.

**Transcription is never gated.** Recording, transcription, typed notes, folders, editing, keyword search — free and unlimited for everyone, forever.

## The gate: silent, 150 generations

The intelligence layer — write-ups, folder reflections, look back, search answers, ask-a-note — runs on Claude and draws down **150 generations per person, one time**.

**No countdown anywhere in the UI.** No "143 left", no progress bar, no dollar figures. Watching a number tick down while you're trying to think is exactly the wrong feeling. The count and the real token spend live in the database for you; the user simply never sees it until they hit the end.

When they do hit it, the write-up spot reads: "Anren's write-ups run on Claude. Connect your own key to keep going." One quiet link. Settings shows "Claude — connected" or nothing at all. Your own account is exempt.

- **Connect page** (`/settings/claude`): plain steps for console.anthropic.com, a note that a few dollars of credit lasts months, that the key is encrypted and never shown again, and Remove.
- **After connecting**: one "Write up N waiting notes" action — nothing runs on their key without a tap.

## Technical notes

**`ai_usage`** — `user_id`, `used_count`, `micro_cents_used`. RLS: owner selects, service_role writes. Cost derived from Anthropic's returned token `usage` for your visibility only. Gate reads `used_count` against a `FREE_GENERATIONS = 150` constant.

**`user_ai_keys`** — `user_id`, `encrypted_key`. No select grant to `authenticated`; the client only learns whether a key exists via a security-definer boolean. AES-GCM with a generated `AI_KEY_SECRET`.

**`_shared/ai.ts`** is the choke point. `chat()` takes a `userId`: own key → use it, unmetered; under 150 → house key, increment; over → `QuotaError` → HTTP 402 `{ error: "needs_own_key" }`. `process-note` keeps the transcript and marks the note `needs_key`, never `failed`. `suggest-folder-emoji` falls back to keywords silently.

**`transcribe-audio`** — repointed at `https://api.openai.com/v1/audio/transcriptions` with `gpt-4o-mini-transcribe` and `OPENAI_API_KEY`. **`RecorderContext`** — live preview moves to Web Speech API, the 7-second polling loop goes away, one final transcription call on stop.

Embeddings (`related-notes`, semantic search) still run on the Lovable gateway. Small, cheap, and untangling them means a search-architecture decision — I'd leave it and flag it rather than fold it in here.

**Files**: migration; `_shared/ai.ts`, `_shared/usage.ts`; `transcribe-audio`; the six Claude callers; `src/lib/speech.ts`, `src/hooks/useAiAccess.ts`, `src/pages/ClaudeKey.tsx`; `RecorderContext.tsx`, `Settings.tsx`, `NoteDetail.tsx`, `SearchPage.tsx`, `FolderReflection.tsx`, `OnMyMind.tsx`, `App.tsx`.

## Apple sign-in, given it's going native

That changes the picture in your favour. **On a native iOS app, Sign In with Apple shows your app's own name automatically** — it comes from the App ID and the app's display name, not from a Services ID. No branding work needed there at all.

The Services ID you just made covers the **web** flow, which is what the preview and `anren.app` use. Since `anren.app` becomes a marketing landing page rather than the app itself, web sign-in matters much less — but while you're testing in the browser it's still the path in use, so finishing it is worth ten minutes:

1. **Services ID description** — this string is what Apple prints on the web sign-in sheet. Check it reads **anren** (lowercase). Editable if not.
2. **Configure it** — Sign In with Apple → Configure → primary App ID = your bundle ID → add domain `anren.app` plus the **Return URL** I'll hand you as an exact string.
3. **Key** — Keys → new key with Sign In with Apple, download the `.p8` (**one download only**), note the **Key ID** and your **Team ID**.

Then Apple gives a domain-verification file, I host it and deploy, you click Verify. Finally, in the backend under Sign In Methods → Apple, switch to your own credentials and generate the client secret from Team ID + Key ID + Services ID + `.p8`. It expires every 6 months — I'll note the renewal date in the App Store doc.

Afterwards I'll run sign-in in a real browser and confirm the sheet reads "anren".

## What I need from you

- `OPENAI_API_KEY` from platform.openai.com — I'll prompt for it when we start.
- The Apple items above, at your pace; I'll hand you the Return URL and host the verification file.
- `AI_KEY_SECRET` I generate myself.
