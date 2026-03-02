# iOS deployment plan — ANREN

Plan to deploy ANREN as a native iOS app (TestFlight / App Store). The app already has Capacitor and native contacts set up; the iOS project has not been added yet.

---

## Prerequisites

- **Mac** with **Xcode** (latest stable from Mac App Store).
- **Apple Developer account** ($99/year) for running on a real device and for App Store distribution.
- **Node.js** (v18+) and **npm** installed locally.
- **CocoaPods** (Xcode usually installs this; run `pod --version`; if missing, `sudo gem install cocoapods`).

---

## Phase 1: Add the iOS platform

1. **Install dependencies and build the web app**
   ```bash
   npm ci
   npm run build
   ```
   This produces the `dist/` folder that Capacitor will embed.

2. **Add the iOS project**
   ```bash
   npx cap add ios
   ```
   This creates the `ios/` folder (e.g. `ios/App/`) with the Xcode project and wires it to `webDir: 'dist'`.

3. **Sync web assets into the native project** (run after any `npm run build`)
   ```bash
   npx cap sync ios
   ```

---

## Phase 2: Configure for production

Right now `capacitor.config.ts` has **hot-reload** pointing at your Lovable preview URL. For a shipped app you can either bundle the app or keep loading from a URL.

**Option A — Bundled app (recommended for App Store)**  
- The app serves files from `dist/` inside the .ipa (works offline, no dependency on a single URL).
- In `capacitor.config.ts`, **remove or comment out** the `server` block:
  ```ts
  // server: {
  //   url: 'https://...',
  //   cleartext: true,
  // },
  ```
- After changing config: `npm run build` then `npx cap sync ios`.

**Option B — Hosted app (load from URL)**  
- Keep the `server` block but set `server.url` to your **production** URL (e.g. after you “Publish” in Lovable or use a custom domain).
- The iOS app will always load that URL (no offline, requires network). Still run `npx cap sync ios` after config changes.

---

## Phase 3: iOS-specific setup

1. **Contacts permission (required for “Import contacts”)**  
   The Contacts plugin will prompt at runtime; Apple also requires a usage description in **Info.plist**.
   - Open the iOS project in Xcode: `npx cap open ios`.
   - In the project navigator, open **App** → **App** → **Info.plist**.
   - Add a row:
     - **Key**: `Privacy - Contacts Usage Description` (or raw key `NSContactsUsageDescription`).
     - **Value**: e.g. *"ANREN uses your contacts so you can add people to your circle."*
   - Save. This string is shown in the system permission dialog.

2. **Bundle ID (optional but recommended for release)**  
   - In Xcode: select the **App** project → **App** target → **Signing & Capabilities**.
   - Set a proper **Bundle Identifier** (e.g. `app.lovable.anren` or your own reverse-DNS). The current `appId` in `capacitor.config.ts` is tied to Lovable; change it there too if you change it in Xcode, then run `npx cap sync ios`.

3. **Signing**  
   - **Signing & Capabilities** → enable **Automatically manage signing**, choose your Team (Apple Developer account).  
   - For distribution, create an App Store provisioning profile (Xcode can do this when you archive).

---

## Phase 4: Run on device / simulator

1. **Open in Xcode**
   ```bash
   npx cap open ios
   ```

2. **Select a run destination**  
   - Simulator: pick an iPhone simulator.  
   - Device: connect an iPhone, select it, and trust the device. You may need to set the device as a development target in the Apple Developer portal.

3. **Run**  
   Click Run (▶). The first time on a real device, confirm the Contacts permission when you use “Import” in the People flow.

---

## Phase 5: TestFlight / App Store

1. **Archive**
   - In Xcode: **Product** → **Archive** (with a device or “Any iOS Device” as destination, not Simulator).
   - If signing is set up, the archive is created successfully.

2. **Distribute**
   - In Organizer, select the archive → **Distribute App**.
   - Choose **App Store Connect** (for TestFlight and App Store).
   - Follow the wizard (upload, manage version/build in App Store Connect).

3. **App Store Connect**
   - Create the app in [App Store Connect](https://appstoreconnect.apple.com) if you haven’t (name, bundle ID, etc.).
   - After upload, the build appears under TestFlight for internal/external testers.
   - When ready, submit for App Review and choose “Submit for Review” for the App Store.

---

## Checklist summary

| Step | Action |
|------|--------|
| 1 | `npm ci` and `npm run build` |
| 2 | `npx cap add ios` (once) |
| 3 | Remove or set `server` in `capacitor.config.ts` for production |
| 4 | `npm run build` and `npx cap sync ios` |
| 5 | Add `NSContactsUsageDescription` in `ios/App/App/Info.plist` |
| 6 | (Optional) Set Bundle ID in Xcode and in `capacitor.config.ts` |
| 7 | Configure signing in Xcode |
| 8 | Run on simulator/device via Xcode |
| 9 | Archive → Distribute to App Store Connect → TestFlight / App Store |

---

## Handy commands

```bash
# After any web app change
npm run build && npx cap sync ios

# Open iOS project in Xcode
npx cap open ios
```

Once the iOS project exists, you can add npm scripts (e.g. `"build:ios": "npm run build && npx cap sync ios"`) if you like.
