# Anren extension ↔ backend connection

Summary of **what the extension does** and **how it talks to your Supabase backend**.

---

## What the extension does

1. **Side panel on Gmail & Calendar**  
   User opens the Anren icon next to the address bar; a side panel opens (no injected UI).

2. **Intake (capture)**  
   - **Preview:** Shows selection from the page, or page title + URL, when they opened the panel from a tab.  
   - **Optional note:** One “Add a note…” field.  
   - **Hold this:** Saves the combined content (preview + note) and optionally records `source_url` / `source_title`.

3. **Resting here**  
   List of held items (most recent first). Each row: title (from first line of content), tiny source (Gmail / Calendar / domain), optional calendar icon (coming soon), relative time.

4. **Guidance (first run / empty)**  
   Short onboarding card (Tribe-style) that explains: notice something → capture it → Hold this → it lands in Resting here.

5. **Optional intake API**  
   Before saving raw text, the extension can POST to an external **intake API** (`VITE_INTAKE_API_URL`). If that API returns structured **tasks**, we insert them into Supabase `tasks`; in all cases we also persist the raw capture in `intake_items` so it always appears in Resting here.

So in one sentence: **the extension captures “mental load” from Gmail/Calendar into a Resting here list and optionally turns it into tasks, using your Supabase (and optionally an edge/API) backend.**

---

## How the extension uses the backend

### Supabase client

- **Package:** `@supabase/supabase-js` (already in the project).  
- **Config:**  
  - **URL:** `https://skbktztzbkdgkkguzltv.supabase.co`  
  - **Anon key:** Your project’s anon (public) key.  
- **Where it’s set:** In the extension, these are read from **build-time** env vars so they get inlined into the bundle:  
  - `VITE_SUPABASE_URL`  
  - `VITE_SUPABASE_ANON_KEY`  
- **Where to put them:** In a `.env` file in the repo root (see `.env.example`). Then run `npm run build` and load the extension from `dist/`. The extension does **not** read `.env` at runtime in the browser; it only uses whatever was inlined at build time.

### Tables the extension uses

| Table           | Use |
|-----------------|-----|
| **`intake_items`** | **Primary.** Insert on “Hold this” (raw_text, source, optional source_url/source_title). Select to show “Resting here” (recent items, by user). |
| **`tasks`**       | **Optional.** Insert when the intake API returns tasks; select for “Today” / “This week” if we re-enable those sections. |

So the extension expects the **same** backend (same Supabase project) as your web app: same URL, same anon key, same tables. RLS and auth decide who can see what.

### Auth and RLS

- **Your backend:** RLS is tied to `auth.uid()`. So the extension must **authenticate** (have a real Supabase session) for RLS to allow access.
- **Current extension code:** Uses a fixed **dev user id** (`VITE_DEV_USER_ID`) and does **not** call `supabase.auth` (no login, no session). With RLS that checks `auth.uid()`, inserts/selects will be **denied** until the extension has a logged-in user.
- **Intended interaction:**  
  1. **Option A (recommended for production):** Extension signs in with Supabase Auth (e.g. `signInWithOAuth('google')` or session shared from your web app). Then all Supabase client calls use that session; RLS automatically scopes data to `auth.uid()`.  
  2. **Option B (dev only):** Temporarily add an RLS policy that allows anon or a fixed `user_id` for development (see `docs/SUPABASE_SETUP.md`). Not for production.

So: **to connect this extension to the same backend and have saves/reads work with your current RLS, the extension needs to authenticate users (e.g. Supabase Auth) so that `auth.uid()` is set.**

### Edge functions

- **Base URL:** `https://skbktztzbkdgkkguzltv.supabase.co/functions/v1/`  
- **How the extension would call them:** HTTP requests to the appropriate function URL, with the user’s Supabase session token in the **`Authorization: Bearer <access_token>`** header (from `supabase.auth.getSession()` after the user is signed in).  
- **Current use:** The extension’s optional “intake API” is configured via `VITE_INTAKE_API_URL` and can point at an edge function or any other service; that API is called with the same conceptual user identity you use for Supabase (today: dev user id; with auth: the same user as `auth.uid()`).

---

## Summary table

| Concern            | Extension behavior | Backend expectation |
|--------------------|--------------------|----------------------|
| **Supabase URL**   | From `VITE_SUPABASE_URL` at build time | Same project as web app: `https://skbktztzbkdgkkguzltv.supabase.co` |
| **Anon key**       | From `VITE_SUPABASE_ANON_KEY` at build time | Same anon key; safe in client/extension |
| **Auth**           | Currently none (dev user id only) | RLS uses `auth.uid()` → extension should add Supabase Auth (e.g. OAuth) |
| **Tables**         | Read/write `intake_items`; optional read/write `tasks` | Same schema and RLS as rest of app |
| **Edge functions** | Optional; call with `Authorization: Bearer <access_token>` | Same project; user token from Supabase Auth |

---

## Next steps

1. **Env:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (use the URL and anon key from your project), then `npm run build` and reload the extension.  
2. **Auth:** Add Supabase Auth in the extension (e.g. Google OAuth or reuse web app session) so RLS sees `auth.uid()`.  
3. **RLS:** Keep existing RLS on `intake_items` (and `tasks`) tied to `auth.uid()`; no need to “sync” the database for auth—only ensure the extension sends a valid session.  
4. **Edge functions:** When calling them, pass the Supabase `access_token` in the `Authorization` header.

See `docs/SUPABASE_SETUP.md` for table schema and example RLS if you add or change policies.
