UPDATE public.cards
SET due_at = NULL
WHERE due_at IS NOT NULL
  AND google_event_id IS NULL
  AND source IN ('voice', 'brain_dump', 'text', 'extension', 'companion', 'email', 'image');