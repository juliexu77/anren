
DROP POLICY IF EXISTS "Members can view household" ON public.households;
CREATE POLICY "Members can view household" ON public.households
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = households.id AND hm.user_id = auth.uid()
  ));
