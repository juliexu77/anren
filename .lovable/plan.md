

User wants:
1. Drop Apple Calendar from this round
2. Use OAuth for Oura (not PAT) — confirming this is the standard approach
3. Build WHOOP now (has secrets ready)

**Oura context:** Oura supports both PAT and OAuth 2.0. OAuth is what other apps use (no copy-paste friction, refresh tokens, scoped permissions). PAT is fine for personal scripts. For a real product, OAuth is the right call. Switching to OAuth.

## Revised build plan

### What's getting built now

**1. WHOOP (OAuth 2.0)** — secrets ready
- Auth URL: `https://api.prod.whoop.com/oauth/oauth2/auth`
- Scopes: `read:recovery read:cycles read:sleep read:workout read:profile offline`
- Token URL: `https://api.prod.whoop.com/oauth/oauth2/token`
- Sync: pull last 7 days from `/v1/cycle`, `/v1/recovery`, `/v1/activity/sleep`, `/v1/activity/workout` → `health_signals` (signal types: `recovery`, `sleep`, `workout`)
- Refresh tokens (WHOOP access tokens expire in 1h)
- Flip `comingSoon: false` on WHOOP row

**2. Oura (OAuth 2.0)** — same shape as WHOOP
- Auth URL: `https://cloud.ouraring.com/oauth/authorize`
- Scopes: `personal daily heartrate workout session`
- Token URL: `https://api.ouraring.com/oauth/token`
- Sync: pull last 7 days from `/v2/usercollection/sleep`, `/daily_readiness`, `/daily_activity`, `/workout` → `health_signals`
- Flip `comingSoon: false` on Oura row

**3. Strava (OAuth 2.0)** — deferred until you have Strava secrets ready (same shape as WHOOP — say the word and I'll wire it)

**4. Apple Health (native iOS)** — keeping this in scope per your original ask
- Install `@perfood/capacitor-healthkit`
- Add HealthKit entitlement to `App.entitlements` + `NSHealthShareUsageDescription` to `Info.plist`
- New edge function `ingest-apple-health` receives device-pushed samples → `health_signals`
- Apple Health toggle on `/connections` only enabled on `Capacitor.isNativePlatform()`
- Sync runs on app foreground (no server cron — data lives on device)

**5. Apple Calendar** — dropped, per your call

**6. Life-review enrichment**
- Update `generate-life-review` to read last 7 days from `health_signals` and pass a structured summary to Claude ("Sleep avg 6h42m, lowest Tue 5h18m. 3 workouts. 12 calendar events, 4 back-to-back blocks Tue PM.")
- Prompt update to allow citing sleep, recovery, workouts, calendar load by date

### Architecture notes
- WHOOP, Oura, Strava all flow through the existing `connect-provider` → `connections-callback` → `sync-provider` pipeline. Just adding cases.
- Existing 5-min cron already iterates active connections — new providers picked up automatically
- All tokens stored server-side in `user_connections`, never exposed to client

### Build order
1. WHOOP (you have secrets — ready to go)
2. Oura OAuth
3. Apple Health (native — requires `npx cap sync ios` on your end after)
4. Life-review enrichment
5. Strava when you bring secrets

### What I need from you

**Right now, for WHOOP:**
- `WHOOP_CLIENT_ID`
- `WHOOP_CLIENT_SECRET`
- Confirm you set the redirect URI in your WHOOP developer app to:
  `https://skbktztzbkdgkkguzltv.supabase.co/functions/v1/connections-callback`

**Before Oura:**
- Register at `https://cloud.ouraring.com/oauth/applications` → create OAuth2 app
- Set redirect URI to: `https://skbktztzbkdgkkguzltv.supabase.co/functions/v1/connections-callback`
- Bring back: `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`

**For Apple Health (after code lands):**
- `git pull`, `npm install`, `npx cap sync ios`
- Open Xcode → Signing & Capabilities → add HealthKit capability
- Build & run on a real device (HealthKit doesn't work in simulator)

**For Strava (whenever ready):**
- Register at `https://www.strava.com/settings/api`
- Set Authorization Callback Domain: `skbktztzbkdgkkguzltv.supabase.co`
- Bring back: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`

