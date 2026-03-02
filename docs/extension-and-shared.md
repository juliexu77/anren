# Extension + shared (Option A)

The Chrome extension lives in **extension/** and shares backend + types with the web app via **shared/**.

## Layout

- **shared/** — Types and API used by both web app and extension.
  - `shared/types/card.ts` — `BrainCard`, `ItemType`, `ItemStatus`, `CardSource`, `mapStatus`, `mapType`.
  - `shared/api/createSupabase.ts` — `createSupabaseClient(url, anonKey)` for Supabase.
  - `shared/index.ts` — Re-exports.
- **extension/** — Chrome extension (Manifest V3). Popup, background, content script; build with Vite from `extension/`.
- **src/** — Web app. Card types re-exported from shared in `src/types/card.ts` so existing `@/types/card` imports stay valid.

## Build

- Web app: `npm run build` (unchanged).
- Extension: `npm run build:extension` (runs `cd extension && npm run build`). Output: **extension/dist/** — load unpacked in Chrome from that folder.

## Syncing

- **Types / API:** Edit only in **shared/**; web app and extension both use it.
- **Backend (Supabase, edge functions):** Same project and env for both; no separate sync step.
- **Extension code:** Replace the placeholder popup/background/content in **extension/src/** with your real extension logic; keep importing from `shared`.
