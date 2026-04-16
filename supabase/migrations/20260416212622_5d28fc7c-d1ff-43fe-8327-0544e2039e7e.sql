-- User connections: one row per (user, provider). Tokens stored server-side only.
CREATE TABLE public.user_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX idx_user_connections_user ON public.user_connections(user_id);
CREATE INDEX idx_user_connections_active ON public.user_connections(status) WHERE status = 'active';

ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Users can see status/metadata of their own connections (we'll select non-token columns from client)
CREATE POLICY "Users can view own connections"
  ON public.user_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON public.user_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON public.user_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON public.user_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_connections_updated_at
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Health signals: provider-agnostic store for sleep, recovery, workouts, calendar events, etc.
CREATE TABLE public.health_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  external_id TEXT,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, signal_type, external_id)
);

CREATE INDEX idx_health_signals_user_recent
  ON public.health_signals(user_id, recorded_at DESC);
CREATE INDEX idx_health_signals_user_type_recent
  ON public.health_signals(user_id, signal_type, recorded_at DESC);

ALTER TABLE public.health_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own signals"
  ON public.health_signals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signals"
  ON public.health_signals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts/updates happen via service role from sync edge functions; no client policies needed.
