import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { undoableDelete } from "@/lib/undo";
import { hiddenNoteIds, hideNote, notesChanged, onNotesChanged, unhideNote } from "@/lib/noteEvents";
import { mapNote, type Note } from "@/types/note";


type NoteEdits = Partial<
  Pick<Note, "title" | "synthesis" | "projectId" | "body" | "transcript" | "audioPath" | "recordedAt" | "status">
>;

export function noteUpdatePayload(updates: NoteEdits) {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.synthesis !== undefined) payload.synthesis = updates.synthesis;
  if (updates.projectId !== undefined) payload.project_id = updates.projectId;
  if (updates.body !== undefined) payload.body = updates.body;
  if (updates.transcript !== undefined) payload.transcript = updates.transcript;
  if (updates.audioPath !== undefined) payload.audio_path = updates.audioPath;
  if (updates.recordedAt !== undefined) payload.recorded_at = updates.recordedAt;
  if (updates.status !== undefined) payload.status = updates.status;

  return payload;
}

/**
 * Hides the note everywhere at once, then waits for the row to be marked gone
 * so any screen that reloads next can't read it as still alive.
 */
export async function softDeleteNote(note: Pick<Note, "id" | "audioPath">, onUndo: () => void) {
  hideNote(note.id);
  const { error } = await supabase
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", note.id);
  if (error) {
    unhideNote(note.id);
    toast("Couldn't delete that just now.");
    return false;
  }
  notesChanged();


  undoableDelete({
    message: "Note deleted",
    onUndo: async () => {
      await supabase.from("notes").update({ deleted_at: null }).eq("id", note.id);
      unhideNote(note.id);
      onUndo();
    },
    onFinalize: async () => {
      if (note.audioPath) {
        await supabase.storage.from("voice-notes").remove([note.audioPath]);
      }
      await supabase.from("notes").delete().eq("id", note.id);
      hiddenNoteIds.delete(note.id);
    },
  });

  return true;
}


/**
 * Clears out notes whose undo window closed while the app wasn't looking — a
 * reload mid-window used to leave them soft-deleted forever.
 */
async function sweepAbandonedDeletes(userId: string) {
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  await supabase.from("notes").delete().eq("user_id", userId).lt("deleted_at", cutoff);
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
      // Continuations live inside the note they carry on from.
      .is("continues_note_id", null)
      .order("recorded_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (!error && data) {
      // Everything spoken shows up, including a note still on its way up — a
      // note you spoke should never quietly vanish from the archive. Notes in
      // their undo window stay hidden until the window closes.
      setNotes(data.map(mapNote).filter((n) => !hiddenNoteIds.has(n.id)));
    }


    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // A delete or an undo anywhere in the app reaches every list on screen.
  useEffect(() => onNotesChanged(() => {
    setNotes((prev) => prev.filter((n) => !hiddenNoteIds.has(n.id)));
    void load();
  }), [load]);

  useEffect(() => {
    if (!user) return;
    void sweepAbandonedDeletes(user.id);
  }, [user]);

  // Live fill-in: a note appears immediately, then its title/synthesis land.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notes-${user.id}-${projectId ?? "all"}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, projectId, load]);


  const updateNote = useCallback(
    async (id: string, updates: NoteEdits) => {
      const before = notes.find((n) => n.id === id);
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
      const { error } = await supabase.from("notes").update(noteUpdatePayload(updates)).eq("id", id);
      if (error) {
        // Put it back the way it was rather than showing a change that never landed.
        if (before) setNotes((prev) => prev.map((n) => (n.id === id ? before : n)));
        toast("That change didn't save. Try again in a moment.");
        return false;
      }
      return true;
    },
    [notes],
  );


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
      .channel(`note-${noteId}-${Math.random().toString(36).slice(2)}`)
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
      if (!note) return false;
      const before = note;
      setNote({ ...note, ...updates });
      const { error } = await supabase
        .from("notes")
        .update(noteUpdatePayload(updates))
        .eq("id", note.id);
      if (error) {
        setNote(before);
        toast("That change didn't save. Try again in a moment.");
        return false;
      }
      return true;
    },
    [note],
  );


  return { note, loading, reload: load, patch };
}
