# Supabase setup for Anren

So that **Hold this** saves items and they show up in **Resting here**, your Supabase project needs the right table and policies.

## 1. Table `intake_items`

Minimal schema the extension expects:

| Column      | Type    | Nullable | Notes |
|------------|--------|----------|--------|
| `id`       | `uuid`  | NOT NULL | Default: `gen_random_uuid()` or `uuid_generate_v4()` |
| `user_id`  | `text`  | NOT NULL | We use `VITE_DEV_USER_ID` for now |
| `raw_text` | `text`  | NOT NULL | The captured text |
| `source`   | `text`  | NOT NULL | We send `chrome_side_panel` |
| `created_at` | `timestamptz` | NULL | Optional; default `now()` |

Optional (for “tiny source” in Resting here):

- `source_url`  — `text` NULL  
- `source_title` — `text` NULL  

**SQL (minimal):**

```sql
create table if not exists public.intake_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  raw_text text not null,
  source text not null default 'chrome_side_panel',
  created_at timestamptz default now()
);

-- Optional columns (run if you want source URL/title stored):
-- alter table public.intake_items add column if not exists source_url text;
-- alter table public.intake_items add column if not exists source_title text;
```

## 2. Row Level Security (RLS)

If RLS is enabled on `intake_items`, the anon key must be allowed to insert and select.

Example (allow anon to do everything for this table; tighten later with auth):

```sql
alter table public.intake_items enable row level security;

create policy "Allow anon insert"
  on public.intake_items for insert
  to anon with check (true);

create policy "Allow anon select"
  on public.intake_items for select
  to anon using (true);
```

If you use a fixed `user_id` (e.g. from `VITE_DEV_USER_ID`), you can restrict by `user_id` once you have a stable way to pass it (e.g. JWT or custom header).

## 3. Env and build

In the extension repo:

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project (Settings → API).  
   For the shared backend, URL is `https://skbktztzbkdgkkguzltv.supabase.co`; anon key is in the project dashboard.
3. Set `VITE_DEV_USER_ID` to any string (e.g. `dev-user-1`). Only used if you are **not** using Supabase Auth; with Auth, RLS uses `auth.uid()` (see `docs/BACKEND_CONNECTION.md`).
4. Run `npm run build` and reload the extension from `dist/`.

If save still fails, open the side panel, open DevTools (right‑click panel → Inspect), and check the Console for `[Anren]` errors (e.g. “failed to create intake item” with the Supabase error message).
