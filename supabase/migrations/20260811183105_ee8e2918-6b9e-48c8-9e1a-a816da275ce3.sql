-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop old product tables
DROP TABLE IF EXISTS public.address_book_contacts CASCADE;
DROP TABLE IF EXISTS public.address_book_entries CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.daily_brief_dismissals CASCADE;
DROP TABLE IF EXISTS public.daily_brief_settings CASCADE;
DROP TABLE IF EXISTS public.device_tokens CASCADE;
DROP TABLE IF EXISTS public.health_signals CASCADE;
DROP TABLE IF EXISTS public.household_invites CASCADE;
DROP TABLE IF EXISTS public.household_members CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;
DROP TABLE IF EXISTS public.life_reviews CASCADE;
DROP TABLE IF EXISTS public.people CASCADE;
DROP TABLE IF EXISTS public.reflection_summaries CASCADE;
DROP TABLE IF EXISTS public.reflections CASCADE;
DROP TABLE IF EXISTS public.user_connections CASCADE;
DROP TABLE IF EXISTS public.weekly_syntheses CASCADE;
DROP FUNCTION IF EXISTS public.is_household_member(uuid, uuid) CASCADE;

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own projects" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX projects_user_idx ON public.projects (user_id, position);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notes
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text,
  synthesis text,
  transcript text,
  audio_path text,
  duration_seconds integer,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(synthesis, '') || ' ' || coalesce(transcript, ''))
  ) STORED
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notes_user_recorded_idx ON public.notes (user_id, recorded_at DESC);
CREATE INDEX notes_project_idx ON public.notes (project_id);
CREATE INDEX notes_search_idx ON public.notes USING gin (search_tsv);
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Note passages (embedding chunks)
CREATE TABLE public.note_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(3072),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, chunk_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_passages TO authenticated;
GRANT ALL ON public.note_passages TO service_role;
ALTER TABLE public.note_passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own passages" ON public.note_passages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX note_passages_embedding_idx ON public.note_passages
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- Weekly digests
CREATE TABLE public.weekly_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  narrative text NOT NULL,
  themes jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes_analyzed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_digests TO authenticated;
GRANT ALL ON public.weekly_digests TO service_role;
ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own digests" ON public.weekly_digests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX weekly_digests_unique_idx ON public.weekly_digests (user_id, week_start, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE TRIGGER update_weekly_digests_updated_at BEFORE UPDATE ON public.weekly_digests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hybrid search: full-text + vector, reciprocal rank fusion
CREATE OR REPLACE FUNCTION public.hybrid_search_notes(
  query_text text,
  query_embedding vector(3072),
  match_count integer DEFAULT 20,
  filter_project uuid DEFAULT NULL
)
RETURNS TABLE (
  note_id uuid,
  passage text,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH kw AS (
    SELECT n.id AS note_id,
           left(coalesce(n.transcript, n.synthesis, ''), 400) AS passage,
           row_number() OVER (ORDER BY ts_rank(n.search_tsv, websearch_to_tsquery('english', query_text)) DESC) AS rank
    FROM public.notes n
    WHERE query_text <> ''
      AND n.search_tsv @@ websearch_to_tsquery('english', query_text)
      AND (filter_project IS NULL OR n.project_id = filter_project)
    LIMIT match_count * 2
  ),
  vec AS (
    SELECT p.note_id,
           p.content AS passage,
           row_number() OVER (ORDER BY p.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS rank
    FROM public.note_passages p
    JOIN public.notes n ON n.id = p.note_id
    WHERE query_embedding IS NOT NULL
      AND p.embedding IS NOT NULL
      AND (filter_project IS NULL OR n.project_id = filter_project)
    LIMIT match_count * 2
  ),
  fused AS (
    SELECT coalesce(kw.note_id, vec.note_id) AS note_id,
           coalesce(vec.passage, kw.passage) AS passage,
           coalesce(1.0 / (60 + kw.rank), 0) + coalesce(1.0 / (60 + vec.rank), 0) AS score
    FROM kw FULL OUTER JOIN vec ON kw.note_id = vec.note_id
  )
  SELECT note_id, min(passage) AS passage, max(score) AS score
  FROM fused
  GROUP BY note_id
  ORDER BY score DESC
  LIMIT match_count;
$$;

-- Storage policies for the private voice-notes bucket
CREATE POLICY "Users read own voice notes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own voice notes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own voice notes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);