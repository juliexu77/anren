import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { BrainCard, CardCategory, CardSource } from "@/types/card";

export function useCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<BrainCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch cards from database
  useEffect(() => {
    if (!user) {
      setCards([]);
      setLoading(false);
      return;
    }

    const fetchCards = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch cards:", error);
      } else {
        setCards(
          (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            body: row.body,
            category: row.category as CardCategory,
            source: row.source as CardSource,
            imageUrl: row.image_url,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
      }
      setLoading(false);
    };

    fetchCards();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("cards-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards", filter: `user_id=eq.${user.id}` },
        () => {
          fetchCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addCard = useCallback(
    async (data: {
      title: string;
      body: string;
      category?: CardCategory;
      source?: CardSource;
      imageUrl?: string;
    }): Promise<string> => {
      if (!user) return "";

      const { data: inserted, error } = await supabase
        .from("cards")
        .insert({
          user_id: user.id,
          title: data.title,
          body: data.body,
          category: data.category ?? "finance",
          source: data.source ?? "text",
          image_url: data.imageUrl,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to add card:", error);
        return "";
      }

      return inserted.id;
    },
    [user]
  );

  const updateCard = useCallback(
    async (id: string, updates: Partial<Pick<BrainCard, "title" | "body" | "category">>) => {
      const { error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("Failed to update card:", error);
      }
    },
    []
  );

  const deleteCard = useCallback(async (id: string) => {
    // Optimistically remove from UI
    setCards((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete card:", error);
    }
  }, []);

  return { cards, loading, addCard, updateCard, deleteCard };
}
