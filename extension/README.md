# ANREN Chrome Extension

Lives in this repo next to the web app. Shares the same backend (Supabase) and **shared/** types/API.

## Structure

- **shared/** (repo root) — `BrainCard` types, `createSupabaseClient(url, anonKey)`. Import from `shared` in popup/background/content.
- **src/popup.*** — Popup UI (replace with your implementation).
- **src/background.ts** — Service worker (replace with your logic).
- **src/content.ts** — Content script (replace with your logic).
- **manifest.json** — Chrome Manifest V3.

## Build

From repo root:

```bash
cd extension && npm install && npm run build
```

Or from root package.json: `npm run build:extension`

Output: **extension/dist/** — load this folder in Chrome as “Load unpacked”.

## Using shared code

In popup/background/content:

```ts
import { createSupabaseClient, type BrainCard } from "shared";
// Get url/anonKey from chrome.storage or options page, then:
const supabase = createSupabaseClient(url, anonKey);
```

## Replacing with your extension

If you had a separate extension repo, copy your real popup/background/content and options UI here, then:

1. Keep using `shared` for types and `createSupabaseClient`.
2. Ensure extension/build outputs to `extension/dist` and manifest paths match.
3. Add any extra permissions in `manifest.json`.
