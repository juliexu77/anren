# Google Auth Architecture & Implementation

A reference for apps that have **both a web app and an iOS app** and need:

1. **App sign-in** — User signs in with Google; session is stored in **Supabase Auth**.
2. **Optional second OAuth** — e.g. “Connect Google Calendar” using a **redirect flow** and storing tokens in your own DB (e.g. `profiles`).

This doc describes the architecture and implementation used in this repo so you can reuse the same patterns elsewhere.

---

## 1. Overview

| Purpose | Web | iOS (Capacitor) |
|--------|-----|------------------|
| **App sign-in** | Browser OAuth redirect → Lovable Cloud Auth → `supabase.auth.setSession()` | Native Google Sign-In (Capgo) → ID token → `supabase.auth.signInWithIdToken()` |
| **Calendar connect** | Same on both: edge function returns OAuth URL → user goes to Google → redirect to `/google-callback` → edge function exchanges code → tokens stored in `profiles` |

Important points:

- **Supabase is the single source of truth** for app sessions (web and iOS).
- **Web** uses a **redirect-based** OAuth flow (Lovable); **iOS** uses **native** Google Sign-In and never uses the web redirect for sign-in (avoids 404s and WebView issues).
- **Canonical origin** (`getAppOrigin()`) is used for **Calendar** redirect URI so the same redirect works from web and from iOS WebView when you “Connect Google Calendar”.

---

## 2. High-level flows

### 2.1 App sign-in (who is the user?)

```
WEB:
  User clicks "Sign in with Google"
    → lovable.auth.signInWithOAuth("google", { redirect_uri: origin, ... })
    → User is redirected to Google
    → Google redirects to Lovable callback (e.g. /~oauth/callback or provider-specific)
    → Lovable sets Supabase session (setSession)
    → App redirects to /

IOS:
  User clicks "Sign in with Google"
    → signInWithGoogleNative() (Capgo Social Login)
    → Native Google Sign-In UI
    → App receives ID token (no redirect)
    → supabase.auth.signInWithIdToken({ provider: "google", token, nonce })
    → Supabase session set in-app
```

### 2.2 Calendar connect (optional second OAuth)

Same on **web and iOS**:

```
User already signed in (Supabase session exists)
  → UI: "Connect Google Calendar"
  → Frontend calls edge function: action=get-auth-url, body: { redirectUri: getAppOrigin() + "/google-callback" }
  → Edge function returns Google OAuth URL (Calendar scope only)
  → window.location.href = url  (user leaves app, goes to Google)
  → User consents
  → Google redirects to {origin}/google-callback?code=...
  → Frontend (GoogleCallback page) reads code, calls edge function: action=exchange-code, body: { code, redirectUri }
  → Edge function exchanges code for access/refresh tokens, stores in profiles
  → Redirect to /
```

The **redirect URI** for Calendar must be a **single canonical URL** (e.g. `https://yourapp.com/google-callback`) and must be whitelisted in Google Cloud for the **Web client**. On iOS, when the user taps “Connect Google Calendar”, the in-app WebView (or browser) uses that same URL so the redirect lands on your app’s domain; then your SPA or Capacitor WebView loads `/google-callback` and completes the exchange.

---

## 3. Implementation by layer

### 3.1 Frontend env (Vite)

| Variable | Purpose |
|---------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_GOOGLE_WEB_CLIENT_ID` | Google OAuth **Web** client ID (used by Lovable on web; also as server client ID on iOS) |
| `VITE_GOOGLE_IOS_CLIENT_ID` | Google OAuth **iOS** client ID (native Sign-In) |
| `VITE_PUBLIC_WEB_ORIGIN` | Canonical origin for redirects (e.g. `https://anren.app`). Used by `getAppOrigin()` so Calendar redirect URI is correct on web and when opened from iOS. |

Use `.env` / `.env.local`; never commit secrets.

### 3.2 Canonical origin: `getAppOrigin()`

Calendar OAuth needs a **stable redirect URI**. Use a single helper so web and iOS agree:

```ts
// src/lib/utils.ts (or equivalent)
export function getAppOrigin(): string {
  const envOrigin = import.meta.env?.VITE_PUBLIC_WEB_ORIGIN;
  if (envOrigin?.length) return envOrigin.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin;
  return "";
}
```

- **Web:** Set `VITE_PUBLIC_WEB_ORIGIN` to your production URL so redirects always go to `https://yourapp.com/google-callback` even when developing on localhost.
- **iOS:** When the user connects Calendar, the browser/WebView will redirect to that same URL; your app can open that URL in a WebView or external browser and load the `/google-callback` route to finish the flow.

### 3.3 Web app sign-in (Lovable + Supabase)

- **Auth page:** One “Sign in with Google” button. On **web** only, call:

  ```ts
  await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
    extraParams: {
      access_type: "offline",
      prompt: "consent",
      scope: "openid email profile https://www.googleapis.com/auth/calendar",
    },
  });
  ```

- Lovable redirects to Google; after consent, Lovable’s callback runs and then your app receives control. The Lovable SDK typically calls `supabase.auth.setSession(tokens)` so the session is in Supabase.

- **Lovable OAuth callback route:** Lovable may redirect to a path like `/~oauth/callback`. Define that route so it does **not** 404; show a short “Completing sign-in…” and redirect to `/` so the auth state refreshes.

  ```tsx
  // Route: /~oauth/callback
  export default function LovableOAuthCallback() {
    const navigate = useNavigate();
    useEffect(() => {
      const t = setTimeout(() => navigate("/", { replace: true }), 2000);
      return () => clearTimeout(t);
    }, [navigate]);
    return <div>Completing sign-in...</div>;
  }
  ```

### 3.4 iOS app sign-in (native, no redirect)

- **Do not** use the web OAuth redirect on iOS. Use **native** Google Sign-In and then Supabase’s `signInWithIdToken`.

- **Plugin:** `@capgo/capacitor-social-login` (or similar). Initialize with:
  - **Web client ID** — same as your web app (and used as “server” client ID for backend validation).
  - **iOS client ID** — from Google Cloud (iOS OAuth client).

- **Nonce:** To prevent token replay, send a nonce with the sign-in request and validate it in the ID token:
  1. Generate a random nonce (e.g. 32 bytes, hex).
  2. Compute SHA-256 hash of the nonce (digest).
  3. Pass the **digest** to the native Google Sign-In (if the plugin supports a `nonce` option).
  4. When you get the ID token back, decode the JWT and check:
     - `aud` is one of your client IDs (web + iOS).
     - `nonce` (if present) matches the **raw** nonce you generated (Supabase may expect the raw nonce in `signInWithIdToken`; check Supabase docs).
  5. Call `supabase.auth.signInWithIdToken({ provider: "google", token, nonce: rawNonce })`.

- **iOS URL scheme:** In Xcode / Info.plist, add a URL scheme equal to the **reversed iOS client ID** (e.g. `com.googleusercontent.apps.123456-xxxx`). Google Sign-In uses this to return control to your app.

- **AppDelegate:** Handle the callback URL so Google Sign-In gets first chance:

  ```swift
  import GoogleSignIn

  func application(_ app: UIApplication, open url: URL, options: ...) -> Bool {
    if GIDSignIn.sharedInstance.handle(url) { return true }
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
  }
  ```

- **Auth page branching:** On the Auth screen, if `Capacitor.getPlatform() === "ios"` (or `isNativeApp()`), call `signInWithGoogleNative()` and do **not** call `lovable.auth.signInWithOAuth`.

### 3.5 Calendar connect (shared web + iOS)

- **Get auth URL:** Authenticated request to your edge function with `action=get-auth-url` and body `{ redirectUri: getAppOrigin() + "/google-callback" }`. Edge function builds Google’s OAuth URL with:
  - `client_id` (Web client)
  - `redirect_uri` (same as sent)
  - `response_type=code`, `scope=calendar`, `access_type=offline`, `prompt=consent`, and optionally `state: user.id`.

- **Redirect:** Set `window.location.href = result.url`. User goes to Google, then returns to `{origin}/google-callback?code=...`.

- **Exchange code:** Your `/google-callback` page reads `code` (and optionally `state`), then POSTs to the edge function with `action=exchange-code` and `{ code, redirectUri }`. The edge function:
  - Exchanges `code` for access + refresh tokens with Google.
  - Stores them in your DB (e.g. `profiles.google_access_token`, `google_refresh_token`, `google_token_expires_at`) keyed by the Supabase user id (from JWT or `state`).
  - Uses **service role** or an authenticated update so only the current user’s row is updated.

- **Check status:** Optional `action=check-status` that returns whether the user has Calendar tokens stored (so you can show “Connected” vs “Connect Google Calendar”).

### 3.6 Edge function env (Supabase secrets)

For the **Calendar** OAuth edge function:

| Secret | Purpose |
|--------|--------|
| `GOOGLE_CLIENT_ID` | Same as your **Web** client ID |
| `GOOGLE_CLIENT_SECRET` | Web client secret |
| `SUPABASE_SERVICE_ROLE_KEY` | To update `profiles` (or other table) with tokens |

App sign-in does **not** need these in the edge function; it’s handled by Lovable (web) and Supabase Auth (iOS with ID token).

---

## 4. Google Cloud Console checklist

- **APIs & Services → Credentials**
  - **Web client** (e.g. “Web client 1”): Used by Lovable and by your edge function for Calendar. Add **Authorized redirect URIs**:
    - Production: `https://yourdomain.com/google-callback` (and `https://yourdomain.com` if Lovable needs it)
    - Optional: `http://localhost:5173/google-callback` for local dev
  - **iOS client**: Create an iOS OAuth 2.0 client; use the bundle ID of your Capacitor app. The **URL scheme** in Xcode must match the reversed client ID (e.g. `com.googleusercontent.apps.xxxx`).

- **OAuth consent screen:** Configure so “Sign in with Google” and Calendar scope are allowed for your app.

---

## 5. Routes and auth guards

- **Unauthenticated:** Only `/auth` and `/~oauth/callback` (and optionally `/privacy`, `/terms`) are reachable without a session.
- **Protected:** All other routes (e.g. `/`, `/google-callback`) should be behind a guard that:
  - If no session → redirect to `/auth`.
  - `/google-callback` must run only when the user is already signed in (you need the Supabase session to call the edge function with `Authorization: Bearer <access_token>`).

Example guard:

```tsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// Routes
<Route path="/auth" element={<Auth />} />
<Route path="/~oauth/callback" element={<LovableOAuthCallback />} />
<Route path="/google-callback" element={<ProtectedRoute><GoogleCallback /></ProtectedRoute>} />
<Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
```

---

## 6. File reference (this repo)

| Area | File(s) |
|------|--------|
| Auth UI & platform branch | `src/pages/Auth.tsx` |
| Native sign-in (nonce, ID token, Supabase) | `src/lib/authNative.ts` |
| Canonical origin | `src/lib/utils.ts` → `getAppOrigin()` |
| Lovable OAuth (web) | `src/integrations/lovable/index.ts` |
| Web OAuth callback (no 404) | `src/pages/LovableOAuthCallback.tsx` |
| Calendar callback (exchange code) | `src/pages/GoogleCallback.tsx` |
| Calendar connect UI (get-auth-url, check-status) | `src/components/GoogleCalendarView.tsx`, `src/hooks/useGoogleCalendar.ts` |
| Auth state | `src/hooks/useAuth.ts` (Supabase session) |
| Routes | `src/App.tsx` |
| Edge: Calendar OAuth | `supabase/functions/google-auth-callback/index.ts` |
| iOS URL scheme | `ios/App/App/Info.plist` → `CFBundleURLTypes` |
| iOS URL handling | `ios/App/App/AppDelegate.swift` |

---

## 7. Checklist for another app (web + iOS)

1. **Google Cloud:** Create Web and iOS OAuth clients; add redirect URI for `/google-callback` (and any auth provider callback) for the Web client.
2. **Env:** Set `VITE_GOOGLE_WEB_CLIENT_ID`, `VITE_GOOGLE_IOS_CLIENT_ID`, `VITE_PUBLIC_WEB_ORIGIN` (and Supabase vars).
3. **Web sign-in:** Use your auth provider’s OAuth (e.g. Lovable) with `redirect_uri: window.location.origin` and ensure the provider’s callback route exists (e.g. `/~oauth/callback`).
4. **iOS sign-in:** Use native Google Sign-In (e.g. Capgo), nonce, validate ID token `aud`/`nonce`, then `supabase.auth.signInWithIdToken()`. Do **not** use web redirect on iOS for app sign-in.
5. **iOS project:** Add URL scheme (reversed iOS client ID), `GoogleSignIn` in AppDelegate before Capacitor.
6. **Calendar (if needed):** Implement `getAppOrigin()`, edge function `get-auth-url` / `exchange-code` / `check-status`, `/google-callback` page (protected), and store tokens in DB keyed by user id.
7. **Guards:** Protect all app routes; keep `/auth` and OAuth callback routes public; require session for `/google-callback`.

This gives you a single Supabase session for web and iOS, and a consistent pattern for a second OAuth (e.g. Google Calendar) shared across both platforms.
