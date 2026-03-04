# Push Notifications Setup (iOS)

This doc confirms the push notification setup and what to check for **TestFlight and production**.

## What’s in place

### 1. Xcode capabilities (you added these)
- **Push Notifications** capability
- **Background Modes** → **Remote notifications** enabled

### 2. Info.plist
- `UIBackgroundModes` → `remote-notification` (required for background delivery)

### 3. Entitlements
- `ios/App/App/App.entitlements` has `aps-environment`:
  - **development** — used when running from Xcode (debug) or with a development provisioning profile
  - For **TestFlight / App Store**, Xcode should set this to **production** when you archive with a distribution profile. If push doesn’t work on TestFlight, in Xcode check **Signing & Capabilities** → Push Notifications and ensure the production entitlement is used for release builds.

### 4. AppDelegate
- `didRegisterForRemoteNotificationsWithDeviceToken` — forwards the APNs device token to Capacitor via `NotificationCenter` so the JS `registration` listener receives it.
- `didFailToRegisterForRemoteNotificationsWithError` — forwards errors to the `registrationError` listener.

Without these two methods, the Capacitor plugin never gets the token and `usePushNotifications` never receives it.

### 5. Frontend
- **Plugin:** `@capacitor/push-notifications`
- **Hook:** `usePushNotifications()` in `src/hooks/usePushNotifications.ts`:
  - Requests permission, calls `PushNotifications.register()`, listens for `registration` and `registrationError`.
  - On success, upserts the token into Supabase `device_tokens` (user_id, token, platform).
- **Usage:** `src/pages/Index.tsx` calls `usePushNotifications()` so every signed-in user on a native device registers.

### 6. Capacitor config
- `capacitor.config.ts` → `plugins.PushNotifications.presentationOptions: ["badge", "sound", "alert"]` so notifications show when the app is in the foreground.

### 7. Backend
- **Table:** `device_tokens` (user_id, token, platform, unique on user_id+token), RLS so users only see their own tokens.
- **Sender:** Supabase Edge Function `send-daily-brief` sends APNs via HTTP/2 using env: `APNS_KEY_BASE64`, `APNS_KEY_ID`, `APNS_TEAM_ID`; bundle id `com.anrenapp.anren`.

## Checklist for push to work

1. **Apple Developer:** Push Notifications capability and a valid provisioning profile (development or distribution).
2. **Xcode:** Push Notifications + Background Modes → Remote notifications enabled (you did this).
3. **AppDelegate:** Token forwarding methods added (done in this review).
4. **Physical device:** APNs does not work in the simulator; use a real iPhone.
5. **Permission:** User must accept the notification permission prompt (triggered by `usePushNotifications` after sign-in).
6. **Backend (for daily brief):** Set Supabase secrets for `send-daily-brief`: `APNS_KEY_BASE64`, `APNS_KEY_ID`, `APNS_TEAM_ID` (from Apple Developer → Keys → APNs key).

---

## For TestFlight: what you must do

### In Xcode (before archiving for TestFlight)

1. **Signing & Capabilities**
   - Select the **App** target → **Signing & Capabilities**.
   - Ensure **Push Notifications** is listed (if not, click **+ Capability** and add it).
   - Ensure **Background Modes** is listed and **Remote notifications** is checked.

2. **Release uses production entitlement**
   - The project is already set so **Release** uses `App/App-release.entitlements` (aps-environment = production). No change needed unless you edited the project.
   - To confirm: select the **App** target → **Build Settings** → search **Code Signing Entitlements** → for **Release** it should be `App/App-release.entitlements`.

3. **Archive**
   - **Product → Archive**. Use **Distribute App** → **App Store Connect** (or TestFlight). Push will only work if the archive was built with the **Release** configuration (it is by default).

### Apple Developer (one-time for sending pushes)

4. **APNs key (for your backend)**
   - [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Keys**.
   - Create a key with **Apple Push Notifications service (APNs)** enabled. Download the `.p8` file (only once).
   - Note **Key ID** and **Team ID**. The **Team ID** is in the top-right of the developer account or under **Membership**.
   - Base64-encode the `.p8` file contents (e.g. `base64 -i AuthKey_XXXXX.p8 | tr -d '\n'`).

5. **Supabase secrets (for `send-daily-brief`)**
   - In Supabase: **Project Settings** → **Edge Functions** → **Secrets** (or `supabase secrets set`).
   - Set:
     - `APNS_KEY_BASE64` = base64 string of the .p8 file
     - `APNS_KEY_ID` = the key id (e.g. `ABCD1234`)
     - `APNS_TEAM_ID` = your 10-character team id
   - The bundle id in code is `com.anrenapp.anren`; it must match the app’s bundle id in Xcode.

### On the device (TestFlight user)

6. **First launch**
   - User opens the app from TestFlight, signs in with Google.
   - The app requests notification permission; user must tap **Allow**.
   - The device token is then sent to your backend and stored in `device_tokens`. If the user denies, no token is saved and they will not get the daily brief (or any push).

### If push still doesn’t work on TestFlight

- Confirm the build was **Release** (not Debug) and used `App-release.entitlements` (production).
- In Supabase, check that the user has a row in `device_tokens` after they allowed notifications.
- Check that `send-daily-brief` has the three APNs secrets set and that the user has **Daily brief** enabled in app settings (and a delivery time).

---

## After code changes

Run:

```bash
npm run build && npx cap sync ios
```

Then open the iOS project in Xcode. For **TestFlight**, use **Product → Archive** and distribute; do not upload a Debug build. The first time a user opens the TestFlight build and signs in, they should see the notification permission prompt; after granting, the token is stored in `device_tokens` and the backend can send pushes.
