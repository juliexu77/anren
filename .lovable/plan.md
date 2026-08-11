# Usage gate + bring-your-own key

## Where the money goes today

Confirmed by reading the code:

- **All Claude calls** (note write-ups, reflections, look back, search answers, ask-a-note, folder emoji) run on **your** `ANTHROPIC_API_KEY`, billed to your Anthropic account.
- **Transcription** (`transcribe-audio`, `openai/gpt-4o-transcribe`) runs on the Lovable AI Gateway, billed to your Lovable credits.
- There is no metering anywhere — every signed-in person can generate without limit on your two accounts.

So the gate needs to cover both kinds of spend, not just Claude.

## The shape of it

Each person gets a monthly allowance on the house account. When they cross it, capture keeps working but the AI write-up pauses with a quiet explanation and one action: add your own Anthropic key. Anyone who adds a key is unmetered from then on — their calls go through their key, never yours.

Nothing is ever silently dropped: a note that can't be synthesized keeps its transcript and shows "waiting on you" rather than failing.

### Allowance (adjustable later in one place)

| | Free each month |
| --- | --- |
| Voice notes transcribed | 40 |
| AI write-ups / reflections / search answers | 60 |
| Look back (weekly) | 4 |

Your own account is exempt — one flag on your profile row so QA and daily use never hit the wall.

### What the user sees

- **Settings → Usage**: a plain line, "You've used 22 of 40 voice notes this month. Resets Sept 1." Below it, a muted "Use your own Anthropic key" link.
- **At the limit**: a calm panel where the write-up would be — "You've reached this month's free write-ups. Add your own Anthropic key to keep going, or wait until Sept 1." Never red, never scolding.
- **Key setup page** (`/settings/ai-key`): short instructions — go to console.anthropic.com, create a key, paste it here — plus what it costs roughly per note, that the key is stored encrypted and never shown again, and a Remove button.

## Technical notes

**`ai_usage` table** — one row per user per month per meter (`user_id`, `period` as first-of-month date, `meter`, `count`). RLS: owner can select; only service_role writes. GRANT select to authenticated, all to service_role.

**`user_ai_keys` table** — `user_id`, `provider`, `encrypted_key`, `created_at`. No select grant to `authenticated` at all; RLS select policy denies. The client only ever learns *whether* a key exists via a `has_own_ai_key` boolean returned by a security-definer function. Key is encrypted at rest with a generated `AI_KEY_SECRET` (AES-GCM via WebCrypto in the edge function).

**New edge functions**
- `save-ai-key` — validates the key with a 1-token Anthropic ping, encrypts, upserts. Rejects a key that doesn't work rather than storing a dud.
- `delete-ai-key`.

**`_shared/ai.ts`** becomes the single choke point. `chat()` gains a required caller context (`userId`, `meter`):
1. Look up the user's own key; if present, use it and skip metering entirely.
2. Otherwise read the month's count for that meter. Over the cap → throw a typed `QuotaError`.
3. Under the cap → call with the house key, then increment the counter.

Same wrapper for `transcribe-audio` on its own meter. `embed()` is cheap enough to ride along on the write-up meter rather than get its own.

**Error surfacing** — `QuotaError` returns HTTP 402 with `{ error: "quota_exceeded", meter, resetsOn }`. Every caller (`process-note`, `folder-reflection`, `search-notes`, `ask-note`, `weekly-digest`, `suggest-folder-emoji`, `transcribe-audio`) passes it through, and the client renders the calm panel instead of a toast failure. `suggest-folder-emoji` degrades to its keyword fallback rather than showing anything.

**Files touched**: new migration; `_shared/ai.ts`, `_shared/usage.ts` (new); the seven calling functions; `src/hooks/useUsage.ts` (new); `src/pages/Settings.tsx`; `src/pages/AiKey.tsx` (new); `src/components/FolderReflection.tsx`; `src/pages/NoteDetail.tsx`; `src/pages/SearchPage.tsx`; `src/App.tsx`.

## What I need from you

One generated secret, `AI_KEY_SECRET`, for encrypting stored keys — I can create that myself, no input needed. Nothing else; adjust the allowance numbers above if they feel off.
