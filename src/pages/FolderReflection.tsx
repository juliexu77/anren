import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";

interface Observation {
  text: string;
  grounding?: string;
  note_ids?: string[];
}

interface Reflection {
  observations: Observation[];
  reading: string | null;
  notesAnalyzed: number;
}

const FolderReflection = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { projects } = useProjects();
  const { notes } = useNotes(projectId ?? null);

  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const titleById = useMemo(
    () => new Map(notes.map((n) => [n.id, n.title ?? "Untitled"])),
    [notes],
  );

  const load = useCallback(async () => {
    if (!user || !projectId) return;
    const { data } = await supabase
      .from("folder_reflections")
      .select("observations, reading, notes_analyzed")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .maybeSingle();

    setReflection(
      data
        ? {
            observations: Array.isArray(data.observations)
              ? (data.observations as unknown as Observation[])
              : [],
            reading: data.reading,
            notesAnalyzed: data.notes_analyzed,
          }
        : null,
    );
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    const { error } = await supabase.functions.invoke("folder-reflection", {
      body: { projectId },
    });
    setGenerating(false);
    if (error) {
      toast.error("Couldn't gather this just now.");
      return;
    }
    load();
  };

  useEffect(() => {
    if (!loading && !reflection && !generating && notes.length >= 2) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, reflection, notes.length]);

  const newSince = reflection ? notes.length - reflection.notesAnalyzed : 0;

  return (
    <div>
      <Link
        to={projectId ? `/folder/${projectId}` : "/"}
        className="mb-7 inline-flex items-center gap-1.5 text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
        {project?.name ?? "Back"}
      </Link>

      <header className="mb-9 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {project?.emoji && <span className="text-[1.5rem] leading-none">{project.emoji}</span>}
            <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">
              What you're noticing
            </h1>
          </div>
          <p className="mt-1.5 text-[0.9rem] text-muted-foreground">
            {project?.name ?? "This folder"} · {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
        </div>
        {reflection && (
          <button
            onClick={generate}
            disabled={generating}
            className="flex shrink-0 items-center gap-2 rounded-full border border-hairline bg-paper px-4 py-2 text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            Read again
          </button>
        )}
      </header>

      {loading || generating ? (
        <p className="text-[0.9rem] text-muted-foreground">Reading these back…</p>
      ) : notes.length < 2 ? (
        <div className="rounded-[20px] border border-hairline bg-paper/70 px-6 py-10 text-center">
          <p className="font-editorial text-[1.2rem] leading-snug">Not much to notice yet.</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
            Once a couple of notes are sitting here together, anren can read across them.
          </p>
        </div>
      ) : !reflection ? (
        <div className="rounded-[20px] border border-hairline bg-paper/70 px-6 py-10 text-center">
          <p className="font-editorial text-[1.2rem] leading-snug">Nothing gathered yet.</p>
          <button
            onClick={generate}
            className="mt-3 text-[0.9rem] text-muted-foreground underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
          >
            Read across these notes
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          {newSince > 0 && (
            <p className="text-[0.82rem] text-muted-foreground/80">
              {newSince} new note{newSince === 1 ? "" : "s"} since this reading.
            </p>
          )}

          <div className="flex flex-col gap-8">
            {reflection.observations.map((obs, i) => (
              <div key={i}>
                <p className="font-editorial text-[1.12rem] leading-[1.6]">{obs.text}</p>
                {obs.grounding && (
                  <p className="mt-2 text-[0.93rem] leading-[1.7] text-muted-foreground">
                    {obs.grounding}
                  </p>
                )}
                {!!obs.note_ids?.length && (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                    {obs.note_ids.map((id) => (
                      <Link
                        key={id}
                        to={`/note/${id}`}
                        className="text-[0.8rem] text-muted-foreground/80 underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
                      >
                        {titleById.get(id) ?? "Note"}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {reflection.reading && (
            <section className="border-t border-hairline pt-7">
              <h2 className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                One way to read this
              </h2>
              <p className="mt-3 pl-4 text-[0.98rem] font-light leading-[1.8] text-muted-foreground">
                {reflection.reading}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderReflection;
