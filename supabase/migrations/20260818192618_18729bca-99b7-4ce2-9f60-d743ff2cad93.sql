CREATE TABLE public.home_notes (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  line TEXT,
  kind TEXT NOT NULL DEFAULT 'observation',
  note_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  notes_analyzed INTEGER NOT NULL DEFAULT 0,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_notes TO authenticated;
GRANT ALL ON public.home_notes TO service_role;

ALTER TABLE public.home_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own home note" ON public.home_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_home_notes_updated_at BEFORE UPDATE ON public.home_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();