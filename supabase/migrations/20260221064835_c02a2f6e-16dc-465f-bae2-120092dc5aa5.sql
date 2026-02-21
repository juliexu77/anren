
-- Create a table for people (contacts) with draft messages
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  draft_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own people"
ON public.people FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own people"
ON public.people FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own people"
ON public.people FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own people"
ON public.people FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_people_updated_at
BEFORE UPDATE ON public.people
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
