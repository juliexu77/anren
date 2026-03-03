
-- Daily brief settings per user
CREATE TABLE public.daily_brief_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  delivery_time time NOT NULL DEFAULT '07:00:00',
  timezone text NOT NULL DEFAULT 'America/New_York',
  calendars text[] NOT NULL DEFAULT ARRAY['primary'],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_brief_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brief settings"
  ON public.daily_brief_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brief settings"
  ON public.daily_brief_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brief settings"
  ON public.daily_brief_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_brief_settings_updated_at
  BEFORE UPDATE ON public.daily_brief_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Track daily dismissals
CREATE TABLE public.daily_brief_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dismissed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dismissed_date)
);

ALTER TABLE public.daily_brief_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissals"
  ON public.daily_brief_dismissals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissals"
  ON public.daily_brief_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);
