# Put ANREN on TestFlight

Your iOS project is already set up (`ios/` folder, bundle ID `com.anrenapp.anren`, production config, contacts permission). Follow these steps to get a build on TestFlight.

---

## 1. App Store Connect — create the app (one-time)

1. Go to [App Store Connect](https://appstoreconnect.apple.com) and sign in with your Apple Developer account.
2. **My Apps** → **+** → **New App**.
3. Fill in:
   - **Platform**: iOS
   - **Name**: ANREN (or the name you want on TestFlight)
   - **Primary Language**: English (or your choice)
   - **Bundle ID**: choose **com.anrenapp.anren** (must match your Xcode project)
   - **SKU**: e.g. `anren-ios` (internal only)
4. Create the app. You don’t need to fill in store listing or pricing for TestFlight.

---

## 2. Xcode — signing and archive

1. **Open the project**
   ```bash
   cd /Users/juliebi/anren && npx cap open ios
   ```

2. **Select the App target** (left sidebar: **App** under the blue project icon).

3. **Signing & Capabilities**
   - Open the **Signing & Capabilities** tab.
   - Check **Automatically manage signing**.
   - **Team**: choose your Apple Developer team (your account).
   - If you see “Failed to register bundle identifier”, the bundle ID may already be in use or you need to register it in the [Developer portal](https://developer.apple.com/account/resources/identifiers/list). Create an App ID with `com.anrenapp.anren` and try again.

4. **Archive**
   - Top-left: set the run destination to **Any iOS Device (arm64)** (not a simulator).
   - Menu: **Product** → **Archive**.
   - Wait for the build to finish. The **Organizer** window should open with your archive.

---

## 3. Upload to App Store Connect

1. In **Organizer**, select the new archive.
2. Click **Distribute App**.
3. **App Store Connect** → **Next**.
4. **Upload** → **Next**.
5. Leave defaults (e.g. upload symbols, manage version) → **Next**.
6. Review and click **Upload**.
7. Wait until the upload completes.

---

## 4. TestFlight

1. In [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **ANREN**.
2. Open the **TestFlight** tab.
3. Under **iOS**, your build will appear in a few minutes (status “Processing”, then “Ready to Test”).
4. **Internal testing**: add yourself (and other team members with App Store Connect access) under **Internal Testing** → create a group if needed → add testers. They get an email and install via the TestFlight app.
5. **External testing** (optional): create an **External** group, add the build, add testers by email. The first build needs a quick **Beta App Review** by Apple (usually fast).

---

## If you change the web app later

```bash
npm run build && npx cap sync ios
```

Then in Xcode: **Product** → **Archive** again and upload the new build. Bump the **Build** number in Xcode (App target → **General** → **Build**) so TestFlight accepts it.

---

## Checklist

- [ ] App created in App Store Connect with bundle ID `com.anrenapp.anren`
- [ ] Xcode: signing set, Team selected
- [ ] Archive with **Any iOS Device (arm64)** (not Simulator)
- [ ] Distribute → App Store Connect → Upload
- [ ] TestFlight tab: wait for “Ready to Test”, add internal testers
