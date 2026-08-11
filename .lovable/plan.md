# On-device transcription, 150 free write-ups, Apple branding

## Transcription without another backend service

One thing to be straight about first: **Claude cannot transcribe audio.** It has no speech-to-text — no model in the Anthropic API accepts an audio file. So "use Claude when Apple's transcription fails" isn't available, and I'd rather say that than quietly wire something else in.

Given no new service, here's the honest shape:

- **iOS: Apple's on-device speech recognition** (`SFSpeechRecognizer`) via a Capacitor plugin. Free, offline, private, and genuinely good. This is where nearly every recording lands.
- **Web: the Web Speech API** — same idea, works in Chrome and Safari, free.
- **When recognition fails or comes back empty**: the recording is still saved. The note appears in the feed with a "couldn't catch this one" line and two actions: **play it back** and **type it yourself**. Your existing typed-note editing already handles the second, and the write-up runs normally once there are words.

That means no transcription bill at all, and no third service. The tradeoff is that a small share of recordings — bad audio, noisy rooms, background app — will need you to type or re-record instead of being rescued by a server model. If that turns out to bite in real use, the cheapest rescue later is a single hosted Whisper key, but nothing gets added now.

## The free allowance: 150 write-ups

150 AI generations per person, one time — a trial, not a monthly allowance. Counted as write-ups, not dollars: the user never sees a balance or a dollar figure, just a count if they ever look.

Behind the scenes I'll still record the real token spend per user so you can see what 150 actually costs you and adjust the number with one constant. But that number is yours, not theirs.

**Capture is never gated.** Recording, transcription, typed notes, folders, editing, keyword search — unlimited, free, forever. Only the intelligence layer (write-ups, folder reflections, look back, search answers, ask-a-note) draws down the 150 and then asks for their own Claude key. Your own account is exempt.

### What the user sees

- **Where the write-up would be**: "Anren's write-ups run on Claude. Connect your own key to keep going." Quiet, no red, no countdown.
- **Settings**: "Claude — connected", or "Claude — 143 write-ups left on Anren's key" with a connect link.
- **Connect page** (`/settings/claude`): plain steps for console.anthropic.com, a note that a few dollars of credit lasts months, that the key is encrypted and never shown again, and Remove.
- **After connecting**: one "Write up N waiting notes" action — nothing generated on their key without a tap.

## Technical notes

**`ai_usage`** — `user_id`, `used_count`, `micro_cents_used`, `updated_at`. RLS: owner selects, service_role writes. Real cost derived from Anthropic's returned `usage` for your own visibility; the gate reads `used_count` against a `FREE_GENERATIONS = 150` constant.

**`user_ai_keys`** — `user_id`, `encrypted_key`. No select grant to `authenticated`; the client only learns whether a key exists via a security-definer boolean. AES-GCM with a generated `AI_KEY_SECRET`.

**`_shared/ai.ts`** is the single choke point. `chat()` takes a `userId`: own key → use it, no metering; under 150 → house key, increment; over → `QuotaError` → HTTP 402 `{ error: "needs_own_key" }`. `process-note` keeps the transcript and marks the note `needs_key`, never `failed`. `suggest-folder-emoji` falls back to keywords silently.

**Transcription** — new Capacitor iOS speech plugin, Web Speech API on web, `transcribe-audio` retired from the Lovable gateway. Embeddings currently also run on the Lovable gateway; I'll flag that separately rather than fold a search-architecture change into this.

**Files**: migration; `_shared/ai.ts`, `_shared/usage.ts`; the six Claude callers; `src/lib/speech.ts`, `src/hooks/useAiAccess.ts`, `src/pages/ClaudeKey.tsx`; `Settings.tsx`, `NoteDetail.tsx`, `SearchPage.tsx`, `FolderReflection.tsx`, `OnMyMind.tsx`, `App.tsx`, `CaptureBar.tsx`; iOS plugin files.

## Apple sign-in: what's left for you

Having the developer account and a registered bundle ID helps — that's steps 1 and 2 done. Sign In with Apple for a web/hybrid app needs a *second* identifier beyond the App ID, so three things remain:

1. **Confirm Sign In with Apple is enabled on your existing App ID** — Identifiers → your bundle ID → tick the capability if it isn't already.
2. **Create a Services ID** (Identifiers → new → Services IDs). Two details matter:
   - The **description** is what Apple prints on the sign-in sheet. Type **anren**, lowercase, exactly as you want it seen.
   - Enable Sign In with Apple → Configure → primary App ID = your bundle ID → add domain `anren.app` (and `www.anren.app`) and the auth **Return URL**, which I'll hand you as an exact string.
3. **Create a Sign In with Apple key** (Keys → new, tick Sign In with Apple, download the `.p8` — *it downloads once only*). Note the **Key ID**; grab your **Team ID** from the top right of the console.

Then: Apple gives a domain-verification file, I host it at `/.well-known/` and deploy, you click Verify. Finally, in the app's backend under Sign In Methods → Apple, switch to your own credentials and generate the client secret from Team ID + Key ID + Services ID + `.p8`. That secret expires every 6 months — I'll put the renewal date in the App Store doc.

Afterwards I'll run the sign-in in a real browser and confirm the sheet reads "anren".

## What I need from you

- The three Apple console items above; I'll give you the exact Return URL and host the verification file when you start.
- `AI_KEY_SECRET` I generate myself. No new services, no new keys from you.
