CREATE OR REPLACE FUNCTION public.match_passages(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.78,
  match_count integer DEFAULT 20,
  exclude_note_id uuid DEFAULT NULL
)
RETURNS TABLE (
  note_id uuid,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.note_id,
    (1 - (p.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)))::float AS similarity
  FROM public.note_passages p
  JOIN public.notes n ON n.id = p.note_id
  WHERE p.embedding IS NOT NULL
    AND p.note_id <> coalesce(exclude_note_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (1 - (p.embedding::halfvec(3072) <=> query_embedding::halfvec(3072))) >= match_threshold
  ORDER BY p.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_passages(vector(3072), float, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_passages(vector(3072), float, integer, uuid) TO service_role;