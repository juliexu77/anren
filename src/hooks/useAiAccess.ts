import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Whether this person has connected their own Claude key. Deliberately says
 * nothing about how much of the free allowance is left — that lives in the
 * database, not in the interface.
 */
export function useAiAccess() {
  const { user } = useAuth();
  const [connected, setConnected] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setConnected(null);
      return;
    }
    const { data, error } = await supabase.rpc("has_own_ai_key");
    if (error) {
      console.error("could not check key status:", error.message);
      return;
    }
    setConnected(Boolean(data));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { connected, refresh };
}
