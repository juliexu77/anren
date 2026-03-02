## Project summary

- **Name**: ANREN (\"Where the mental load rests\")
- **What it is**: Mobile‑first thought/mental‑load manager. Users brain‑dump text, screenshots, and voice; the app turns them into structured cards that can be scheduled, grouped, and linked to calendar events.
- **Stack**:
  - **Frontend**: React 18 + TypeScript + Vite, React Router, shadcn-ui, Tailwind.
  - **Data & auth**: Supabase (Postgres, Auth, Storage, Edge Functions, Realtime).
  - **AI**:
    - Supabase edge function `parse-image` calls **Claude Sonnet** to extract card data from images.
    - `classify-note` and `process-brain-dump` use Lovable’s Gemini gateway to classify notes and expand brain dumps.
  - **Mobile shell**: Capacitor (iOS + Android ready), plus **Capgo Social Login** for native Google sign‑in on iOS.

## Domain model

- **BrainCard** (`src/types/card.ts`):
  - **Core fields**: `id`, `title`, `summary`, `body`, `source`, `type`, `status`, `dueAt`, `googleEventId`, `createdAt`, `updatedAt`.
  - **Source**: `text` | `screenshot` | `voice` | `brain_dump`.
  - **Type**: `task` (one‑time), `ongoing`, `event` (calendar‑bound).
  - **Status**: `active`, `scheduled`, `complete`.
  - Helper mappers `mapStatus`/`mapType` normalize legacy values.
- **People**: stored in Supabase `people` table, surfaced via `usePeople` and `PeopleView` to track important contacts and drafts.
- **Profiles**: Supabase `profiles` table stores Google Calendar tokens used by the `google-calendar` edge function.

## Key flows

### Card creation & AI processing

- **Text / brain dump**:
  - User writes notes or a stream‑of‑consciousness dump.
  - Frontend calls `process-brain-dump` edge function, which uses Gemini (`extract_items` tool) to emit structured items (title, type, theme, optional `due_at`).
  - Items become `BrainCard` rows with appropriate `type`, `status`, and `dueAt`.

- **Screenshots / images**:
  - `NewCardSheet` uploads the image to Supabase Storage (`card-images`).
  - Calls edge function **`parse-image`**:
    - Uses **Anthropic Claude Sonnet** with a `tools.extract_card_info` schema (title, ultra‑short summary, body, category).
    - Returns structured data which is written back to the card.

- **Voice notes**:
  - `VoiceRecorder` records audio, sends it to `transcribe-voice` edge function.
  - That function produces transcript + summary/category, which populates a new `BrainCard`.

### Calendar integration

- **Connect flow**:
  - `GoogleCalendarView` checks connection via `google-auth-callback?action=check-status`.
  - \"Connect Google Calendar\" button calls `get-auth-url` on the same function, building an OAuth URL with:
    - `redirectUri = getAppOrigin() + "/google-callback"`.
  - Browser/iOS WebView goes to Google, then back to `/google-callback`, which is handled by `src/pages/GoogleCallback.tsx`.
  - `GoogleCallback` exchanges the `code` via `google-auth-callback?action=exchange-code`, which stores `google_access_token` + `google_refresh_token` in `profiles`.

- **Using calendar data**:
  - `useGoogleCalendar` calls `google-calendar` edge function (actions: `list`, `create`, `delete`, `birthdays`) using the Supabase auth JWT.
  - `GoogleCalendarView` shows a 7‑day agenda and can create/delete primary calendar events.
  - `PeopleView` uses `google-calendar?action=birthdays` to show upcoming birthdays from Google’s contacts birthday calendar.

## Auth & platforms

- **Web auth**:
  - `Auth.tsx` uses `lovable.auth.signInWithOAuth(\"google\", { redirect_uri: window.location.origin, extraParams: { access_type: \"offline\", prompt: \"consent\", scope: \"openid email profile https://www.googleapis.com/auth/calendar\" } })`.
  - On success, Lovable Cloud Auth calls `supabase.auth.setSession(tokens)` so Supabase is the source of truth.

- **iOS native auth (Capacitor)**:
  - Native shell: `ios/` project, bundle ID `com.anrenapp.anren`, created with `npx cap add ios`.
  - Plugin: `@capgo/capacitor-social-login` installed and synced.
  - `src/lib/authNative.ts`:
    - Generates a nonce + SHA‑256 digest.
    - Calls `SocialLogin.initialize({ google: { webClientId: VITE_GOOGLE_WEB_CLIENT_ID, iOSClientId: VITE_GOOGLE_IOS_CLIENT_ID, iOSServerClientId: VITE_GOOGLE_WEB_CLIENT_ID, mode: \"online\" } })`.
    - Calls `SocialLogin.login({ provider: \"google\", options: { scopes: [\"email\",\"profile\",\"https://www.googleapis.com/auth/calendar\"], nonce: nonceDigest } })`.
    - Validates the ID token audience + nonce and signs in via `supabase.auth.signInWithIdToken({ provider: \"google\", token, nonce: rawNonce? })`.
  - `Auth.tsx`:
    - On **native iOS** (`Capacitor.isNativePlatform() && Capacitor.getPlatform() === \"ios\"`), calls `signInWithGoogleNative()` and shows toast on error.
    - On **web**, keeps the Lovable Cloud OAuth flow.
  - `ios/App/App/AppDelegate.swift`:
    - Imports `GoogleSignIn` and routes URLs through `GIDSignIn.sharedInstance.handle(url)` before falling back to `ApplicationDelegateProxy`.
  - `ios/App/App/Info.plist`:
    - Includes `NSContactsUsageDescription`.
    - URL scheme: `com.googleusercontent.apps.642658972912-pg1g1hti6rkv53s2m30cve5auenjti7d` (reversed iOS client ID).

## Environment & configuration

- **Frontend env (Vite)** — loaded via `.env` / `.env.local`:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — for Supabase client.
  - `VITE_GOOGLE_WEB_CLIENT_ID` — Google OAuth web client ID.
  - `VITE_GOOGLE_IOS_CLIENT_ID` — Google OAuth iOS client ID.
  - `VITE_PUBLIC_WEB_ORIGIN` (optional but recommended) — canonical web origin (e.g. `https://anren.app`), used by `getAppOrigin()` to build the calendar redirect: `${origin}/google-callback`.

- **Edge function env (Supabase secrets)**:
  - `ANTHROPIC_API_KEY` — for `parse-image` (Claude Sonnet).
  - `LOVABLE_API_KEY` — for `classify-note` and `process-brain-dump` (Lovable’s Gemini gateway).
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — for `google-auth-callback` and `google-calendar` (Calendar OAuth and API calls).
  - `SUPABASE_SERVICE_ROLE_KEY` — used by server‑side functions to update `profiles`.

- **Google Cloud**:
  - Web client ID: `642658972912-pl00m439aqavqbdhgne2a5dpk8oj3v3d.apps.googleusercontent.com`.
  - iOS client ID: `642658972912-pg1g1hti6rkv53s2m30cve5auenjti7d.apps.googleusercontent.com`.
  - Important redirect URI: `https://anren.app/google-callback` (must be whitelisted for calendar connect).

## Things to preserve when editing

- **Do not remove or bypass**:
  - `src/lib/authNative.ts` and the iOS branch in `Auth.tsx` — they implement native, nonce‑safe Google sign‑in for Supabase.
  - `getAppOrigin()` in `src/lib/utils.ts` and its usage in `GoogleCalendarView` and `GoogleCallback` — required so calendar OAuth works on both web and iOS.
  - URL scheme and Google Sign‑In handling in `ios/App/App/Info.plist` and `ios/App/App/AppDelegate.swift`.
  - Supabase edge functions’ tool/JSON schemas when calling external AI APIs; callers expect those shapes.

## How to run and build

- **Web dev**:
  - `npm install`
  - `npm run dev`
- **Prod build**:
  - `npm run build`
- **iOS**:
  - `npm run build && npx cap sync ios`
  - `npx cap open ios` → build/run from Xcode, then Archive for TestFlight as usual.

