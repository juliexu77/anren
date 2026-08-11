import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapNote, type Note } from "@/types/note";

export function useNotes(projectId?: string | null) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (!error && data) setNotes(data.map(mapNote));
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Live fill-in: a note appears immediately, then its title/synthesis land.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notes-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const updateNote = useCallback(
    async (id: string, updates: Partial<Pick<Note, "title" | "synthesis" | "projectId">>) => {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.synthesis !== undefined) payload.synthesis = updates.synthesis;
      if (updates.projectId !== undefined) payload.project_id = updates.projectId;

      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
      await supabase.from("notes").update(payload).eq("id", id);
    },
    [],
  );

  const deleteNote = useCallback(async (id: string) => {
    const note = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (note?.audioPath) {
      await supabase.storage.from("voice-notes").remove([note.audioPath]);
    }
    await supabase.from("notes").delete().eq("id", id);
  }, [notes]);

  return { notes, loading, reload: load, updateNote, deleteNote };
}

export function useNote(noteId: string | undefined) {
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !noteId) return;
    const { data } = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
    setNote(data ? mapNote(data) : null);
    setLoading(false);
  }, [user, noteId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!noteId) return;
    const channel = supabase
      .channel(`note-${noteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}` },
        (payload) => setNote(mapNote(payload.new)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  return { note, loading, reload: load };
}
