# Brief for Lovable — ANREN iOS / auth setup

Use this when asking Lovable to continue work on this project so they have context and don’t overwrite the iOS/auth setup.

---

## What’s already done (please don’t overwrite)

1. **iOS app (Capacitor)**  
   - `ios/` is a full Xcode project; bundle ID `com.anrenapp.anren`.  
   - Production build serves from `dist/` (no dev server URL in `capacitor.config.ts`).  
   - Contacts: `@capacitor-community/contacts` + `NSContactsUsageDescription` in Info.plist.

2. **Native Google Sign-In on iOS**  
   - **Capgo** (`@capgo/capacitor-social-login`) is installed and wired.  
   - **`src/lib/authNative.ts`** implements native Google sign-in for iOS: nonce generation, `signInWithIdToken` with Supabase.  
   - **`src/pages/Auth.tsx`** uses this on iOS (`Capacitor.getPlatform() === "ios"`) and keeps Lovable’s `signInWithOAuth` for web.  
   - **`ios/App/App/AppDelegate.swift`** forwards URL opens to `GIDSignIn.sharedInstance.handle(url)`.  
   - **`ios/App/App/Info.plist`** has the Google URL scheme: `com.googleusercontent.apps.642658972912-pg1g1hti6rkv53s2m30cve5auenjti7d`.

3. **Calendar redirect on iOS**  
   - **`src/lib/utils.ts`** has `getAppOrigin()` (uses `VITE_PUBLIC_WEB_ORIGIN` or `window.location.origin`).  
   - **`GoogleCalendarView`** and **`GoogleCallback`** use `getAppOrigin() + '/google-callback'` for the OAuth redirect so calendar connect works on iOS with a stable HTTPS redirect.

---

## What Lovable needs to do / keep in mind

1. **Environment variables (not in repo)**  
   The app expects these in **`.env.local`** (git-ignored). Lovable’s build/deploy must provide:
   - `VITE_GOOGLE_WEB_CLIENT_ID` = `642658972912-pl00m439aqavqbdhgne2a5dpk8oj3v3d.apps.googleusercontent.com`
   - `VITE_GOOGLE_IOS_CLIENT_ID` = `642658972912-pg1g1hti6rkv53s2m30cve5auenjti7d.apps.googleusercontent.com`
   - Optional: `VITE_PUBLIC_WEB_ORIGIN` = our public web URL (e.g. Lovable preview or custom domain) for calendar OAuth redirect.

2. **Supabase Google provider**  
   In Supabase Dashboard → Authentication → Providers → Google, the **same** Web and iOS client IDs above must be configured so `signInWithIdToken` works for both web and native.

3. **Don’t replace**  
   - `src/lib/authNative.ts`  
   - The iOS branch in `Auth.tsx` (native Google sign-in on iOS)  
   - `getAppOrigin()` in `src/lib/utils.ts` and its use in `GoogleCalendarView` and `GoogleCallback`  
   - `ios/App/App/AppDelegate.swift` (Google Sign-In URL handling)  
   - `ios/App/App/Info.plist` (URL scheme and contacts usage description)

4. **After any web or config change for iOS**  
   Run `npm run build && npx cap sync ios` before building in Xcode or shipping to TestFlight.

---

## Copy-paste prompt for Lovable

You can send something like this:

```
ANREN repo has iOS and native Google auth already set up. Please read docs/lovable-brief.md in the repo.

When you change the app:
- Keep the existing native Google Sign-In on iOS (src/lib/authNative.ts and the iOS branch in Auth.tsx).
- Keep getAppOrigin() and calendar redirect using it in GoogleCalendarView and GoogleCallback.
- Don’t overwrite ios/App/App/AppDelegate.swift or the Google URL scheme in Info.plist.
- For builds that include iOS, ensure env has VITE_GOOGLE_WEB_CLIENT_ID and VITE_GOOGLE_IOS_CLIENT_ID (see docs/lovable-brief.md for values). Supabase Google provider must use the same client IDs.
- After front-end or config changes, run: npm run build && npx cap sync ios before building the iOS app.
```

---

## Reference: Google client IDs in use

| Use | Client ID |
|-----|-----------|
| Web | `642658972912-pl00m439aqavqbdhgne2a5dpk8oj3v3d.apps.googleusercontent.com` |
| iOS | `642658972912-pg1g1hti6rkv53s2m30cve5auenjti7d.apps.googleusercontent.com` |
| iOS URL scheme (Info.plist) | `com.googleusercontent.apps.642658972912-pg1g1hti6rkv53s2m30cve5auenjti7d` |
