# Dead code cleanup (iOS and push scaffolding stay)

Corrections accepted: push notifications stay, `next-themes` stays, `claude.md` is already rewritten. Capacitor and the iOS build are load-bearing and untouched.

## Stays, untouched

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `capacitor.config.ts`, the whole `ios/` Xcode project
- `@capgo/capacitor-social-login`, GoogleSignIn handling in `AppDelegate.swift`, the reversed-client-ID URL scheme, `src/lib/authNative.ts`
- **Push notification scaffolding** — `@capacitor/push-notifications`, `@capacitor/app`, the `PushNotifications` config block, `UIBackgroundModes: remote-notification`, and the APNs token-forwarding in `AppDelegate.swift`. Unwired today, but it's the annoying-to-redo part and check-in nudges fit the product. `docs/push-notifications-setup.md` stays too.
- `next-themes` — `src/components/ui/sonner.tsx` uses `useTheme()` and is live in `App.tsx`
- `claude.md` — already rewritten
- `NSMicrophoneUsageDescription` and everything recording-related
- Historical migrations (old `people` / health-signal tables are already dropped by a later migration)

## Removed — abandoned integrations

- `@perfood/capacitor-healthkit` (Apple Health experiment)
- `@capacitor-community/contacts` (Contacts import)
- `capacitor.config.ts`: the `Contacts` plugin block

## Removed — other strays

- `supabase/functions/transcribe-audio/` + its `config.toml` entry — zero callers; `process-note` transcribes inline
- `package.json` script `build:extension` — `extension/` is gone
- Unused packages and their orphan shadcn wrappers: `xlsx`, `recharts`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `vaul` — plus `chart.tsx`, `carousel.tsx`, `input-otp.tsx`, `calendar.tsx`, `resizable.tsx`, `drawer.tsx`
- `docs/google-auth-architecture.md`, and the Contacts/Health sections of `docs/ios-deployment-plan.md`, `docs/lovable-brief.md`, `docs/app-store-submission.md`

## Also folding in: the dead Calendar OAuth scope

`src/lib/authNative.ts` still requests `https://www.googleapis.com/auth/calendar` on every native sign-in, with no calendar feature behind it — real consent friction for nothing. Dropping it leaves `["email", "profile"]`. Reintroducing Calendar later is a one-line change, so I'd remove it now. Say the word if you'd rather leave it.

## Order of work

1. Delete the `transcribe-audio` function and its config entry.
2. Remove the HealthKit and Contacts plugins and the `Contacts` config block.
3. Remove the unused frontend packages and orphan shadcn wrappers.
4. Trim the calendar scope in `authNative.ts`.
5. Prune the stale docs and the dead `build:extension` script.
6. Build and run tests to confirm nothing changed behaviorally.

## After I'm done

Native deps change, so your next iOS build needs `git pull`, `npm install`, then `npx cap sync` before opening Xcode. App behavior is otherwise identical.
