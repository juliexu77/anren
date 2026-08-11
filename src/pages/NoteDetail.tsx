import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, FolderClosed, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNote } from "@/hooks/useNotes";
import { useProjects } from "@/hooks/useProjects";
import { formatDuration } from "@/lib/wav";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NoteDetail = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { note, loading, reload } = useNote(noteId);
  const { projects } = useProjects();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [related, setRelated] = useState<{ note_id: string; title: string | null; recorded_at: string }[] | null>(null);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!note?.audioPath) return;
    let active = true;
    supabase.storage
      .from("voice-notes")
      .createSignedUrl(note.audioPath, 60 * 60)
      .then(({ data }) => {
        if (active && data) setAudioUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [note?.audioPath]);

  useEffect(() => {
    if (!note?.id || note.status !== "ready") return;
    let active = true;
    setLoadingRelated(true);
    supabase.functions
      .invoke("related-notes", { body: { noteId: note.id } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("related-notes failed:", error);
          return;
        }
        const payload = data as { related?: { note_id: string; title: string | null; recorded_at: string }[] };
        setRelated(payload.related ?? []);
      })
      .finally(() => setLoadingRelated(false));
    return () => {
      active = false;
    };
  }, [note?.id, note?.status]);

  const moveToFolder = async (projectId: string | null) => {
    if (!note) return;
    await supabase.from("notes").update({ project_id: projectId }).eq("id", note.id);
    reload();
    toast.success(projectId ? "Filed away." : "Removed from folder.");
  };

  const remove = async () => {
    if (!note) return;
    if (note.audioPath) await supabase.storage.from("voice-notes").remove([note.audioPath]);
    await supabase.from("notes").delete().eq("id", note.id);
    navigate("/");
  };

  const ask = async () => {
    if (!note || !question.trim()) return;
    setAsking(true);
    setAnswer(null);
    const { data, error } = await supabase.functions.invoke("ask-note", {
      body: { noteId: note.id, question: question.trim() },
    });
    setAsking(false);
    if (error) {
      toast.error("Couldn't answer that just now.");
      return;
    }
    setAnswer((data as { answer?: string })?.answer ?? null);
  };

  if (loading) {
    return <p className="text-[0.9rem] text-muted-foreground">Opening…</p>;
  }

  if (!note) {
    return <p className="text-[0.9rem] text-muted-foreground">That note isn't here anymore.</p>;
  }

  const folderName = projects.find((p) => p.id === note.projectId)?.name;

  return (
    <article>
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back
        </button>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8rem] text-muted-foreground hover:text-foreground hover:bg-paper-sunk transition-colors">
              <FolderClosed className="w-3.5 h-3.5" strokeWidth={1.5} />
              {folderName ?? "File"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {projects.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => moveToFolder(p.id)}>
                  {p.name}
                </DropdownMenuItem>
              ))}
              {note.projectId && (
                <DropdownMenuItem onClick={() => moveToFolder(null)}>Remove from folder</DropdownMenuItem>
              )}
              {!projects.length && (
                <DropdownMenuItem disabled>Create a folder in the sidebar first</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={remove}
            aria-label="Delete note"
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-paper-sunk transition-colors"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <p className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground/70">
        {new Date(note.recordedAt).toLocaleString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
        {note.durationSeconds ? ` · ${formatDuration(note.durationSeconds)}` : ""}
      </p>

      <h1 className="mt-3 font-editorial text-[1.95rem] leading-[1.22] tracking-[-0.015em]">
        {note.title ?? (note.status === "processing" ? "Writing this up…" : "Untitled note")}
      </h1>

      {note.status === "processing" && (
        <div className="mt-6 flex items-center gap-2 text-[0.9rem] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Transcribing and summarising — this stays open, it'll fill in.
        </div>
      )}

      {note.status === "failed" && (
        <p className="mt-6 text-[0.9rem] text-muted-foreground">
          {note.errorMessage ?? "Something interrupted the write-up."}
        </p>
      )}

      {note.synthesis && (
        <div className="mt-7 rounded-[20px] border border-hairline bg-paper/70 px-6 py-6">
          <p className="whitespace-pre-line font-editorial text-[1.05rem] leading-[1.7]">
            {note.synthesis}
          </p>
        </div>
      )}

      {audioUrl && (
        <audio controls src={audioUrl} className="mt-7 w-full" preload="none">
          <track kind="captions" />
        </audio>
      )}

      {(related?.length || loadingRelated) && (
        <section className="mt-10">
          <h2 className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Related</h2>
          {loadingRelated ? (
            <div className="mt-3 flex items-center gap-2 text-[0.9rem] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Finding earlier notes…
            </div>
          ) : (
            <div className="mt-3 flex flex-col">
              {related?.map((r) => (
                <Link
                  key={r.note_id}
                  to={`/note/${r.note_id}`}
                  className="group flex items-baseline justify-between gap-3 py-3 border-b border-hairline last:border-b-0"
                >
                  <span className="note-title text-[0.95rem]">{r.title ?? "Untitled note"}</span>
                  <span className="shrink-0 text-[0.72rem] uppercase tracking-[0.13em] text-muted-foreground/60">
                    {new Date(r.recorded_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {note.transcript && (
        <section className="mt-10">
          <h2 className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Transcript</h2>
          <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-[1.8] text-muted-foreground">
            {note.transcript}
          </p>
        </section>
      )}

      {note.transcript && (
        <section className="mt-12">
          <h2 className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
            Ask about this note
          </h2>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="What did I decide here?"
              className="flex-1 rounded-full border border-hairline bg-paper px-4 py-2.5 text-[0.92rem] outline-none focus:border-primary/40 placeholder:text-muted-foreground/60"
            />
            <button
              onClick={ask}
              disabled={asking || !question.trim()}
              aria-label="Ask"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          </div>
          {answer && (
            <p className="mt-4 whitespace-pre-line text-[0.95rem] leading-[1.75] text-foreground/90">{answer}</p>
          )}
        </section>
      )}
    </article>
  );
};

export default NoteDetail;
