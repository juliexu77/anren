
-- Weekly synthesis table to store AI-generated weekly reports
CREATE TABLE public.weekly_syntheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  narrative text NOT NULL DEFAULT '',
  domains jsonb NOT NULL DEFAULT '[]'::jsonb,
  stale_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cards_analyzed integer NOT NULL DEFAULT 0,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique per user per week
CREATE UNIQUE INDEX idx_weekly_syntheses_user_week ON public.weekly_syntheses (user_id, week_start);

-- RLS
ALTER TABLE public.weekly_syntheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own syntheses"
  ON public.weekly_syntheses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own syntheses"
  ON public.weekly_syntheses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts via edge function, so no INSERT policy needed for users
