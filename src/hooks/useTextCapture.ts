import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { associateNoteAsync } from "@/lib/associateNote";
import { notesChanged } from "@/lib/noteEvents";

/**
 * The one place a typed note is kept, so the bottom composer and the Home
 * capture surface can never drift apart. Returns the new note id, plus the
 * project anren quietly filed it into (if it did).
 */
export function useTextCapture() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (
      body: string,
      projectId: string | null,
    ): Promise<{ noteId: string; filedInto: Promise<string | null> } | null> => {
      const trimmed = body.trim();
      if (!user || !trimmed || saving) return null;
      setSaving(true);

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          project_id: projectId,
          source: "typed",
          body: trimmed,
          transcript: trimmed,
          recorded_at: new Date().toISOString(),
          status: "processing",
        })
        .select("id")
        .single();

      setSaving(false);
      if (error || !data) return null;

      const noteId = data.id as string;
      notesChanged();

      const filedInto = supabase.functions
        .invoke("process-note", { body: { noteId } })
        .then(({ error: fnError }) => {
          if (fnError) {
            console.error("process-note failed:", fnError.message);
            return null;
          }
          return projectId ? null : associateNoteAsync(noteId);
        })
        .catch(() => null);

      return { noteId, filedInto };
    },
    [user, saving],
  );

  return { save, saving };
}
