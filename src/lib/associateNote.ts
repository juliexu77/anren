import { supabase } from "@/integrations/supabase/client";
import { notesChanged } from "@/lib/noteEvents";

/**
 * Once a note is written up, anren quietly checks whether it belongs to a
 * project the person already keeps. A confident match is associated without
 * asking; the note stays exactly where it is in the feed either way. Silent on
 * failure — this is a nicety, never a step.
 *
 * Resolves with the project id it landed in, or null.
 */
export async function associateNoteAsync(noteId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("associate-note", {
      body: { noteId },
    });
    if (error) return null;
    const projectId = (data?.projectId as string | undefined) ?? null;
    if (projectId) notesChanged();
    return projectId;
  } catch {
    return null;
  }
}

/** Fire-and-forget flavour for callers that don't show the outcome. */
export function associateNote(noteId: string): void {
  void associateNoteAsync(noteId);
}
