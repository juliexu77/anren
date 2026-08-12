import { supabase } from "@/integrations/supabase/client";
import { notesChanged } from "@/lib/noteEvents";

/**
 * Once a note is written up, anren quietly checks whether it belongs to a
 * project the person already keeps. A confident match is associated without
 * asking; the note stays exactly where it is in the feed either way. Silent on
 * failure — this is a nicety, never a step.
 */
export function associateNote(noteId: string): void {
  void supabase.functions
    .invoke("associate-note", { body: { noteId } })
    .then(({ data, error }) => {
      if (error) return;
      if (data?.projectId) notesChanged();
    })
    .catch(() => undefined);
}
