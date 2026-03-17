

## Two Issues: Push Notifications Not Working + Screen Locks During Voice Recording

### Issue 1: Push Notifications

The `device_tokens` table is **empty** — no device has ever successfully registered a push token. The `usePushNotifications` hook is wired up in `Index.tsx` and the code looks correct. Possible causes:

- **TestFlight/debug build issue**: The entitlements or provisioning profile may not be correctly configured for the build you're running. This is outside Lovable's control (Xcode signing config).
- **The hook runs on web preview, not native**: `Capacitor.isNativePlatform()` returns false on web, so the hook no-ops. This is expected — push only works on an actual device build.
- **Silent failure**: If `registrationError` fires but you can't see console logs from the native device, you'd never know.

**What I can do in code**: Add a visible diagnostic toast when running on native so you can see exactly what's happening with push registration without needing Xcode console attached.

#### Plan for push diagnostics:
**File: `src/hooks/usePushNotifications.ts`**
- After each step (permission check, permission request, register call, token received, errors), show a `toast()` message so you can visually confirm what's happening on the device
- This is temporary — once we confirm push works, we remove the toasts

---

### Issue 2: Screen Locks During Voice Recording

When recording a voice note, iOS auto-locks the screen after the idle timeout. The WebView/Capacitor app doesn't hold a wake lock, so:
1. Screen locks mid-recording
2. The app may be suspended, killing the MediaRecorder
3. Transcription fails because the recording is incomplete or the network request is interrupted

**Fix**: Use the **Screen Wake Lock API** (`navigator.wakeLock`) to keep the screen awake while recording. This is supported in WKWebView on iOS 16.4+. Acquire the lock when recording starts, release it when recording stops.

#### Plan:
**File: `src/components/VoiceRecorder.tsx`**
- In `startRecording()`: acquire a wake lock via `navigator.wakeLock.request('screen')` and store it in a ref
- In `stopRecording()` and `cleanup()`: release the wake lock
- Wrap in try/catch since the API may not be available on all platforms

---

### Summary of changes

| File | Change |
|------|--------|
| `src/hooks/usePushNotifications.ts` | Add temporary diagnostic toasts at each registration step |
| `src/components/VoiceRecorder.tsx` | Acquire/release Screen Wake Lock during recording to prevent auto-lock |

