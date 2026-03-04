ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_calendars text[] DEFAULT ARRAY['primary']::text[],
  ADD COLUMN IF NOT EXISTS birthdays_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;