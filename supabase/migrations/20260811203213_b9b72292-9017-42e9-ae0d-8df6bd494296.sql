REVOKE ALL ON FUNCTION public.has_own_ai_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_own_ai_key() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_own_ai_key() TO authenticated;