
-- households table
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- household_members table
CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- household_invites table
CREATE TABLE public.household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- Security definer function: is_household_member
CREATE OR REPLACE FUNCTION public.is_household_member(_user_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE hm.user_id = _user_id AND h.owner_id = _owner_id
  )
$$;

-- RLS: households
CREATE POLICY "Owner can do everything" ON public.households FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view household" ON public.households FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm WHERE hm.household_id = id AND hm.user_id = auth.uid()
  ));

-- RLS: household_members
CREATE POLICY "Owner can manage members" ON public.household_members FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()
  ));

CREATE POLICY "Members can view own membership" ON public.household_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS: household_invites
CREATE POLICY "Owner can manage invites" ON public.household_invites FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.households h WHERE h.id = household_id AND h.owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can read invite by token" ON public.household_invites FOR SELECT TO authenticated
  USING (true);

-- Add SELECT policy on cards for household members
CREATE POLICY "Household members can view owner cards" ON public.cards FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), user_id));

-- Add SELECT policy on profiles for household members
CREATE POLICY "Household members can view owner profile" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), user_id));

-- Add SELECT policy on daily_brief_settings for household members
CREATE POLICY "Household members can view owner brief settings" ON public.daily_brief_settings FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), user_id));
