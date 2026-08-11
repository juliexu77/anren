-- Usage metering for the house Claude key
CREATE TABLE public.ai_usage (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  used_count INTEGER NOT NULL DEFAULT 0,
  micro_cents_used BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own usage"
  ON public.ai_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_ai_usage_updated_at
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Encrypted per-user Anthropic keys. Never readable from the client.
CREATE TABLE public.user_ai_keys (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.user_ai_keys TO service_role;

ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_user_ai_keys_updated_at
  BEFORE UPDATE ON public.user_ai_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The client may only ask whether a key exists, never read it.
CREATE OR REPLACE FUNCTION public.has_own_ai_key()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_ai_keys WHERE user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_own_ai_key() TO authenticated;

-- Owner accounts that never draw down the free allowance.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_exempt BOOLEAN NOT NULL DEFAULT false;