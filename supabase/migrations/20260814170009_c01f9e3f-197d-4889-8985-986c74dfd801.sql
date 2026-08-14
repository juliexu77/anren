ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS transcribed_parts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transcribe_lock_at timestamptz;