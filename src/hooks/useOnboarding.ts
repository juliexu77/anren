import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Reads the profile's onboarding flag so the shell can show the walkthrough
 * once. Nothing else is written to the account during onboarding.
 */
export function useOnboarding() {
  const { user } = useAuth();
  const [needed, setNeeded] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(false);
      return;
    }
    let cancelled = false;

    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setNeeded(data ? data.onboarding_completed !== true : false);
        setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const finish = useCallback(async () => {
    setNeeded(false);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);
  }, [user]);

  /** "Show me around again" — replays the walkthrough without touching the flag. */
  const replay = useCallback(() => setNeeded(true), []);

  return { needed: checked && needed, finish, replay };
}
