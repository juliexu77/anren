# $5-per-user AI budget, cheap transcription, no Lovable credits

## Why transcription was on Lovable credits

No good reason — it was just the default. `transcribe-audio` posts the audio to the Lovable AI Gateway's `openai/gpt-4o-transcribe`, which bills your Lovable balance. Claude has no speech-to-text, so it can't take over.

Two changes, in order of how much they save:

**1. Transcribe on the device when possible — free.**
- On iOS, Apple's own speech recognition (`SFSpeechRecognizer`) runs on-device through a Capacitor plugin. No API, no cost, works offline, and the audio never leaves the phone.
- In the browser, the Web Speech API does the same in Chrome and Safari.
- The recording is still saved either way, so the transcript can always be redone server-side if the device result looks empty or garbled.

**2. Server fallback on a cheap dedicated STT provider, on your key, not Lovable's.**
Whisper-class hosted transcription runs roughly **$0.002–0.007 per minute** of audio — around a tenth of a cent for a two-minute memo. Groq's hosted Whisper and Deepgram are both in that range; I'd default to Groq for price and speed, and you'd add one `GROQ_API_KEY`. Nothing in the app touches Lovable credits after this.

Realistically most transcription lands on the free on-device path, and the fallback costs cents a month.

## The $5 budget, done properly

A count of 10 was a made-up number — you're right that it's the wrong unit. The unit should be money, because that's what you actually care about.

Anthropic returns exact input and output token counts on every response. So: **meter real spend per user, cap it at $5 lifetime.** For scale, at Sonnet's rates a note write-up costs roughly 1.5–2 cents, a folder reflection 3–5 cents. So $5 is on the order of 150–250 write-ups per person — a genuinely generous trial, not a tease, and your worst case is bounded at exactly $5 no matter what they do.

When someone crosses it, the intelligence layer asks for their own Claude key. Capture keeps working, unmetered and free, forever — recording, transcription, typed notes, folders, editing, searching by keyword. Only the interpretation layer needs the key.

The ceiling lives in one constant so you can raise or lower it without touching anything else. Your own account is exempt.

### What the user sees

- **Where the write-up would be**: "Anren's write-ups run on Claude. Connect your own key to keep going — about two cents a note." One quiet link, no red, no countdown, no dollar figure shown to them.
- **Settings**: "Claude — connected", or "Claude — using Anren's key" with the connect link underneath. People never see a running balance; that's your concern, not theirs.
- **Connect page** (`/settings/claude`): plain steps for console.anthropic.com, a note that a few dollars of credit lasts months, that the key is encrypted and never displayed again, and a Remove button.
- **After connecting**: one "Write up N waiting notes" action, so nothing is silently generated on their new key.

## Technical notes

**`ai_spend`** — `user_id`, `micro_cents_used`, `updated_at`. RLS: owner selects, service_role writes. Cost computed per call from Anthropic's returned `usage` at Sonnet's per-token rates, held as a constant next to the model id.

**`user_ai_keys`** — `user_id`, `encrypted_key`. No select grant to `authenticated`; the client only learns *whether* a key exists via a security-definer boolean. AES-GCM with a generated `AI_KEY_SECRET`.

**`_shared/ai.ts`** is the single choke point. `chat()` takes a `userId`: own key → use it, no metering; no key and under $5 → house key, then record actual cost; over $5 → throw `QuotaError` → HTTP 402 `{ error: "needs_own_key" }`. `process-note` keeps the transcript and marks the note `needs_key`, never `failed`. `suggest-folder-emoji` falls back to keywords silently.

**Transcription** — new Capacitor iOS speech plugin, Web Speech API on web, `transcribe-audio` rewritten against Groq Whisper as fallback. Unmetered. `embed()` moves off the Lovable gateway too — either drop embeddings in favour of Postgres full-text search, or run them on the same cheap provider; I'd flag that as a small follow-up decision rather than block this work.

**Files**: migration; `_shared/ai.ts`, `_shared/usage.ts`; `transcribe-audio`; the six Claude callers; `src/hooks/useAiAccess.ts`, `src/lib/speech.ts`, `src/pages/ClaudeKey.tsx`; `Settings.tsx`, `NoteDetail.tsx`, `SearchPage.tsx`, `FolderReflection.tsx`, `OnMyMind.tsx`, `App.tsx`, `CaptureBar.tsx`.

## Apple Developer flow, step by step

You need this anyway for the App Store. Roughly 15 minutes.

1. **Apple Developer Program** — $99/year at developer.apple.com. You need it to ship to the App Store regardless.
2. **App ID** — Identifiers → new App ID with your bundle ID, and tick **Sign In with Apple**.
3. **Services ID** — Identifiers → new **Services ID** (e.g. `app.anren.web`), description "anren" — *this description is the name Apple shows on the sign-in sheet, so it must read "anren"*. Enable Sign In with Apple, click Configure, pick your App ID as primary, and add:
   - Domain: `anren.app` (and `www.anren.app`)
   - Return URL: the backend auth callback URL — I'll give you the exact string when we get there.
4. **Key** — Keys → new key, tick Sign In with Apple, download the `.p8`. **It downloads once only.** Note the **Key ID**, and your **Team ID** from the top-right of the console.
5. **Domain verification** — Apple gives you a file to host at `/.well-known/apple-developer-domain-association.txt`. I'll add it to the app and deploy, then you click Verify.
6. **Back in the app's backend** — Authentication Settings → Sign In Methods → Apple → "use your own credentials", generate the client secret from Team ID + Key ID + Services ID + `.p8` contents, and save. **The generated secret expires every 6 months** — I'll add a reminder note to the App Store doc.

Then I'll run the real sign-in flow in a browser and confirm the sheet says "anren" and not Lovable.

## What I need from you

- One `GROQ_API_KEY` (free to create, pay-as-you-go, cents).
- The Apple Developer steps above, at your pace — I'll hand you the exact callback URL and host the verification file.
- `AI_KEY_SECRET` I generate myself.
