ALTER TABLE public.weekly_digests
ADD COLUMN IF NOT EXISTS bullets jsonb NOT NULL DEFAULT '[]'::jsonb;