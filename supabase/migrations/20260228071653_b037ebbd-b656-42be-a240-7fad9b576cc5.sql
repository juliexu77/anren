
ALTER TABLE public.cards 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'inbox',
  ADD COLUMN IF NOT EXISTS routed_type text,
  ADD COLUMN IF NOT EXISTS due_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS google_event_id text;
