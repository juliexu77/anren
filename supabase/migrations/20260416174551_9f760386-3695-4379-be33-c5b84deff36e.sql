CREATE TABLE public.life_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.life_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own life reviews"
ON public.life_reviews FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own life reviews"
ON public.life_reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own life reviews"
ON public.life_reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_life_reviews_updated_at
BEFORE UPDATE ON public.life_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_life_reviews_user_week ON public.life_reviews(user_id, week_start DESC);