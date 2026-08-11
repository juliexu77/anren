import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isNeedsKeyError, NEEDS_KEY_MESSAGE } from "@/lib/aiAccess";
import type { Note } from "@/types/note";

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

export function FolderReflection({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const fetched = useRef(false);
  const [working, setWorking] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});


  const titleById = useMemo(
    () => new Map(notes.map((n) => [n.id, n.title ?? "Untitled"])),
    [notes],
  );

  const generate = useCallback(async () => {
    setWorking(true);
    const { error } = await supabase.functions.invoke("folder-reflection", {
      body: { projectId },
    });
    if (error) {
      setWorking(false);
      toast(isNeedsKeyError(error) ? NEEDS_KEY_MESSAGE : "Couldn't read across these just now.");
      return;
    }
    const { data } = await supabase
      .from("folder_reflections")
      .select("observations, reading, notes_analyzed")
      .eq("project_id", projectId)
      .maybeSingle();
    if (data) {
      setReflection({
        observations: Array.isArray(data.observations)
          ? (data.observations as unknown as Observation[])
          : [],
        reading: data.reading,
        notesAnalyzed: data.notes_analyzed,
      });
    }
    setWorking(false);
  }, [projectId]);

  // Load any cached reflection the first time the panel is opened.
  useEffect(() => {
    if (!open || fetched.current || !user) return;
    fetched.current = true;
    (async () => {
      const { data } = await supabase
        .from("folder_reflections")
        .select("observations, reading, notes_analyzed")
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .maybeSingle();
      if (data) {
        setReflection({
          observations: Array.isArray(data.observations)
            ? (data.observations as unknown as Observation[])
            : [],
          reading: data.reading,
          notesAnalyzed: data.notes_analyzed,
        });
      } else {
        generate();
      }
    })();
  }, [open, user, projectId, generate]);


  const newSince = reflection ? notes.length - reflection.notesAnalyzed : 0;

  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="underline decoration-hairline underline-offset-4">
          {open ? "Hide reflection" : "Reflect on these notes"}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")}
          strokeWidth={1.6}
        />
      </button>

      {open && (
        <div className="mt-5 border-l border-hairline pl-5">
          {working && !reflection ? (
            <p className="text-[0.9rem] text-muted-foreground">Reading these back…</p>
          ) : !reflection ? (
            <p className="text-[0.9rem] text-muted-foreground">Nothing gathered yet.</p>
          ) : (
            <div className="flex flex-col gap-7">
              {newSince > 0 && (
                <p className="text-[0.8rem] text-muted-foreground/80">
                  {newSince} new note{newSince === 1 ? "" : "s"} since this reading.
                </p>
              )}

              {reflection.reading && (
                <div>
                  <h3 className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                    One way to read this
                  </h3>
                  <p className="mt-2.5 font-editorial text-[1.15rem] leading-[1.6]">
                    {reflection.reading}
                  </p>
                </div>
              )}

              {!!reflection.observations.length && (
                <div className={cn(reflection.reading && "border-t border-hairline pt-6")}>
                  <h3 className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                    Patterns behind it
                  </h3>
                  <div className="mt-3.5 flex flex-col gap-4">
                    {reflection.observations.map((obs, i) => (
                      <div key={i}>
                        <p className="text-[0.95rem] leading-[1.6]">{obs.text}</p>
                        {(obs.grounding || !!obs.note_ids?.length) && (
                          <button
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))
                            }
                            className="mt-1.5 text-[0.78rem] text-muted-foreground/80 underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
                          >
                            {expanded[i] ? "Hide notes" : "See notes"}
                          </button>
                        )}
                        {expanded[i] && (
                          <div className="mt-2">
                            {obs.grounding && (
                              <p className="text-[0.9rem] leading-[1.7] text-muted-foreground">
                                {obs.grounding}
                              </p>
                            )}
                            {!!obs.note_ids?.length && (
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                                {obs.note_ids.map((id) => (
                                  <Link
                                    key={id}
                                    to={`/note/${id}`}
                                    className="text-[0.78rem] text-muted-foreground/80 underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
                                  >
                                    {titleById.get(id) ?? "Note"}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={generate}
                disabled={working}
                className="self-start text-[0.82rem] text-muted-foreground/80 underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-60"
              >
                {working ? "Reading these back…" : "Read again"}
              </button>
            </div>

          )}
        </div>
      )}
    </div>
  );
}
