

## Daily Reflection Feature — "Quiet Mirror"

A multi-part feature adding voice-based daily reflections, a history page, weekly texture digests, and monthly insights — all matching Anren's warm, understated aesthetic.

---

### 1. Database: `reflections` and `reflection_summaries` tables

**Migration:**

```sql
CREATE TABLE public.reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reflection_date date NOT NULL DEFAULT CURRENT_DATE,
  raw_transcript text NOT NULL DEFAULT '',
  texture text NOT NULL DEFAULT '',
  texture_why text NOT NULL DEFAULT '',
  what_this_reveals text NOT NULL DEFAULT '',
  energy_givers text[] NOT NULL DEFAULT '{}',
  energy_drainers text[] NOT NULL DEFAULT '{}',
  unresolved_threads text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reflections" ON public.reflections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reflections" ON public.reflections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reflections" ON public.reflections FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reflection_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_type text NOT NULL DEFAULT 'weekly',  -- 'weekly' or 'monthly'
  period_start date NOT NULL,
  texture text NOT NULL DEFAULT '',
  what_created_it text NOT NULL DEFAULT '',
  recurring_patterns text NOT NULL DEFAULT '',
  unresolved_threads text NOT NULL DEFAULT '',
  what_this_reveals text NOT NULL DEFAULT '',
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reflection_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries" ON public.reflection_summaries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON public.reflection_summaries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
```

---

### 2. Modify BrainDumpSheet — Mode Selector

**File: `src/components/BrainDumpSheet.tsx`**

- Add a new `mode` state: `"organize" | "reflect"`, defaulting to `null` (selection screen).
- Before recording starts, show a mode-selection phase with two buttons:
  - **"Get organized"** → existing brain dump flow
  - **"How am I doing"** → reflection flow
- Update the header label: "Speak freely" becomes "Clear your mind" in organize mode, "How am I doing" in reflect mode.
- In reflection mode, after transcription completes, call a new `process-reflection` edge function instead of `process-brain-dump`. Show a "Reflecting…" processing state, then display the structured reflection result (texture, why, what this reveals, etc.) in a review screen styled like a quiet card. Confirm saves to `reflections` table.

---

### 3. Edge Function: `process-reflection`

**File: `supabase/functions/process-reflection/index.ts`**

- Receives `{ transcript: string }`.
- Calls Lovable AI (Gemini Flash) with tool calling to extract structured output:
  - `texture` (2–4 word qualitative phrase)
  - `texture_why` (2–3 sentences)
  - `what_this_reveals` (1 sentence)
  - `energy_givers` (string array)
  - `energy_drainers` (string array)
  - `unresolved_threads` (string array)
  - `summary` (brief summary)
- Returns the structured result. The client saves to Supabase directly.

---

### 4. Edge Function: `generate-reflection-digest`

**File: `supabase/functions/generate-reflection-digest/index.ts`**

- Receives `{ userId, periodType: "weekly" | "monthly" }`.
- Fetches all reflections from the past 7 or 30 days.
- Sends all raw transcripts as a single document to AI.
- Extracts: overall texture, what created it, recurring patterns, unresolved threads, what this period reveals.
- Inserts into `reflection_summaries`.

---

### 5. Reflections History Page — "My Patterns"

**File: `src/pages/Patterns.tsx`**

- Scrollable log of past reflections: date, texture phrase, one-line why.
- Tapping an entry expands inline to show full extraction (what this reveals, energy givers/drainers, unresolved threads).
- Matches Anren aesthetic: sanctuary-card styling, warm tones, serif headings.

**File: `src/hooks/useReflections.ts`**

- Hook to fetch reflections from Supabase, ordered by date desc.

**Route:** Add `/patterns` to `App.tsx` as a protected route.

**Home link:** Add a subtle "My patterns →" text link on HomeView, below the resting section.

---

### 6. Weekly Texture Card on Home

**File: `src/components/HomeView.tsx`**

- Add a `useReflectionDigest` hook that checks for an undismissed weekly summary (period_type='weekly', period_start = last Monday, dismissed = false).
- If found and it's Monday+, render a dismissible card above "Resting here" titled "The texture of your week" showing the overall texture and a tap-to-expand full view.
- Dismissing updates `dismissed = true` on the summary row.

**File: `src/hooks/useReflectionDigest.ts`**

- Fetches the latest undismissed weekly/monthly summary.

---

### 7. Weekly + Monthly Cron Trigger

- Use `pg_cron` + `pg_net` to invoke `generate-reflection-digest` every Monday at 6am (weekly) and the 1st of each month (monthly) for users who have reflections.
- Alternatively, generate on-demand: when the home screen loads on Monday and no weekly digest exists yet for that week, trigger generation.

**Recommended approach:** On-demand generation from the client (simpler, no cron setup). The `useReflectionDigest` hook checks if a digest exists for the current period; if not, it calls the edge function to generate one.

---

### Summary of Files

| Action | File |
|--------|------|
| Create | `supabase/functions/process-reflection/index.ts` |
| Create | `supabase/functions/generate-reflection-digest/index.ts` |
| Create | `src/pages/Patterns.tsx` |
| Create | `src/hooks/useReflections.ts` |
| Create | `src/hooks/useReflectionDigest.ts` |
| Modify | `src/components/BrainDumpSheet.tsx` (mode selector + reflection flow) |
| Modify | `src/components/HomeView.tsx` (weekly texture card + "My patterns" link) |
| Modify | `src/App.tsx` (add /patterns route) |
| Modify | `supabase/config.toml` (new function entries) |
| Migration | Create `reflections` and `reflection_summaries` tables with RLS |

