import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  draftMessage: string;
  createdAt: string;
  updatedAt: string;
}

export function usePeople() {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPeople([]);
      setLoading(false);
      return;
    }

    const fetchPeople = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch people:", error);
      } else {
        setPeople(
          (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            draftMessage: row.draft_message,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
      }
      setLoading(false);
    };

    fetchPeople();
  }, [user]);

  const addPerson = useCallback(
    async (data: { name: string; phone?: string; email?: string }) => {
      if (!user) return "";
      const tempId = crypto.randomUUID();
      const optimistic: Person = {
        id: tempId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        draftMessage: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPeople((prev) => [optimistic, ...prev]);

      const { data: inserted, error } = await supabase
        .from("people")
        .insert({
          user_id: user.id,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to add person:", error);
        setPeople((prev) => prev.filter((p) => p.id !== tempId));
        return "";
      }

      setPeople((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, id: inserted.id } : p))
      );
      return inserted.id;
    },
    [user]
  );

  const updateDraft = useCallback(
    async (id: string, draftMessage: string) => {
      setPeople((prev) =>
        prev.map((p) => (p.id === id ? { ...p, draftMessage } : p))
      );

      const { error } = await supabase
        .from("people")
        .update({ draft_message: draftMessage })
        .eq("id", id);

      if (error) console.error("Failed to update draft:", error);
    },
    []
  );

  const deletePerson = useCallback(async (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) console.error("Failed to delete person:", error);
  }, []);

  return { people, loading, addPerson, updateDraft, deletePerson };
}
