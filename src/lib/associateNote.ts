import { supabase } from "@/integrations/supabase/client";
import { notesChanged } from "@/lib/noteEvents";

/** Where a note turned out to belong, as far as anren can tell. */
export interface Landing {
  projectId: string | null;
  projectName: string | null;
  threadId: string | null;
  threadName: string | null;
  threadNoteCount: number;
  /** True when the person had already filed it themselves. */
  alreadyFiled: boolean;
}

const NOWHERE: Landing = {
  projectId: null,
  projectName: null,
  threadId: null,
  threadName: null,
  threadNoteCount: 0,
  alreadyFiled: false,
};

/**
 * Once a note is written up, anren quietly checks where it belongs: a project
 * the person already keeps, or a loose grouping that's been accumulating. A
 * confident match is filed without asking. Silent on failure — this is a
 * nicety, never a step.
 */
export async function associateNoteAsync(noteId: string): Promise<Landing> {
  try {
    const { data, error } = await supabase.functions.invoke("associate-note", {
      body: { noteId },
    });
    if (error) return NOWHERE;
    const landing: Landing = {
      projectId: (data?.projectId as string | undefined) ?? null,
      projectName: (data?.projectName as string | undefined) ?? null,
      threadId: (data?.threadId as string | undefined) ?? null,
      threadName: (data?.threadName as string | undefined) ?? null,
      threadNoteCount: (data?.threadNoteCount as number | undefined) ?? 0,
      alreadyFiled: Boolean(data?.alreadyFiled),
    };
    if (landing.projectId && !landing.alreadyFiled) notesChanged();
    return landing;
  } catch {
    return NOWHERE;
  }
}

/** Fire-and-forget flavour for callers that don't show the outcome. */
export function associateNote(noteId: string): void {
  void associateNoteAsync(noteId);
}

/** Does a loose grouping look like it belongs in a project already kept? */
export async function suggestProjectForThread(
  threadId: string,
): Promise<{ projectId: string; projectName: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("associate-note", {
      body: { threadId },
    });
    if (error) return null;
    const projectId = (data?.projectId as string | undefined) ?? null;
    const projectName = (data?.projectName as string | undefined) ?? null;
    return projectId ? { projectId, projectName: projectName ?? "that project" } : null;
  } catch {
    return null;
  }
}
