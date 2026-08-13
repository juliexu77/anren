# App Store submission pack — anren

Everything App Review asks for, and where it lives.

## URLs (live after publishing)

| Requirement | URL |
|---|---|
| Privacy Policy (required field in App Store Connect) | https://anren.app/privacy |
| Terms of Use / EULA | https://anren.app/terms |
| Support URL (required field) | https://anren.app/support |
| Marketing URL (optional) | https://anren.app |
| Account deletion (in-app, required by Guideline 5.1.1(v)) | Settings → Delete account (`/delete-account`) |

## Account deletion

`/delete-account` requires typing "delete", then calls the `delete-account` backend function, which
removes stored audio, notes, passages, folders, digests and the profile row, then deletes the sign-in
record itself. Reviewers can reach it in two taps from Settings.

## Review notes (paste into App Store Connect → App Review Information)

> anren is a private single-user voice memo notetaker. Sign in with Apple or Google, tap record, speak,
> and the note is transcribed and summarised automatically. No meetings are recorded and no other
> participants are involved. Microphone access is used only while a recording is active. Account deletion
> is available in-app at Settings → Delete account.

Provide the test account from the stored test credentials, or use Sign in with Apple.

## Privacy nutrition label (App Privacy questionnaire)

Data collected, linked to the user, used for **App Functionality** only. Not used for tracking, not used
for advertising, no third-party ad SDKs.

- Contact Info → Email Address (from Sign in with Apple / Google)
- User Content → Audio Data (voice recordings)
- User Content → Other User Content (transcripts, summaries, folders)
- Diagnostics → Crash / Performance Data (server-side error logs)

Answer "No" to: tracking across apps, data used for advertising, location, contacts, health data,
browsing history, identifiers for tracking.

## Permission strings (already in `ios/App/App/Info.plist`)

- `NSMicrophoneUsageDescription` — recording voice notes.
- No other sensitive permission strings are present; v2 needs none, and unused ones trigger rejection.

## Metadata checklist

- Name: `anren`
- Subtitle (30 chars): `Think out loud`
- Category: Productivity
- Age rating: 4+
- Keywords: voice memo, notes, transcribe, journal, dictation, voice notes, thoughts
- Description: lead with "Talk it through. anren transcribes what you said, writes it up, and remembers
  it." Do not mention meetings or other participants.
- Screenshots: 6.9" and 6.5" iPhone required — capture feed, recording state, note detail with Related,
  search results, On my mind.
- Sign in with Apple must be offered wherever Google sign-in is (already the case).

## Pre-flight

```bash
npm run build && npx cap sync ios
```

Then in Xcode: bundle ID, signing team, version/build bump, Archive → Distribute → App Store Connect.
