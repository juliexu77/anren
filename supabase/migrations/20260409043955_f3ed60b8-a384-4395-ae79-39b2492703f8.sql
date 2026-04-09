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
  period_type text NOT NULL DEFAULT 'weekly',
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
CREATE POLICY "Users can insert own summaries" ON public.reflection_summaries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON public.reflection_summaries FOR UPDATE TO authenticated USING (auth.uid() = user_id);