## Project: Anren Chrome Extension

### High-level overview

This repo contains a **Chrome Manifest V3 extension** that surfaces the Anren experience as:

- A **React + TypeScript + Vite** app (Anren panel UI)
- Injected into **Google Calendar** as a **right-hand “rail” drawer** (Clearbit-style)
- Backed by **Supabase** (same project as the main Anren app), though the extension is currently safe even if Supabase is not configured.

The intent: be a gentle companion next to your calendar so “the mental load rests” — showing today/this-week tasks and providing a calm natural-language intake box.

---

### Key entry points

- `public/manifest.json`
  - MV3 manifest.
  - Important bits:
    - `content_scripts` inject `calendar-inject.js` on `https://calendar.google.com/*`.
    - `web_accessible_resources` expose `side-panel.html` and built assets to the content script.
    - **Side panel support is disabled**: no `side_panel` root block and no `sidePanel` permission.

- `public/calendar-inject.js`
  - Plain JS **content script**.
  - Runs on Google Calendar and creates:
    - A root container `#anren-calendar-drawer-root` positioned against the right edge of the main calendar area.
    - A sliding panel (`#anren-calendar-drawer-panel`) containing:
      - An `iframe` pointing at `chrome.runtime.getURL("side-panel.html")`.
      - A vertical “Anren” handle button that toggles open/closed state.
  - Uses `chrome.storage.sync` under key `anrenDrawerOpen` to remember open/closed state across page loads.
  - Anchors inside `div[role="main"]` when available to avoid covering Google’s own right-hand rails; falls back to `document.body`.

- `side-panel.html`
  - HTML shell that mounts the React app.
  - Script entry: `/src/main.tsx` (bundled by Vite).

- `src/main.tsx`
  - Standard React + `createRoot` entry that renders `<App />` into `#root`.

- `src/App.tsx`
  - Main panel UI.
  - Responsibilities:
    - Fetch “today” and “this week” tasks (using Supabase when configured; falls back to gentle mock tasks otherwise).
    - Render Anren’s warm, calm “Stone & Tea” themed task lists plus intake area.
    - Provide a natural-language capture form that:
      - Calls an intake/AI stub (`callIntakeApi` in earlier iterations).
      - Creates Supabase tasks when Supabase is configured, or inserts a fallback intake row.
    - Copies and behavior are tuned for **gentle, non-urgent language**.

- `src/shared/*`
  - `supabaseClient.ts`: creates a Supabase client and helpers to read/write tasks & intake items.
    - Uses environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEV_USER_ID`, `VITE_INTAKE_API_URL`.
    - Includes a `hasSupabaseConfig()` guard so the UI can operate with mock data if env vars are missing.
  - `config.ts`: dev user ID helper (`getCurrentUserId()`).
  - `intakeApi.ts`: timeout-wrapped fetch helper for the intake/AI endpoint.
  - `sidePanelUtil.ts`: testable utility for defensive `chrome.sidePanel` opening (currently unused now that side panel support is disabled, but kept for reference).

- `public/background.js`
  - Previously wired the **Chrome native side panel** via `chrome.sidePanel.open/setOptions` and `chrome.action.onClicked`.
  - With side panel support disabled in `manifest.json` (no `side_panel`, no `sidePanel` permission), this file is effectively unused and safe to ignore or delete in future cleanups.

---

### Chrome behavior (current)

- **Injected drawer (preferred UX)**
  - On `https://calendar.google.com/*`:
    - `calendar-inject.js` runs at `document_idle`.
    - It injects a right-hand drawer + handle inside the main calendar DOM.
    - The drawer loads the React Anren panel via an iframe pointed at `side-panel.html`.
  - Open/close:
    - Default: opens automatically unless user previously closed it.
    - Clicking the “Anren” handle toggles the drawer and persists the state in `chrome.storage.sync`.

- **Native Chrome Side Panel**
  - **Disabled**:
    - No `side_panel` config in `manifest.json`.
    - No `sidePanel` permission.
  - The extension’s toolbar icon (“A”) no longer controls a native side panel; the UX is fully content-script–driven now.

---

### Supabase integration

- Uses `@supabase/supabase-js` v2.
- Env variables (in `.env` / `.env.example`), all `VITE_`-prefixed for Vite:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_DEV_USER_ID` (single-user dev assumption; e.g. `"julie-dev"`)
  - `VITE_INTAKE_API_URL` (AI intake endpoint, can be empty for now)
- Data model assumptions:
  - `tasks` table:
    - `id`, `user_id`, `title`, `notes`, `scope` (`today` / `week`), `status`, `due_at`, etc.
  - `intake_items` table:
    - `id`, `user_id`, `raw_text`, `source` (`chrome_side_panel`), timestamps.
- Behavior:
  - On load:
    - If Supabase is configured, fetch “today” and “this week” tasks for the current user.
    - If not configured, show warm, hard-coded gentle example tasks.
  - On intake submit:
    - Attempt to call the intake API and create parsed tasks.
    - Fallback: write an intake row so the text is not lost even if AI is unavailable.

---

### Styling & UX notes

- Global “Stone & Tea” theme lives in `src/index.css` (and mirrors the main Anren app):
  - Core CSS variables: background, surface, text, accent colors, etc.
  - Fonts: generally Inter (sans) + a serif for headings where needed.
- `src/App.css`:
  - Lays out the panel:
    - Header with Anren title and tagline.
    - Two sections: “Today” and “This week”.
    - Gentle, card-based task layout with chips and subtle status pills.
    - Intake form at the bottom with reassuring copy and status messages.
  - Avoids harsh colors, uses soft shadows and rounded shapes.

---

### Development workflow

- **Install deps**:
  - `npm install`

- **Run in dev (for UI iteration, not the extension build)**:
  - `npm run dev`

- **Build extension**:
  - `npm run build`
  - This runs TypeScript (`tsc`) and Vite build, emitting a production bundle (including `side-panel.html` and assets).

- **Load into Chrome**:
  1) Run `npm run build`.
  2) Go to `chrome://extensions`.
  3) Enable “Developer mode”.
  4) “Load unpacked” → select the built output directory (e.g. `dist`).
  5) Ensure “Anren Side Panel” is enabled.

- **Verify injection**:
  - Navigate to `https://calendar.google.com/`.
  - You should see a slim “Anren” handle on the right side of the main calendar grid.
  - Clicking it should slide the Anren panel in/out.

---

### Gotchas & debugging tips

- If the injected drawer disappears:
  - Confirm you’re on `https://calendar.google.com/*` (content script does **not** run on Gmail right now).
  - Check `chrome://extensions` → the extension is enabled and updated (reload after builds).
  - Open DevTools on the Calendar tab and check the **Console**:
    - Look for errors mentioning `calendar-inject.js` or `side-panel.html`.
  - Use the DevTools Elements panel to search for `#anren-calendar-drawer-root`.

- If Supabase is not configured or network is offline:
  - The UI should still render, using the gentle mock tasks and safe fallbacks.
  - Intake still updates the visual list; Supabase writes simply no-op instead of crashing the UI.

- Side panel vs injected drawer:
  - **Current behavior**: only the injected drawer is active; native Chrome Side Panel APIs are intentionally not used.
  - The `background.js` file and `sidePanel` utilities are legacy from the earlier side-panel implementation and can be deleted later if desired.

