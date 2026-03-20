import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DailyPlan {
  lines: string[];
  generatedAt: string;
}

const CACHE_KEY = "anren_daily_plan";

function getCachedPlan(): DailyPlan | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyPlan;
    const today = new Date().toISOString().split("T")[0];
    if (parsed.generatedAt?.startsWith(today)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function cachePlan(plan: DailyPlan) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(plan));
}

export function clearDailyPlanCache() {
  localStorage.removeItem(CACHE_KEY);
}

export function useDailyPlan(cardsReady: boolean, calendarSummary?: string) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<string[] | null>(() => getCachedPlan()?.lines ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const generatingRef = useRef(false);

  const generate = useCallback(async (force = false) => {
    if (!user || generatingRef.current) return;
    if (!force) {
      const cached = getCachedPlan();
      if (cached) { setPlan(cached.lines); return; }
    }
    generatingRef.current = true;
    setLoading(true);
    setError(false);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-daily-plan", {
        body: { calendarSummary: calendarSummary || "" },
      });

      if (fnErr || !data?.plan) {
        setError(true);
        return;
      }

      const newPlan: DailyPlan = {
        lines: data.plan,
        generatedAt: data.generatedAt || new Date().toISOString(),
      };
      setPlan(newPlan.lines);
      cachePlan(newPlan);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      generatingRef.current = false;
    }
  }, [user, calendarSummary]);

  // Auto-generate when cards are ready
  useEffect(() => {
    if (!user || !cardsReady) return;
    generate(false);
  }, [user, cardsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerate = useCallback(() => {
    clearDailyPlanCache();
    return generate(true);
  }, [generate]);

  return { plan, loading, error, regenerate };
}
