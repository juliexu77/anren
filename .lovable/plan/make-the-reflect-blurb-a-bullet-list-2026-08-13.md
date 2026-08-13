# Make the Reflect blurb a bullet list

Replace the collapsible prose "Read this week back" paragraph with 3-4 crisp observation bullets.

## Why
The current 2-4 sentence narrative often reads like a mini-essay. Discrete bullets are easier to scan, feel more like someone pointing things out, and let the prose live in the existing `movements` and `tension` sections instead of competing with them.

## What to change

### 1. Data model
- Add `bullets jsonb` to `public.weekly_digests`.
- Keep `narrative` for now; stop writing to it and stop reading it.
- `ask-notes` currently selects `narrative` but never uses it; remove it from that select to avoid stale data.
- Regenerate `src/integrations/supabase/types.ts` after the migration.

### 2. Weekly digest edge function
- Update `supabase/functions/weekly-digest/index.ts` prompt to return:
  ```json
  {
    "movements": [...],
    "tension": "...",
    "bullets": ["short observation 1", "short observation 2", ...],
    "themes": [...]
  }
  ```
- Replace the `narrative` field instructions with `bullets` instructions: 3-4 short sentences, each a complete noticing, no headings, no metrics.
- Store `parsed.bullets` in the new column.

### 3. Frontend types and hook
- In `src/hooks/useLookBack.ts`, change the `LookBack` interface:
  - remove `narrative: string`
  - add `bullets: string[]`
- Map `data.bullets` from the JSONB column.

### 4. Reflect page UI
- In `src/pages/Reflect.tsx`, replace the `digest.narrative` paragraph with a `<ul>` of bullets.
- Keep the existing "What moved" and "Pulling against each other" sections as-is.
- Keep the "Read it again" refresh action below the bullets.
- The "Read this week back" collapsible can stay as the container, or the bullets can be surfaced directly; the replacement is the core change.

### 5. Migration
- Create a single Supabase migration that adds `bullets jsonb` and includes required `GRANT` statements on `weekly_digests` if any are missing.
- Existing rows will naturally fill in on next auto-regeneration (legacy detection already rewrites old digests).

## Out of scope
- No changes to `movements`, `tension`, or `themes` shape.
- No change to the Threads or AskNotes flows beyond removing the unused `narrative` select.
- No column drop for `narrative` yet; we can remove it once the new bullets have proven stable.