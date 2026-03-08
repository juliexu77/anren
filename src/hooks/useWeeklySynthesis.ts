import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WeeklyDomain {
  name: string;
  percentage: number;
  count: number;
}

export interface StaleNudge {
  title: string;
  days_old: number;
  nudge: string;
}

export interface WeeklySynthesis {
  id: string;
  narrative: string;
  domains: WeeklyDomain[];
  stale_items: StaleNudge[];
  total_cards_analyzed: number;
  week_start: string;
}

export function useWeeklySynthesis() {
  const { user } = useAuth();
  const [synthesis, setSynthesis] = useState<WeeklySynthesis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      // Get the most recent undismissed synthesis
      const { data, error } = await supabase
        .from("weekly_syntheses")
        .select("*")
        .eq("user_id", user.id)
        .eq("dismissed", false)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setSynthesis({
          id: data.id,
          narrative: data.narrative,
          domains: (data.domains as any) || [],
          stale_items: (data.stale_items as any) || [],
          total_cards_analyzed: data.total_cards_analyzed,
          week_start: data.week_start,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const dismiss = useCallback(async () => {
    if (!synthesis) return;
    setSynthesis(null);

    await supabase
      .from("weekly_syntheses")
      .update({ dismissed: true })
      .eq("id", synthesis.id);
  }, [synthesis]);

  return { synthesis, loading, dismiss };
}
