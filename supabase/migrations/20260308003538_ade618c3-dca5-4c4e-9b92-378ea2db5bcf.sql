
-- ============================================================
-- Fix: Recreate all household-related RLS policies as PERMISSIVE
-- ============================================================

-- ── households ──
DROP POLICY IF EXISTS "Owner can do everything" ON public.households;
DROP POLICY IF EXISTS "Members can view household" ON public.households;

CREATE POLICY "Owner can do everything" ON public.households
  AS PERMISSIVE FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view household" ON public.households
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = households.id AND hm.user_id = auth.uid()
  ));

-- ── household_members ──
DROP POLICY IF EXISTS "Owner can manage members" ON public.household_members;
DROP POLICY IF EXISTS "Members can view own membership" ON public.household_members;

CREATE POLICY "Owner can manage members" ON public.household_members
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = household_members.household_id AND h.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = household_members.household_id AND h.owner_id = auth.uid()
  ));

CREATE POLICY "Members can view own membership" ON public.household_members
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── household_invites ──
DROP POLICY IF EXISTS "Owner can manage invites" ON public.household_invites;
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.household_invites;

CREATE POLICY "Owner can manage invites" ON public.household_invites
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = household_invites.household_id AND h.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = household_invites.household_id AND h.owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can read invite by token" ON public.household_invites
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- ── cards (household viewer SELECT) ──
DROP POLICY IF EXISTS "Household members can view owner cards" ON public.cards;
DROP POLICY IF EXISTS "Users can view their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can create their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON public.cards;
DROP POLICY IF EXISTS "Users can delete their own cards" ON public.cards;

CREATE POLICY "Users can view their own cards" ON public.cards
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Household members can view owner cards" ON public.cards
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), user_id));

CREATE POLICY "Users can create their own cards" ON public.cards
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" ON public.cards
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON public.cards
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── profiles (household viewer SELECT) ──
DROP POLICY IF EXISTS "Household members can view owner profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Household members can view owner profile" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), user_id));

CREATE POLICY "Users can insert their own profile" ON public.profiles
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ── daily_brief_settings (household viewer SELECT) ──
DROP POLICY IF EXISTS "Household members can view owner brief settings" ON public.daily_brief_settings;
DROP POLICY IF EXISTS "Users can view own brief settings" ON public.daily_brief_settings;
DROP POLICY IF EXISTS "Users can insert own brief settings" ON public.daily_brief_settings;
DROP POLICY IF EXISTS "Users can update own brief settings" ON public.daily_brief_settings;

CREATE POLICY "Users can view own brief settings" ON public.daily_brief_settings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Household members can view owner brief settings" ON public.daily_brief_settings
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), user_id));

CREATE POLICY "Users can insert own brief settings" ON public.daily_brief_settings
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brief settings" ON public.daily_brief_settings
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
