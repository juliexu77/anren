import { supabase } from "@/integrations/supabase/client";
import { notesChanged } from "@/lib/noteEvents";
import { associateNoteAsync, type Landing } from "@/lib/associateNote";

/**
 * The short beat after you keep something: anren writes it up, then reads it
 * against what you already keep, and says where it landed. Every step is real —
 * a label only moves on once the work behind it has actually finished.
 */
export type NoticeStage = "writing" | "titling" | "reading" | "landed";

export const NOTICE_LABELS: Record<NoticeStage, string> = {
  writing: "anren is writing it up…",
  titling: "titling it…",
  reading: "reading it against what you keep…",
  landed: "",
};

export interface Noticed {
  noteId: string;
  title: string | null;
  landing: Landing;
}

/** The one line worth saying about where a note landed, or null when nothing is. */
export function landingLine(landing: Landing | null | undefined): string | null {
  if (!landing || landing.alreadyFiled) return null;
  if (landing.projectName) return `This sits with ${landing.projectName}.`;
  if (landing.threadName) {
    const others = Math.max(0, landing.threadNoteCount - 1);
    if (others < 2) return `This rhymes with what you said about ${landing.threadName}.`;
    return `This rhymes with ${others} other notes about ${landing.threadName}.`;
  }
  return null;
}

export async function noticeNote(
  noteId: string,
  onStage: (stage: NoticeStage) => void,
): Promise<Noticed> {
  onStage("writing");

  const { error } = await supabase.functions.invoke("process-note", { body: { noteId } });
  if (error) console.error("process-note failed:", error.message);
  notesChanged();

  onStage("titling");
  const { data: note } = await supabase
    .from("notes")
    .select("title")
    .eq("id", noteId)
    .maybeSingle();

  onStage("reading");
  const landing = await associateNoteAsync(noteId);

  onStage("landed");
  return { noteId, title: (note?.title as string | null) ?? null, landing };
}
