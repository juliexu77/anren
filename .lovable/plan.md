

## Extension Onboarding Plan

### Key insight
The extension's onboarding is different from the app's because the extension *already has context* — it lives inside the browser where the user is working. Step 2 ("What's on your mind?") should leverage that: instead of a blank textarea, the extension can pre-fill with whatever the user has selected or is viewing on the page. The extension's superpower is capturing what's already in front of you.

### Extension onboarding flow (4 steps)

```text
┌──────────────────────────────────────────────┐
│  1. WELCOME                                  │
│     "ANREN — Where the mental load rests."   │
│     "A quiet place for everything            │
│      you're carrying."                       │
│     [Begin]                                  │
│     Already have an account? Sign in         │
│     ▪ Progress: ████░░░░░░░░ 1/4             │
├──────────────────────────────────────────────┤
│  2. CONTEXTUAL CAPTURE                       │
│     If page context was captured:            │
│       Shows selected text / page title       │
│       "Something caught your eye.            │
│        Add a thought, or just hold it."      │
│     If no context:                           │
│       "What's one thing on your mind?"       │
│       Plain textarea                         │
│     Saves to localStorage (pre-auth)         │
│     [Hold this for me]  [Skip]               │
│     ▪ Progress: ████████░░░░ 2/4             │
├──────────────────────────────────────────────┤
│  3. VALUE BRIDGE + AUTH                      │
│     Shows count of held items                │
│     "Now let's make sure these are yours."   │
│     "Sign in so Anren can hold things        │
│      across your devices."                   │
│     [Sign in with Google]                    │
│     ▪ Progress: █████████░░░ 3/4             │
├──────────────────────────────────────────────┤
│  4. CALENDAR PREFS                           │
│     Same as app step 5: calendar checkboxes  │
│     + birthday toggle                        │
│     [I'm ready]                              │
│     ▪ Progress: ████████████ 4/4             │
├──────────────────────────────────────────────┤
│  → Capture UI (existing extension App)       │
└──────────────────────────────────────────────┘
```

No visual-capture step (step 3 from web app) — the extension captures web content, not photos. That step doesn't make sense in a side panel.

### "Already have an account?" (both web + extension)

On step 1, a subtle link triggers Google sign-in immediately. After auth:
- Check `profiles.onboarding_completed`
- If `true` → skip to capture UI (extension) or home (web app)
- If `false` → jump to calendar prefs step

### Technical changes

**Extension files:**

1. **`extension/src/App.tsx`** — Wrap in an onboarding gate. New state: `onboardingStep` persisted in `chrome.storage.local`. If `onboardingStep < 5` (not complete), render the onboarding steps instead of the capture UI. After step 4 completes, set `onboardingStep = 5` and show capture UI.

2. **`extension/src/shared/supabaseClient.ts`** — Change `persistSession: false` to `persistSession: true` with `chrome.storage.local` as the storage adapter so sessions survive panel close/reopen. Add a `signInWithGoogle()` function that uses `supabase.auth.signInWithOAuth({ provider: 'google' })` — this opens a new tab for Google consent, and the existing `onAuthStateChange` picks up the session.

3. **`extension/src/shared/config.ts`** — Replace hardcoded dev user ID. `getCurrentUserId()` reads from the Supabase session (`getClient()?.auth.getUser()`). Falls back to dev ID only if no session.

4. **`extension/public/background.js`** — No changes needed. Context capture already works and feeds into step 2.

**Web app files:**

5. **`src/pages/Onboarding.tsx`** — Add "Already have an account? Sign in" link on step 1. After successful auth, check `profiles.onboarding_completed`:
   - If `true`: `navigate("/")`
   - If `false`: jump to step 5 (calendar prefs)

### Extension auth approach

Chrome extensions can't do OAuth redirects back to themselves easily. The approach:
- `supabase.auth.signInWithOAuth()` opens Google consent in a new browser tab
- The redirect URL points to the web app's existing `/~oauth/callback` or `/google-callback`
- The web app callback sets the Supabase session cookie
- The extension's Supabase client with `persistSession: true` + a `chrome.storage.local` storage adapter picks up the session via `onAuthStateChange`
- Alternative simpler approach: after Google consent completes in the tab, the extension polls `supabase.auth.getSession()` until it finds one

### Extension local storage for pre-auth cards

Same pattern as web app but using `chrome.storage.local` instead of `localStorage` (more reliable in extension context, persists across panel open/close):
- Key: `anren_local_cards`
- On auth completion: bulk-insert to `cards` table, clear local storage

### Summary of files

| File | Action |
|------|--------|
| `extension/src/App.tsx` | Major rewrite: onboarding gate + 4-step flow |
| `extension/src/shared/supabaseClient.ts` | Persist session, add `signInWithGoogle()` |
| `extension/src/shared/config.ts` | Dynamic user ID from session |
| `src/pages/Onboarding.tsx` | Add "Already have an account?" link on step 1 |

