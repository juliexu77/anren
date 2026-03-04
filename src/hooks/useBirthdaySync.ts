import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useBirthdaySync() {
  const { user } = useAuth();

  const syncBirthdays = useCallback(async () => {
    if (!user) return;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;

    // Fetch birthdays from Google
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=birthdays`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = await res.json();
    if (result.error || !result.birthdays) {
      console.error("Birthday sync error:", result.error);
      return;
    }

    if (result.birthdays.length === 0) return;

    // Fetch existing birthday cards to dedup
    const { data: existing } = await supabase
      .from("cards")
      .select("title, due_at")
      .eq("user_id", user.id)
      .eq("source", "birthday_scan");

    const existingSet = new Set(
      (existing || []).map((c) => `${c.title}|${c.due_at?.slice(0, 10)}`)
    );

    const newCards = result.birthdays
      .filter((b: any) => {
        const key = `${b.name}'s birthday|${b.date}`;
        return b.name && b.date && !existingSet.has(key);
      })
      .map((b: any) => ({
        user_id: user.id,
        title: `${b.name}'s birthday`,
        body: "",
        source: "birthday_scan",
        routed_type: "event",
        status: "scheduled",
        due_at: b.date + "T00:00:00Z",
        category: "milestone",
      }));

    if (newCards.length > 0) {
      const { error } = await supabase.from("cards").insert(newCards);
      if (error) console.error("Failed to create birthday cards:", error);
    }

    return newCards.length;
  }, [user]);

  return { syncBirthdays };
}
