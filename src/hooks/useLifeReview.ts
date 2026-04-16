import { useState, useEffect, useCallback } from "react";
import { startOfWeek, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LifeReviewTheme {
  title: string;
  body: string;
}

export interface LifeReview {
  arc: string;
  themes: LifeReviewTheme[];
  friction: LifeReviewTheme[];
  pattern: string;
  reveals: string;
  closing: string;
}

export function useLifeReview() {
  const { user } = useAuth();
  const [review, setReview] = useState<LifeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const generate = useCallback(
    async (force = false) => {
      if (!user) return;
      setGenerating(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "generate-life-review",
          { body: { weekStart, force } },
        );
        if (fnErr) throw fnErr;
        if (data?.review) setReview(data.review);
        else setReview(null);
      } catch (e) {
        console.error("life review error", e);
        setError(e instanceof Error ? e.message : "Failed to generate");
      } finally {
        setGenerating(false);
        setLoading(false);
      }
    },
    [user, weekStart],
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Try cache first
      const { data, error: dbErr } = await supabase
        .from("life_reviews")
        .select("content")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (cancelled) return;
      if (!dbErr && data?.content && (data.content as any).arc) {
        setReview(data.content as unknown as LifeReview);
        setLoading(false);
        return;
      }
      // No cache → generate
      await generate(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, weekStart, generate]);

  return { review, loading, generating, error, regenerate: () => generate(true) };
}
