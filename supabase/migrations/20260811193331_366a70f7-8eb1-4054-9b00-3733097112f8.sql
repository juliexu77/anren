ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'voice',
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS notes_user_live_idx ON public.notes (user_id, recorded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS projects_user_live_idx ON public.projects (user_id, position) WHERE deleted_at IS NULL;