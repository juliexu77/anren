CREATE TABLE public.folder_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  reading TEXT,
  notes_analyzed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folder_reflections TO authenticated;
GRANT ALL ON public.folder_reflections TO service_role;

ALTER TABLE public.folder_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folder reflections"
ON public.folder_reflections FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);