import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { undoableDelete } from "@/lib/undo";
import { mapNote, type Note } from "@/types/note";

type NoteEdits = Partial<
  Pick<Note, "title" | "synthesis" | "projectId" | "body" | "recordedAt" | "status">
>;


export function noteUpdatePayload(updates: NoteEdits) {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.synthesis !== undefined) payload.synthesis = updates.synthesis;
  if (updates.projectId !== undefined) payload.project_id = updates.projectId;
  if (updates.body !== undefined) payload.body = updates.body;
  if (updates.recordedAt !== undefined) payload.recorded_at = updates.recordedAt;
  return payload;
}

/** Hides the note now; the caller's undo window decides if it stays gone. */
export function softDeleteNote(note: Pick<Note, "id" | "audioPath">, onUndo: () => void) {
  void supabase.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", note.id);

  undoableDelete({
    message: "Note deleted",
    onUndo: async () => {
      await supabase.from("notes").update({ deleted_at: null }).eq("id", note.id);
      onUndo();
    },
    onFinalize: async () => {
      if (note.audioPath) {
        await supabase.storage.from("voice-notes").remove([note.audioPath]);
      }
      await supabase.from("notes").delete().eq("id", note.id);
    },
  });
}

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
      .is("deleted_at", null)
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

  const updateNote = useCallback(async (id: string, updates: NoteEdits) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    await supabase.from("notes").update(noteUpdatePayload(updates)).eq("id", id);
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      softDeleteNote(note, () => load());
    },
    [notes, load],
  );

  return { notes, loading, reload: load, updateNote, deleteNote };
}

export function useNote(noteId: string | undefined) {
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !noteId) return;
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .is("deleted_at", null)
      .maybeSingle();
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

  const patch = useCallback(
    async (updates: NoteEdits) => {
      if (!note) return;
      setNote({ ...note, ...updates });
      await supabase.from("notes").update(noteUpdatePayload(updates)).eq("id", note.id);
    },
    [note],
  );

  return { note, loading, reload: load, patch };
}
