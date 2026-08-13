# Dead code cleanup

You're right — the HealthKit / Google Calendar / Contacts era left residue behind. The app source (`src/`) is already clean of all three; what remains is packaging, native config, docs, and a few stragglers. Here's what I verified and what I'd remove.

## Confirmed dead

**Native plugins still installed but never imported anywhere in `src/`:**
- `@perfood/capacitor-healthkit` (Apple Health)
- `@capacitor-community/contacts` (Contacts)
- `@capacitor/push-notifications` (no code registers or listens for pushes)
- `@capacitor/app` (unused)

**Native config for those plugins:**
- `capacitor.config.ts` — `Contacts` and `PushNotifications` plugin blocks
- `ios/App/App/Info.plist` — `UIBackgroundModes: remote-notification`
- `ios/App/App/AppDelegate.swift` — the two APNs token forwarding methods
- Google Sign-In handling in `AppDelegate` / the reversed-client-ID URL scheme stay (native Google auth is live)

**Stale scripts and docs:**
- `package.json` script `build:extension` — the `extension/` directory no longer exists
- `docs/push-notifications-setup.md`, `docs/google-auth-architecture.md` (Calendar OAuth), and the Contacts/Health sections of `docs/ios-deployment-plan.md`, `docs/lovable-brief.md`, `docs/app-store-submission.md`
- `claude.md` describes the pre-v2 app (BrainCard, people, calendar, extension) and contradicts the current codebase — rewrite it to match anren v2

**Backend:**
- `supabase/functions/transcribe-audio/` — zero references anywhere; transcription runs inside `process-note`. Delete the function and its `config.toml` entry.

**Unused npm packages (frontend, no imports outside untouched shadcn files):** `xlsx`, `recharts`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `vaul`, `next-themes` — with their orphaned shadcn wrappers (`chart`, `carousel`, `input-otp`, `calendar`, `resizable`, `drawer`).

## What I would NOT touch

- Historical migrations that created the old `people` / health-signal tables — they're already dropped by a later migration; rewriting history is riskier than the tidiness is worth.
- Anything under `src/` related to capture, notes, threads, projects, reflect.
- Google native auth, Apple auth, `ios/` project structure.

## Suggested order

1. Delete the `transcribe-audio` edge function + config entry.
2. Strip native plugin config (Capacitor config, Info.plist, AppDelegate) and uninstall the four Capacitor plugins.
3. Remove the unused frontend packages and their orphan shadcn wrappers.
4. Prune/rewrite docs and `claude.md`.
5. Build + test to confirm nothing regressed.

Note: removing native plugins changes the iOS project's dependencies, so the next iOS build needs a `cap sync` on your machine — I'll call that out at the end.

## Open question

Do you want push notifications gone entirely, or kept as scaffolding for a future "time to check in" reminder? Everything else above I'd remove outright.
