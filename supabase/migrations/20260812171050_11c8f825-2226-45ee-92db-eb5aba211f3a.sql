CREATE TABLE public.project_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'new',
  name TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  note_ids UUID[] NOT NULL DEFAULT '{}',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_suggestions TO authenticated;
GRANT ALL ON public.project_suggestions TO service_role;

ALTER TABLE public.project_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project suggestions"
ON public.project_suggestions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX project_suggestions_user_status_idx
ON public.project_suggestions (user_id, status, created_at DESC);

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS auto_filed_at TIMESTAMP WITH TIME ZONE;