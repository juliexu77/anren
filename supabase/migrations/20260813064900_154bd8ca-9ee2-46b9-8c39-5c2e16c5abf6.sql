ALTER TABLE public.weekly_digests
  ADD COLUMN IF NOT EXISTS tension text,
  ADD COLUMN IF NOT EXISTS movements jsonb NOT NULL DEFAULT '[]'::jsonb;