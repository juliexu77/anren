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
            groupId: row.group_id,
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

      // Optimistic: add to UI immediately
      const tempId = crypto.randomUUID();
      const optimisticCard: BrainCard = {
        id: tempId,
        title: data.title,
        body: data.body,
        category: data.category ?? "finance",
        source: data.source ?? "text",
        imageUrl: data.imageUrl ?? null,
        groupId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCards((prev) => [optimisticCard, ...prev]);

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
        setCards((prev) => prev.filter((c) => c.id !== tempId));
        return "";
      }

      // Replace temp id with real id
      setCards((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, id: inserted.id } : c))
      );

      return inserted.id;
    },
    [user]
  );

  const updateCard = useCallback(
    async (id: string, updates: Partial<Pick<BrainCard, "title" | "body" | "category">>) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.body !== undefined) dbUpdates.body = updates.body;
      if (updates.category !== undefined) dbUpdates.category = updates.category;

      const { error } = await supabase
        .from("cards")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Failed to update card:", error);
      }
    },
    []
  );

  const groupCards = useCallback(
    async (cardId1: string, cardId2: string) => {
      // Check if either card already has a group
      const card1 = cards.find((c) => c.id === cardId1);
      const card2 = cards.find((c) => c.id === cardId2);
      if (!card1 || !card2) return;

      const groupId = card1.groupId || card2.groupId || crypto.randomUUID();

      // Optimistic update
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId1 || c.id === cardId2 || c.groupId === groupId
            ? { ...c, groupId }
            : c
        )
      );

      const { error } = await supabase
        .from("cards")
        .update({ group_id: groupId })
        .in("id", [cardId1, cardId2]);

      if (error) console.error("Failed to group cards:", error);
    },
    [cards]
  );

  const ungroupCards = useCallback(
    async (groupId: string) => {
      setCards((prev) =>
        prev.map((c) => (c.groupId === groupId ? { ...c, groupId: null } : c))
      );

      const { error } = await supabase
        .from("cards")
        .update({ group_id: null })
        .eq("group_id", groupId);

      if (error) console.error("Failed to ungroup cards:", error);
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

  return { cards, loading, addCard, updateCard, deleteCard, groupCards, ungroupCards };
}
