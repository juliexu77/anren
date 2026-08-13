# Dead code cleanup (iOS stays intact)

Understood — Capacitor and the iOS build are load-bearing and stay. This only removes the extras we bolted on and later abandoned. Nothing in the capture → notes → threads → reflect loop, nothing in Google/Apple sign-in, nothing in the `ios/` project structure is touched.

## Stays, untouched

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `capacitor.config.ts`, the whole `ios/` Xcode project
- `@capgo/capacitor-social-login`, the GoogleSignIn handling in `AppDelegate.swift`, the reversed-client-ID URL scheme in `Info.plist`, `src/lib/authNative.ts`
- `NSMicrophoneUsageDescription` and everything recording-related
- Historical migrations (the old `people` / health-signal tables are already dropped by a later migration; rewriting history isn't worth the risk)

## Removed — abandoned integrations

Verified: none of these are imported anywhere in `src/`.

- `@perfood/capacitor-healthkit` (Apple Health experiment)
- `@capacitor-community/contacts` (Contacts import)
- `@capacitor/push-notifications` + `@capacitor/app`
- `capacitor.config.ts`: the `Contacts` and `PushNotifications` plugin blocks
- `Info.plist`: `UIBackgroundModes: remote-notification`
- `AppDelegate.swift`: the two APNs token-forwarding methods

## Removed — other strays

- `supabase/functions/transcribe-audio/` — zero references; transcription happens inside `process-note`. Also drops its `config.toml` entry.
- `package.json` script `build:extension` — the `extension/` directory no longer exists
- Unused frontend packages with no imports outside their own orphaned shadcn wrapper: `xlsx`, `recharts`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `vaul`, `next-themes` — and those wrappers (`chart`, `carousel`, `input-otp`, `calendar`, `resizable`, `drawer`)
- Stale docs: `docs/push-notifications-setup.md`, `docs/google-auth-architecture.md` (Calendar OAuth flow that no longer exists), and the Contacts/Health sections of `docs/ios-deployment-plan.md`, `docs/lovable-brief.md`, `docs/app-store-submission.md`
- `claude.md` — still describes the pre-v2 app (BrainCard, people, calendar, Chrome extension); rewritten to match anren v2

## Order of work

1. Delete the `transcribe-audio` function and its config entry.
2. Remove the four abandoned plugins and their config/Info.plist/AppDelegate hooks.
3. Remove the unused frontend packages and orphan shadcn wrappers.
4. Prune docs, rewrite `claude.md`, drop the dead script.
5. Build and run tests to confirm the app is unchanged.

## After I'm done

Since native dependencies change, your next iOS build needs a `git pull`, `npm install`, then `npx cap sync` before opening Xcode. The app itself will behave identically.

## One question

Push notifications: gone entirely, or keep the plugin installed as scaffolding for a future gentle "time to check in" reminder? Everything else above I'd remove outright.
