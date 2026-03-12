import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { BrainCard, ItemType, ItemStatus, CardSource } from "@/types/card";
import { mapStatus, mapType } from "@/types/card";

export function useCards(overrideUserId?: string | null) {
  const { user } = useAuth();
  const [cards, setCards] = useState<BrainCard[]>([]);
  const [loading, setLoading] = useState(true);

  const effectiveUserId = overrideUserId || user?.id;
  const isReadOnly = !!overrideUserId;

  useEffect(() => {
    if (!effectiveUserId) {
      setCards([]);
      setLoading(false);
      return;
    }

    const fetchCards = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch cards:", error);
      } else {
        const mapped = (data || []).map((row: any): BrainCard => ({
          id: row.id,
          title: row.title,
          summary: row.summary || "",
          body: row.body,
          source: row.source as CardSource,
          type: mapType(row.routed_type),
          status: mapStatus(row.status),
          imageUrl: row.image_url,
          groupId: row.group_id,
          dueAt: row.due_at,
          googleEventId: row.google_event_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        // Auto-fail stale parsing items
        const now = Date.now();
        const staleIds: string[] = [];
        mapped.forEach((c) => {
          if (c.body === "@@PARSING@@" && now - new Date(c.createdAt).getTime() > 2 * 60 * 1000) {
            staleIds.push(c.id);
            c.body = "@@PARSE_FAILED@@";
          }
        });
        if (staleIds.length > 0) {
          supabase.from("cards").update({ body: "@@PARSE_FAILED@@" }).in("id", staleIds).then();
        }

        setCards(mapped);
      }
      setLoading(false);
    };

    fetchCards();

    const channel = supabase
      .channel(`cards-changes-${effectiveUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards", filter: `user_id=eq.${effectiveUserId}` },
        () => fetchCards()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [effectiveUserId]);

  const addCard = useCallback(
    async (data: {
      title: string;
      body: string;
      source?: CardSource;
      imageUrl?: string;
      type?: ItemType;
      status?: ItemStatus;
      dueAt?: string;
    }): Promise<string> => {
      if (!user) return "";

      const tempId = crypto.randomUUID();
      const optimistic: BrainCard = {
        id: tempId,
        title: data.title,
        summary: "",
        body: data.body,
        source: data.source ?? "text",
        type: data.type ?? null,
        status: data.status ?? "active",
        imageUrl: data.imageUrl ?? null,
        groupId: null,
        dueAt: data.dueAt ?? null,
        googleEventId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCards((prev) => [optimistic, ...prev]);

      const { data: inserted, error } = await supabase
        .from("cards")
        .insert({
          user_id: user.id,
          title: data.title,
          body: data.body,
          source: data.source ?? "text",
          routed_type: data.type ?? null,
          status: data.status ?? "active",
          due_at: data.dueAt ?? null,
          image_url: data.imageUrl,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to add card:", error);
        setCards((prev) => prev.filter((c) => c.id !== tempId));
        return "";
      }

      setCards((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: inserted.id } : c)));
      return inserted.id;
    },
    [user]
  );

  /** Bulk-add items from a brain dump */
  const addItems = useCallback(
    async (items: Array<{
      title: string;
      type: ItemType;
      dueAt?: string | null;
    }>) => {
      if (!user) return;

      const now = new Date();
      const rows = items.map((item) => {
        // Don't schedule items with past due dates
        return {
          user_id: user.id,
          title: item.title,
          body: "",
          source: "brain_dump",
          routed_type: item.type,
          status: "active",
          due_at: item.dueAt ?? null,
        };
      });

      const { data, error } = await supabase.from("cards").insert(rows).select();
      if (error) {
        console.error("Failed to add items:", error);
        return;
      }
      if (data) {
        const mapped: BrainCard[] = data.map((row) => ({
          id: row.id,
          title: row.title,
          summary: row.summary,
          body: row.body,
          source: row.source as BrainCard["source"],
          type: mapType(row.routed_type),
          status: mapStatus(row.status),
          imageUrl: row.image_url,
          groupId: row.group_id,
          dueAt: row.due_at,
          googleEventId: row.google_event_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        setCards((prev) => [...mapped, ...prev]);
      }
    },
    [user]
  );

  const updateCard = useCallback(
    async (id: string, updates: Partial<Pick<BrainCard, "title" | "summary" | "body" | "status" | "type" | "dueAt" | "googleEventId">>) => {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
      if (updates.body !== undefined) dbUpdates.body = updates.body;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.type !== undefined) dbUpdates.routed_type = updates.type;
      if (updates.dueAt !== undefined) dbUpdates.due_at = updates.dueAt;
      if (updates.googleEventId !== undefined) dbUpdates.google_event_id = updates.googleEventId;

      const { error } = await supabase.from("cards").update(dbUpdates).eq("id", id);
      if (error) console.error("Failed to update card:", error);
    },
    []
  );

  const deleteCard = useCallback(async (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) console.error("Failed to delete card:", error);
  }, []);

  return { cards, loading, addCard, addItems, updateCard, deleteCard };
}
