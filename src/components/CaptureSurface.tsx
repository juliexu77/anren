import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, Square, ArrowUp, Loader2 } from "lucide-react";
import { useRecorder } from "@/contexts/RecorderContext";
import { useRecordingRecovery } from "@/hooks/useRecordingRecovery";
import { useTextCapture } from "@/hooks/useTextCapture";
import { useProjects } from "@/hooks/useProjects";
import { formatDuration } from "@/lib/wav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_TEXTAREA_H = 180;
/** How long the quiet confirmation lingers before the page goes blank again. */
const CONFIRM_MS = 4200;

type Kept = { noteId: string; projectName: string | null };

/**
 * The blank page: one soft line, a large mic, and a field that makes it plain
 * you can type instead. After a capture it says so briefly, then empties again.
 */
export function CaptureSurface() {
  const { status, elapsed, liveText, level, start, stop, cancel } = useRecorder();
  const { session: recovered, busy, keep, discard } = useRecordingRecovery();
  const { save, saving } = useTextCapture();
  const { projects } = useProjects();
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [kept, setKept] = useState<Kept | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recording = status === "recording";
  const writingUp = status === "saving" || saving;
  const hasText = text.trim().length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_H)}px`;
  }, [text]);

  useEffect(() => {
    if (!kept) return;
    const t = window.setTimeout(() => setKept(null), CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [kept]);

  const announce = (noteId: string, filedInto: Promise<string | null>) => {
    setKept({ noteId, projectName: null });
    void filedInto.then((projectId) => {
      if (!projectId) return;
      const name = projects.find((p) => p.id === projectId)?.name ?? null;
      setKept((current) =>
        current && current.noteId === noteId ? { ...current, projectName: name } : current,
      );
    });
  };

  const handleMic = async () => {
    if (status === "idle") {
      setKept(null);
      await start(null);
    } else if (recording) {
      const noteId = await stop();
      if (noteId) announce(noteId, Promise.resolve(null));
    }
  };

  const saveText = async () => {
    const result = await save(text, null);
    if (!result) {
      toast("Couldn't keep that just now.");
      return;
    }
    setText("");
    textareaRef.current?.blur();
    announce(result.noteId, result.filedInto);
  };

  return (
    <div className="w-full">
      {recovered && !recording && (
        <div className="mb-6 rounded-[18px] border border-hairline bg-paper px-5 py-4 animate-fade-up">
          <p className="text-[0.92rem] leading-[1.6]">
            You were part-way through something — keep it?
          </p>
          {recovered.liveText && (
            <p className="mt-1.5 text-[0.85rem] leading-[1.6] text-muted-foreground line-clamp-2">
              {recovered.liveText}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={async () => {
                const noteId = await keep();
                if (noteId) navigate(`/note/${noteId}`);
              }}
              disabled={busy}
              className="text-[0.85rem] text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {busy ? "Keeping…" : "Keep it"}
            </button>
            <button
              onClick={() => void discard()}
              disabled={busy}
              className="text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* The one soft line — or, once you're speaking, what you're saying. */}
      <div className="min-h-[3.5rem] text-center">
        {recording ? (
          <p className="mx-auto max-h-40 max-w-[36ch] overflow-y-auto font-editorial text-[1.2rem] leading-[1.65] text-muted-foreground motion-safe:animate-fade-in">
            {liveText || "Listening…"}
          </p>
        ) : writingUp ? (
          <p className="flex items-center justify-center gap-2 text-[0.95rem] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
            anren is writing it up…
          </p>
        ) : kept ? (
          <p className="text-[0.95rem] text-muted-foreground motion-safe:animate-fade-in">
            Kept it{kept.projectName ? ` in ${kept.projectName}` : ""}.{" "}
            <Link
              to={`/note/${kept.noteId}`}
              className="italic underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
            >
              open it
            </Link>
          </p>
        ) : (
          <p className="font-editorial text-[1.55rem] leading-snug tracking-[-0.01em]">
            What's on your mind?
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center">
        <button
          onClick={hasText && !recording ? saveText : handleMic}
          disabled={writingUp}
          aria-label={recording ? "Stop recording" : hasText ? "Keep this note" : "Start recording"}
          className={cn(
            "relative flex h-[92px] w-[92px] items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background",
            writingUp && "opacity-60",
          )}
        >
          {recording && (
            <span
              className="absolute inset-0 rounded-full bg-primary/20 animate-ripple"
              style={{ transform: `scale(${1 + level * 1.4})` }}
            />
          )}
          {writingUp ? (
            <Loader2 className="relative h-7 w-7 animate-spin" strokeWidth={1.5} />
          ) : recording ? (
            <Square className="relative h-6 w-6" strokeWidth={2} fill="currentColor" />
          ) : hasText ? (
            <ArrowUp className="relative h-8 w-8" strokeWidth={1.6} />
          ) : (
            <Mic className="relative h-8 w-8" strokeWidth={1.4} />
          )}
        </button>

        {recording ? (
          <div className="mt-6 flex items-center gap-4">
            <p className="text-[0.95rem] tabular-nums">{formatDuration(elapsed)}</p>
            <button
              onClick={cancel}
              className="text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-[520px] rounded-[24px] border border-hairline bg-paper px-4 py-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void saveText();
                }
              }}
              rows={1}
              aria-label="Type or copy/paste from elsewhere"
              placeholder="Type or copy/paste from elsewhere…"
              className="w-full resize-none bg-transparent px-1 py-3 text-[0.95rem] leading-[1.55] outline-none placeholder:text-muted-foreground/70"
              style={{ maxHeight: MAX_TEXTAREA_H }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
