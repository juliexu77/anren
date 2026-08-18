import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { landingLine } from "@/lib/noticing";
import { notesChanged } from "@/lib/noteEvents";
import type { Landing } from "@/lib/associateNote";

interface Said {
  title: string | null;
  echo: string | null;
  projectId: string | null;
  projectName: string | null;
  autoFiled: boolean;
  threadName: string | null;
  threadNoteCount: number;
}

const NOTHING: Said = {
  title: null,
  echo: null,
  projectId: null,
  projectName: null,
  autoFiled: false,
  threadName: null,
  threadNoteCount: 0,
};

/**
 * What anren has to say about the note you just kept: the title it gave it, a
 * sentence or two back about what you were working out, and — only when it's
 * true — where the note landed. Every line appears when it's real; nothing
 * waits on a spinner, and nothing apologises for being late.
 */
export function KeptEcho({
  noteId,
  onSomethingNew,
}: {
  noteId: string;
  onSomethingNew?: () => void;
}) {
  const [said, setSaid] = useState<Said>(NOTHING);

  useEffect(() => {
    let alive = true;

    const read = async () => {
      const { data: note } = await supabase
        .from("notes")
        .select("title, echo, project_id, auto_filed_at")
        .eq("id", noteId)
        .maybeSingle();
      if (!alive || !note) return;

      let projectName: string | null = null;
      if (note.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", note.project_id)
          .maybeSingle();
        projectName = (project?.name as string | null) ?? null;
      }

      let threadName: string | null = null;
      let threadNoteCount = 0;
      if (!note.project_id) {
        const { data: threads } = await supabase
          .from("threads")
          .select("name, note_ids")
          .eq("status", "active")
          .contains("note_ids", [noteId])
          .limit(1);
        const thread = (threads ?? [])[0];
        if (thread) {
          threadName = (thread.name as string | null) ?? null;
          threadNoteCount = ((thread.note_ids as string[] | null) ?? []).length;
        }
      }

      if (!alive) return;
      setSaid({
        title: (note.title as string | null) ?? null,
        echo: (note.echo as string | null) ?? null,
        projectId: (note.project_id as string | null) ?? null,
        projectName,
        autoFiled: Boolean(note.auto_filed_at),
        threadName,
        threadNoteCount,
      });
    };

    void read();

    const channel = supabase
      .channel(`kept-${noteId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notes", filter: `id=eq.${noteId}` },
        () => void read(),
      )
      .subscribe();

    // The write-up and the reading land a beat apart, so keep glancing back
    // for a short while rather than trusting one event to arrive.
    const poll = window.setInterval(() => void read(), 2500);
    const stop = window.setTimeout(() => window.clearInterval(poll), 20000);

    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearTimeout(stop);
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  useEffect(() => {
    if (said.title || said.echo) onSomethingNew?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [said.title, said.echo, said.projectName, said.threadName]);

  const landing: Landing = {
    projectId: said.projectId,
    projectName: said.autoFiled ? said.projectName : null,
    threadId: null,
    threadName: said.threadName,
    threadNoteCount: said.threadNoteCount,
    alreadyFiled: false,
  };
  const connecting = landingLine(landing);

  /** A guess should never cost more than one tap to undo. */
  const notThat = async () => {
    setSaid((prev) => ({ ...prev, projectId: null, projectName: null, autoFiled: false }));
    await supabase.from("notes").update({ project_id: null, auto_filed_at: null }).eq("id", noteId);
    notesChanged();
  };

  return (
    <div className="mx-auto max-w-[38ch] motion-safe:animate-fade-in">
      <p className="text-[0.95rem] text-muted-foreground">
        Kept it.{" "}
        <Link
          to={`/note/${noteId}`}
          className="italic underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
        >
          open it
        </Link>
      </p>

      {said.title && (
        <p
          key={said.title}
          className="mt-4 font-editorial text-[1.15rem] leading-[1.5] text-foreground motion-safe:animate-fade-in"
        >
          {said.title}
        </p>
      )}

      {said.echo && (
        <p
          key={said.echo}
          className="mt-2 text-[0.92rem] leading-[1.7] text-muted-foreground motion-safe:animate-fade-in"
        >
          {said.echo}
        </p>
      )}

      {connecting && (
        <p className="mt-3 text-[0.84rem] leading-[1.6] text-muted-foreground/75 motion-safe:animate-fade-in">
          {said.projectId && said.projectName ? (
            <>
              This sits with{" "}
              <Link
                to={`/folder/${said.projectId}`}
                className="underline decoration-hairline underline-offset-[3px] transition-colors hover:text-foreground"
              >
                {said.projectName}
              </Link>
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <button
                onClick={notThat}
                className="italic underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
              >
                not that?
              </button>
            </>
          ) : (
            connecting
          )}
        </p>
      )}
    </div>
  );
}
