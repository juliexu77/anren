import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ReflectionSummary {
  id: string;
  period_type: string;
  period_start: string;
  texture: string;
  what_created_it: string;
  recurring_patterns: string;
  unresolved_threads: string;
  what_this_reveals: string;
  dismissed: boolean;
  created_at: string;
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function useReflectionDigest() {
  const { user, session } = useAuth();
  const [weeklyDigest, setWeeklyDigest] = useState<ReflectionSummary | null>(null);
  const [monthlyDigest, setMonthlyDigest] = useState<ReflectionSummary | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchDigests = useCallback(async () => {
    if (!user) return;

    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    // Check for existing weekly digest
    const { data: weekly } = await supabase
      .from("reflection_summaries")
      .select("*")
      .eq("user_id", user.id)
      .eq("period_type", "weekly")
      .eq("period_start", weekStart)
      .eq("dismissed", false)
      .maybeSingle();

    if (weekly) setWeeklyDigest(weekly as unknown as ReflectionSummary);

    // Check for existing monthly digest (on 1st of month)
    const now = new Date();
    if (now.getDate() <= 7) {
      const { data: monthly } = await supabase
        .from("reflection_summaries")
        .select("*")
        .eq("user_id", user.id)
        .eq("period_type", "monthly")
        .eq("period_start", monthStart)
        .eq("dismissed", false)
        .maybeSingle();

      if (monthly) setMonthlyDigest(monthly as unknown as ReflectionSummary);
    }
  }, [user]);

  // On-demand generation: if it's Monday+ and no weekly digest exists, try to generate
  useEffect(() => {
    if (!user || !session) return;

    const checkAndGenerate = async () => {
      const weekStart = getWeekStart();
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon

      // Only auto-generate on Monday or later
      if (dayOfWeek === 0) return; // Skip Sunday

      // Check if we have reflections from last 7 days
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data: reflections } = await supabase
        .from("reflections")
        .select("id")
        .eq("user_id", user.id)
        .gte("reflection_date", since.toISOString().split("T")[0])
        .limit(1);

      if (!reflections?.length) return;

      // Check if weekly digest already exists (including dismissed)
      const { data: existing } = await supabase
        .from("reflection_summaries")
        .select("id")
        .eq("user_id", user.id)
        .eq("period_type", "weekly")
        .eq("period_start", weekStart)
        .maybeSingle();

      if (existing) return;

      // Generate
      setGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-reflection-digest", {
          body: { periodType: "weekly" },
        });
        if (!error && data && !data.error) {
          setWeeklyDigest(data as ReflectionSummary);
        }
      } catch {
        // Silent fail for auto-generation
      } finally {
        setGenerating(false);
      }
    };

    fetchDigests();
    checkAndGenerate();
  }, [user, session, fetchDigests]);

  const dismiss = useCallback(async (id: string) => {
    await supabase
      .from("reflection_summaries")
      .update({ dismissed: true })
      .eq("id", id);
    setWeeklyDigest((prev) => (prev?.id === id ? null : prev));
    setMonthlyDigest((prev) => (prev?.id === id ? null : prev));
  }, []);

  return { weeklyDigest, monthlyDigest, generating, dismiss };
}
