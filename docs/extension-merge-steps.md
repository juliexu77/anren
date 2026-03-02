# Step-by-step: Merge anren-chrome-extension into this repo

Use this to bring the code from [juliexu77/anren-chrome-extension](https://github.com/juliexu77/anren-chrome-extension) into the `extension/` folder so it shares the same backend and **shared/** types.

---

## Step 1 — Get the extension code

**Option A: Clone with git (recommended)**

In a terminal, from your **home** or **Desktop** (not inside the anren repo):

```bash
git clone https://github.com/juliexu77/anren-chrome-extension.git
```

This creates a folder `anren-chrome-extension` with the full repo.

**Option B: Download ZIP**

1. Open https://github.com/juliexu77/anren-chrome-extension
2. Click the green **Code** button → **Download ZIP**
3. Unzip somewhere (e.g. Desktop) so you have a folder like `anren-chrome-extension-main`

---

## Step 2 — Copy the extension into this repo

From the **anren** repo root (the folder that contains `extension/`, `src/`, `shared/`):

**If you used Option A (clone):**

```bash
# Replace /path/to with where you cloned (e.g. ~/Desktop)
cp -R /path/to/anren-chrome-extension/* extension/
cp -R /path/to/anren-chrome-extension/.* extension/ 2>/dev/null || true
```

**If you used Option B (ZIP):**

```bash
cp -R /path/to/anren-chrome-extension-main/* extension/
```

This overwrites the current placeholder files in `extension/` with the real extension (React side panel, `public/`, `src/`, `side-panel.html`, their `vite.config.ts`, `package.json`, etc.).

---

## Step 3 — Restore wiring for shared and build

After the copy, we need to:

1. **Merge manifest** — Keep their `side_panel`, `action`, `icons`, and add Supabase host permission so the extension can call your backend.
2. **Point extension to repo `shared/`** — So it uses the same types and `createSupabaseClient` as the web app.
3. **Adjust Vite config** — So the build outputs to `extension/dist` and the manifest is valid for Chrome.

I can do Step 3 for you in the repo (update `extension/vite.config.ts`, `extension/manifest.json`, and `extension/package.json` after you’ve done Steps 1–2). Tell me when the copy is done, or run the copy commands above and then say “done” and I’ll apply the wiring.

---

## Step 4 — Install deps and build

From the **anren** repo root:

```bash
cd extension && npm install && npm run build
```

Or from root: `npm run build:extension`

Then in Chrome: **Extensions** → **Load unpacked** → choose the **`extension/dist`** folder inside the anren repo.

---

## Step 5 — Point extension at shared (optional but recommended)

In the extension code (e.g. wherever it creates a Supabase client or uses card types), replace any local Supabase/type setup with:

```ts
import { createSupabaseClient, type BrainCard } from "shared";
```

Get Supabase URL and anon key from `chrome.storage` or your options page, then:

```ts
const supabase = createSupabaseClient(url, anonKey);
```

You can do Step 5 after the extension loads and works; the build wiring in Step 3 will already resolve the `shared` alias.

---

## Summary

| Step | What you do |
|------|-------------|
| 1 | Clone or download [anren-chrome-extension](https://github.com/juliexu77/anren-chrome-extension) |
| 2 | Copy its contents into **anren/extension/** (overwrite placeholders) |
| 3 | I update extension `vite.config.ts`, `manifest.json`, `package.json` for shared + Supabase + correct build output |
| 4 | Run `npm run build:extension` and load **extension/dist** in Chrome |
| 5 | (Optional) Replace local types/Supabase in extension with `shared` imports |

You don’t “upload” the folder anywhere special — the extension lives inside the anren repo in **extension/**, and you load the **built** folder **extension/dist** in Chrome as “Load unpacked”.
