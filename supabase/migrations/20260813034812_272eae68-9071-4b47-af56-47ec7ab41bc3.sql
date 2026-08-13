CREATE TABLE public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  blurb text,
  note_ids uuid[] NOT NULL DEFAULT '{}',
  quotes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  merged_into uuid REFERENCES public.threads(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own threads"
ON public.threads FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX threads_user_status_idx ON public.threads (user_id, status, last_seen_at DESC);

CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();