import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Reflection {
  id: string;
  reflection_date: string;
  raw_transcript: string;
  texture: string;
  texture_why: string;
  what_this_reveals: string;
  energy_givers: string[];
  energy_drainers: string[];
  unresolved_threads: string[];
  summary: string;
  created_at: string;
}

export function useReflections() {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("reflections")
      .select("*")
      .eq("user_id", user.id)
      .order("reflection_date", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setReflections(data as unknown as Reflection[]);
        setLoading(false);
      });
  }, [user]);

  return { reflections, loading };
}
