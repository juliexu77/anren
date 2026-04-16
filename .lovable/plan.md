

## Two changes: switch life-review to Claude + scope an Integration Hub

### Part 1: Switch life-review generation to Claude (Anthropic)

You already have `ANTHROPIC_API_KEY` configured. The plan from the previous turn (new `generate-life-review` edge function + `life_reviews` table + `useLifeReview` hook + refactor `WeeklyReview.tsx`) stays the same — only the model call changes.

**Why Claude here:** the output you pasted *was* Claude. It naturally writes named themes, cites specifics, and closes with directives. That voice is what makes it feel "seen."

**Implementation notes:**
- Call `https://api.anthropic.com/v1/messages` directly with `model: claude-sonnet-4-5-20250929` (the model that produced your reference output)
- Use Anthropic's tool-use to force the structured `{ arc, themes[], friction[], pattern, reveals, closing }` JSON
- Pass the full document: 7 days of reflection transcripts (texture + texture_why + raw_transcript + givers + drainers + threads), completed card titles + themes + dates, active overdue card titles + due dates
- Prompt explicitly modeled on the reference output: "Write a weekly life review. Use named themes. Cite specifics. Connect threads across days. Close each theme with one forward note. No metrics. No scores. Contemplative voice."
- Cache in `life_reviews` table, regenerate weekly (or on demand via a small "refresh" affordance)

### Part 2: Integration Hub — scope

**Where it lives**
New route `/connections` accessible from a "Connections" row inside the existing **Settings** screen (no new top-nav icon — keeps the nav clean). Plus a one-line entry point inside Settings: "Connections — 0 of 6 active."

**The screen**
Single scrollable list. Each row:

```text
┌──────────────────────────────────────────────┐
│ [icon]  Google Calendar                  [○] │
│         See your day in context              │
└──────────────────────────────────────────────┘
```

- Left: monochrome icon (Lucide / inline SVG, no logo soup)
- Middle: name + one-line value prop
- Right: toggle. When connected, a small `✓` appears next to the name and a muted "Last synced 3m ago" line under the description
- Tap toggle on → OAuth flow opens → returns → toggle stays on, sync starts immediately, then every 5 min via cron
- Tap toggle off → revokes tokens, deletes synced data (or keeps it, with a confirm) — going with "keep cached data, stop syncing" for simplicity

**The 6 connections**

| Connection | Auth | Reality |
|---|---|---|
| Google Calendar | OAuth (you have `GOOGLE_CLIENT_ID/SECRET`) | **Buildable now.** Reuse existing Google flow. |
| Apple Calendar | EventKit (native iOS only) | **Native-only.** Requires Capacitor plugin + iOS entitlement. Web shows "iOS only." |
| WHOOP | OAuth 2.0 | **Buildable.** Need user to register a WHOOP developer app; we store client ID/secret as secrets. |
| Oura | Personal Access Token (simplest) or OAuth | **Buildable.** Recommend PAT for v1 — user pastes token, we store per-user encrypted. |
| Apple Health | HealthKit (native iOS only) | **Native-only.** Capacitor Health plugin + Info.plist usage strings. Web shows "iOS only." |
| Strava | OAuth 2.0 | **Buildable.** Same as WHOOP — register developer app, store creds as secrets. |

**Architecture**

1. **New table `user_connections`** — `(id, user_id, provider, status, access_token, refresh_token, token_expires_at, last_synced_at, settings jsonb, created_at)`. RLS: users see only their own. Tokens stored server-side; never exposed to client.

2. **New table `health_signals`** (catch-all for v1) — `(id, user_id, provider, signal_type, recorded_at, value jsonb, raw jsonb)`. e.g. `signal_type: "sleep"`, `value: { duration_min: 396, recovery: 40, hrv: 45 }`. Lets the life-review pull from one place regardless of source.

3. **Edge functions per provider:**
   - `connect-{provider}` — kicks off OAuth, returns auth URL
   - `{provider}-callback` — exchanges code for tokens, stores in `user_connections`
   - `sync-{provider}` — pulls last 7 days of data into `health_signals`
   - `disconnect-{provider}` — revokes & marks inactive

4. **One cron job** (`pg_cron` + `pg_net`) running every 5 min that calls a single `sync-all-active` function, which iterates active connections per user and dispatches per-provider sync. Refreshes OAuth tokens as needed.

5. **Native plugins (iOS-only connections)** — Apple Calendar + Apple Health flow through Capacitor plugins; data is pushed up to `health_signals` from the device, no OAuth needed. Web build hides the toggle (or shows it disabled with "Open on iPhone").

6. **Hook `useConnections()`** — fetches `user_connections`, exposes `{ connections, connect(provider), disconnect(provider), syncing }`.

7. **Life-review enrichment** — once connections are flowing, `generate-life-review` reads the last 7 days of `health_signals` and weaves them into themes ("On April 15 you got 6h36m, recovery 40, HRV 45…"). This is the unlock that makes the review feel as specific as the Claude reference.

**Out of scope for v1**
- Per-signal granular permissions (it's all-or-nothing per provider)
- Historical backfill beyond 30 days
- Webhooks (we poll every 5 min, which is fine for this data cadence)
- iCloud calendar sharing edge cases

### Files to build (Part 1 only — to start)

1. `supabase/functions/generate-life-review/index.ts` (new) — Claude-powered, structured JSON output
2. New migration: `life_reviews` table with RLS
3. `src/hooks/useLifeReview.ts` (new)
4. `src/components/WeeklyReview.tsx` (refactor to render narrative themes, fall back to current logic if no review yet)

Once you confirm Part 1, I'll build it and then return with a granular plan for Part 2 (Integration Hub) — likely best built one provider at a time, starting with Google Calendar since the auth is already in place.

