# Keep capture free, gate the intelligence layer

## Where the money goes today

Confirmed by reading the code:

- **Claude** (note write-ups, folder reflections, look back, search answers, ask-a-note, folder emoji) runs on **your** `ANTHROPIC_API_KEY`.
- **Transcription** (`transcribe-audio`) runs on Lovable credits.

Nothing is metered — anyone signed in can generate without limit on your accounts.

## The rule

**Capture is always free and never gated.** Recording, transcription, typed notes, folders, editing, browsing the archive — unlimited, on the house, forever. That's the app.

**The intelligence layer needs a Claude key.** Write-ups, reflections, look back, search answers, ask-a-note. Everyone gets a small taste on your key — enough to feel why it matters — then it asks them to connect their own Claude key. Once connected, unlimited and billed to them.

Free taste: **10 AI generations, one time** (not monthly — a trial, not an allowance). Your own account is exempt via a flag on your profile.

Nothing breaks when the taste runs out: a voice note still transcribes and saves with its full transcript, it just doesn't get a title and summary until a key is connected. The raw words are always yours.

### What the user sees

- **Where the write-up would be**: "Anren's write-ups run on Claude. Connect your own key to keep going — about a cent a note." One quiet link, no red, no countdown.
- **Settings**: "Claude — connected" or "Claude — not connected · 7 of 10 free write-ups left."
- **Connect page** (`/settings/claude`): plain steps — go to console.anthropic.com, add a few dollars of credit, create a key, paste it here. Notes on rough cost per note, that the key is encrypted and never shown again, and a Remove button.
- **Retroactive catch-up**: after connecting a key, any note still missing a write-up gets one — a single "Write up 3 waiting notes" action, not an automatic surprise bill.

## Technical notes

**`ai_usage`** — `user_id`, `used_count`, `updated_at`. RLS: owner selects, service_role writes. GRANT select to authenticated, all to service_role.

**`user_ai_keys`** — `user_id`, `encrypted_key`. No select grant to `authenticated`; the client only learns whether a key exists through a security-definer function returning a boolean. Encrypted at rest with a generated `AI_KEY_SECRET` (AES-GCM, WebCrypto).

**`save-claude-key`** edge function validates the key with a 1-token Anthropic ping before storing, so a bad key is rejected rather than saved. Plus `delete-claude-key`.

**`_shared/ai.ts`** is the single choke point. `chat()` takes a `userId`:
1. User has their own key → use it, no metering.
2. No key, trial not used up → house key, increment.
3. No key, trial spent → throw `QuotaError`.

`transcribe-audio` and `embed()` are **not** metered — capture stays free.

**Error surfacing** — `QuotaError` → HTTP 402 `{ error: "needs_own_key" }`. Callers pass it through; the client renders the connect prompt in place. `process-note` leaves the note's transcript intact and marks it `needs_key` rather than `failed`. `suggest-folder-emoji` silently falls back to keywords.

**Files**: new migration; `_shared/ai.ts` and `_shared/usage.ts`; the seven calling functions; `src/hooks/useAiAccess.ts`; `src/pages/ClaudeKey.tsx`; `Settings.tsx`, `NoteDetail.tsx`, `SearchPage.tsx`, `FolderReflection.tsx`, `OnMyMind.tsx`, `App.tsx`.

## Apple sign-in branding

Anren currently uses Lovable's **managed** Apple credentials, so the Apple sheet shows Lovable's registered name, not "anren" — managed credentials can't be rebranded, that's inherent to sharing them.

To show your own name you need your own Apple Developer account (which you need anyway for the App Store) and a switch to your own credentials:

1. Create a **Services ID** with Sign In with Apple enabled, and add both your domain (`anren.app`) and the auth callback URL to it.
2. Create a **Sign In with Apple key** (`.p8`, Key ID, Team ID).
3. In the backend dashboard under Apple sign-in, choose your own credentials, generate the client secret JWT from the Team ID / Key ID / Services ID / `.p8`, and save. The JWT expires every 6 months and needs regenerating.

I'll verify the flow end-to-end in a real browser afterwards and confirm what name the sheet shows. I can walk you through the Apple Developer steps and hand you the exact callback URL when you're ready — say the word and I'll do that part after the credits gate is in.

## What I need from you

Nothing for the gate — I'll generate `AI_KEY_SECRET` myself. For Apple branding, your own Apple Developer account and about ten minutes in their console with me.
