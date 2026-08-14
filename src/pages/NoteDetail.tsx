import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, MoreHorizontal, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNote, softDeleteNote } from "@/hooks/useNotes";
import { ContinueNote } from "@/components/ContinueNote";
import { useProjects } from "@/hooks/useProjects";
import { formatDuration } from "@/lib/wav";
import { toast } from "sonner";
import { isNeedsKeyError, NEEDS_KEY_MESSAGE } from "@/lib/aiAccess";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

/** "Today · 8:14 PM" — the quiet line under each pane. */
function stamp(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = same(date, today)
    ? "Today"
    : same(date, yesterday)
      ? "Yesterday"
      : date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

const BULLET = /^\s*([-*•])\s+/;

/** The write-up often comes back as points — set those as clay-dotted lines. */
function Synthesis({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulleted = lines.filter((l) => BULLET.test(l)).length >= 2;

  if (!bulleted) {
    return (
      <div className="flex flex-col gap-4">
        {lines.map((line, i) => (
          <p key={i} className="font-editorial text-[1.08rem] leading-[1.62] text-foreground/90">
            {line}
          </p>
        ))}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-5">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[0.6rem] h-[5px] w-[5px] shrink-0 rounded-full bg-primary" />
          <span className="font-editorial text-[1.08rem] leading-[1.62] text-foreground/90">
            {line.replace(BULLET, "")}
          </span>
        </li>
      ))}
    </ul>
  );
}

const NoteDetail = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { note, loading, reload, patch } = useNote(noteId);
  const { projects } = useProjects();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [related, setRelated] = useState<{ note_id: string; title: string | null; recorded_at: string }[] | null>(null);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [threads, setThreads] = useState<{ id: string; name: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  // Draft fields — seeded from the note, saved on blur.
  const [titleDraft, setTitleDraft] = useState("");
  const [synthesisDraft, setSynthesisDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [editingSynthesis, setEditingSynthesis] = useState(false);

  const [editingDate, setEditingDate] = useState(false);
  const [tab, setTab] = useState<"notes" | "words">(
    () => (sessionStorage.getItem("anren.noteTab") as "notes" | "words") ?? "notes",
  );

  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  const chooseTab = (next: "notes" | "words") => {
    setTab(next);
    sessionStorage.setItem("anren.noteTab", next);
  };

  useEffect(() => {
    if (!note) return;
    setTitleDraft(note.title ?? "");
    setSynthesisDraft(note.synthesis ?? "");
    setBodyDraft(note.body ?? "");
  }, [note?.id, note?.title, note?.synthesis, note?.body]);

  // Title wraps instead of running off-canvas.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [titleDraft, loading]);

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

  // Which threads this note turned out to be part of.
  useEffect(() => {
    if (!note?.id) return;
    let active = true;
    supabase
      .from("threads")
      .select("id, name")
      .eq("status", "active")
      .contains("note_ids", [note.id])
      .then(({ data }) => {
        if (active) setThreads(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [note?.id]);

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
    const saved = await patch({ projectId });
    if (saved) toast.success(projectId ? "Added." : "Removed from project.");
  };

  /** Changing your own words makes the write-up stale, so anren writes it again. */
  const saveBody = async (next: string) => {
    if (!note) return;
    const trimmed = next.trim();
    await patch({ body: next, status: trimmed ? "processing" : note.status });
    if (!trimmed) return;

    setRewriting(true);
    setRelated(null);
    const { error } = await supabase.functions.invoke("process-note", {
      body: { noteId: note.id, regenerate: true },
    });
    setRewriting(false);
    if (error) {
      if (isNeedsKeyError(error)) {
        toast(NEEDS_KEY_MESSAGE);
        reload();
        return;
      }
      await patch({ status: "ready" });
      toast.error("Saved your words, but the write-up didn't refresh.");
      return;
    }
    reload();
  };

  const remove = async () => {
    if (!note) return;
    await softDeleteNote(note, () => reload());
    navigate("/notes");
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

  const dateLine = editingDate ? (
    <input
      type="datetime-local"
      autoFocus
      defaultValue={toLocalInput(note.recordedAt)}
      onBlur={(e) => {
        const next = new Date(e.target.value);
        setEditingDate(false);
        if (!Number.isNaN(next.getTime()) && next.toISOString() !== note.recordedAt) {
          void patch({ recordedAt: next.toISOString() });
        }
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="rounded-full border border-hairline bg-paper px-3 py-1.5 text-[0.8rem] outline-none focus:border-primary/40"
    />
  ) : null;


  const metaSuffix = note.durationSeconds ? ` · ${formatDuration(note.durationSeconds)}` : "";
  const ownWords = note.source === "typed" ? note.body : note.transcript;

  return (
    <article>
      <div className="mb-6 flex items-start justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="-ml-1 flex items-center gap-1 text-[0.95rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
          Notes
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Note options"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-paper-sunk hover:text-foreground"
          >
            <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{folderName ?? "Add to project…"}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {projects.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => moveToFolder(p.id)}>
                    {p.name}
                  </DropdownMenuItem>
                ))}
                {note.projectId && (
                  <DropdownMenuItem onClick={() => moveToFolder(null)}>Remove from project</DropdownMenuItem>
                )}
                {!projects.length && (
                  <DropdownMenuItem disabled>Create a project in the sidebar first</DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => setEditingDate(true)}>Change the date</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={remove}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <textarea
        ref={titleRef}
        value={titleDraft}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={() => {
          const next = titleDraft.trim();
          if (next !== (note.title ?? "")) void patch({ title: next || null });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        rows={1}
        placeholder={note.status === "processing" ? "Writing this up…" : "Untitled note"}
        aria-label="Note title"
        className="w-full resize-none overflow-hidden bg-transparent pr-6 font-editorial text-[1.85rem] font-medium leading-[1.2] tracking-[-0.015em] outline-none placeholder:text-muted-foreground/60"
      />

      {/* Where this note lives in the bigger shape */}
      {(folderName || threads.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {folderName && (
            <Link
              to={`/folder/${note.projectId}`}
              className="rounded-full border border-hairline bg-paper-sunk/60 px-2.5 py-1 text-[0.75rem] text-foreground/80 transition-colors hover:text-foreground"
            >
              {folderName}
            </Link>
          )}
          {threads.map((t) => (
            <Link
              key={t.id}
              to="/"
              className="rounded-full border border-hairline px-2.5 py-1 text-[0.75rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              part of {t.name}
            </Link>
          ))}
        </div>
      )}

      {/* Two views of the same thought */}
      <div className="mt-5 flex items-center gap-7 border-b border-hairline">
        {(
          [
            ["notes", "Notes"],
            ["words", "Your words"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => chooseTab(key)}
            className={cn(
              "-mb-px border-b-2 pb-2.5 text-[0.98rem] transition-colors",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {note.status === "processing" && (
        <div className="mt-7 flex items-center gap-2 text-[0.9rem] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {rewriting
            ? "You changed the words — reading it over again."
            : note.source === "typed"
              ? "Reading this over — it'll fill in."
              : "Transcribing and summarising — this stays open, it'll fill in."}
        </div>
      )}

      {note.status === "needs_key" && (
        <p className="mt-7 text-[0.9rem] leading-relaxed text-muted-foreground">
          Your words are saved. Write-ups are written by Claude —{" "}
          <Link to="/settings/claude" className="text-foreground underline decoration-hairline underline-offset-4">
            connect your own key
          </Link>{" "}
          to keep them coming.
        </p>
      )}

      {note.status === "failed" && (
        <p className="mt-7 text-[0.9rem] text-muted-foreground">
          {note.errorMessage ?? "Something interrupted the write-up."}
        </p>
      )}

      {tab === "notes" ? (
        <section className="mt-7">
          {editingSynthesis ? (
            <textarea
              value={synthesisDraft}
              autoFocus
              onChange={(e) => setSynthesisDraft(e.target.value)}
              onBlur={() => {
                setEditingSynthesis(false);
                if (synthesisDraft !== (note.synthesis ?? "")) void patch({ synthesis: synthesisDraft });
              }}
              rows={Math.max(4, synthesisDraft.split("\n").length + 2)}
              aria-label="Write-up"
              className="w-full resize-none bg-transparent font-editorial text-[1.08rem] leading-[1.62] outline-none"
            />
          ) : note.synthesis ? (
            <button
              onClick={() => setEditingSynthesis(true)}
              title="Edit the write-up"
              className="block w-full cursor-text text-left"
            >
              <Synthesis text={note.synthesis} />
            </button>
          ) : note.status === "ready" ? (
            <p className="text-[0.95rem] text-muted-foreground">Nothing written up for this one yet.</p>
          ) : null}

          {note.synthesis && (
            <p className="mt-8 text-[0.85rem] text-whisper">
              <button
                onClick={() => setEditingDate(true)}
                title="Change the date"
                className="transition-colors hover:text-muted-foreground"
              >
                {stamp(note.recordedAt)}
                {metaSuffix}
              </button>
              {" · cleaned up by anren"}
            </p>
          )}
          {editingDate && <div className="mt-4">{dateLine}</div>}
        </section>
      ) : (
        <section className="mt-7">
          {note.source === "typed" ? (
            <textarea
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              onBlur={() => {
                if (bodyDraft !== (note.body ?? "")) void saveBody(bodyDraft);
              }}
              rows={Math.max(6, bodyDraft.split("\n").length + 2)}
              aria-label="Note body"
              className="w-full resize-none bg-transparent font-editorial text-[1.08rem] italic leading-[1.72] text-foreground/75 outline-none focus:text-foreground"
            />
          ) : note.transcript ? (
            <p className="whitespace-pre-line font-editorial text-[1.08rem] italic leading-[1.72] text-foreground/75">
              {note.transcript}
            </p>
          ) : (
            <p className="text-[0.95rem] text-muted-foreground">No words captured for this one yet.</p>
          )}

          {ownWords && (
            <p className="mt-8 text-[0.85rem] text-whisper">
              <button
                onClick={() => setEditingDate(true)}
                title="Change the date"
                className="transition-colors hover:text-muted-foreground"
              >
                {stamp(note.recordedAt)}
                {metaSuffix}
              </button>
              {" · exactly as you said it"}
            </p>
          )}
          {editingDate && <div className="mt-4">{dateLine}</div>}

          {audioUrl && (
            <audio controls src={audioUrl} className="mt-7 w-full" preload="none">
              <track kind="captions" />
            </audio>
          )}
        </section>
      )}

      {(related?.length || loadingRelated) && (
        <section className="mt-12">
          <h2 className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Related</h2>
          {loadingRelated ? (
            <div className="mt-3 flex items-center gap-2 text-[0.9rem] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Finding earlier notes…
            </div>
          ) : (
            <div className="mt-2 flex flex-col">
              {related?.map((r) => (
                <Link
                  key={r.note_id}
                  to={`/note/${r.note_id}`}
                  className="flex items-baseline justify-between gap-3 border-b border-hairline py-3 last:border-b-0 transition-colors hover:text-foreground"
                >
                  <span className="text-[0.9rem] text-muted-foreground">{r.title ?? "Untitled note"}</span>
                  <span className="shrink-0 text-[0.72rem] uppercase tracking-[0.13em] text-muted-foreground/60">
                    {new Date(r.recorded_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {note.status !== "processing" && <ContinueNote note={note} onDone={reload} />}

      {(note.transcript || note.body) && (
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
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
