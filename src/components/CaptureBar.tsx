import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, Square, ArrowUp, Loader2 } from "lucide-react";
import { useRecorder } from "@/contexts/RecorderContext";
import { useRecordingRecovery } from "@/hooks/useRecordingRecovery";
import { useTextCapture } from "@/hooks/useTextCapture";
import { toast } from "sonner";
import { formatDuration } from "@/lib/wav";
import { cn } from "@/lib/utils";

const MAX_TEXTAREA_H = 140;

export function CaptureBar() {
  const { status, elapsed, liveText, level, start, stop, cancel } = useRecorder();
  const { session: recovered, busy, keep, discard } = useRecordingRecovery();
  const navigate = useNavigate();
  const { save, saving } = useTextCapture();

  const params = useParams();
  const folderId = params.projectId ?? null;

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recording = status === "recording";
  const hasText = text.trim().length > 0;

  // The composer grows (recovery card, live transcript, pasted text), so publish
  // its real height and let the page reserve exactly that much room.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty("--capture-bar-h", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-grow the textarea up to a ceiling, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_H)}px`;
  }, [text]);

  const handleMic = async () => {
    if (status === "idle") {
      await start(folderId);
    } else if (recording) {
      const noteId = await stop();
      if (noteId) navigate(`/note/${noteId}`);
    }
  };

  const saveText = async () => {
    const body = text.trim();
    if (!user || !body || saving) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        project_id: folderId,
        source: "typed",
        body,
        transcript: body,
        recorded_at: new Date().toISOString(),
        status: "processing",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      toast.error("Couldn't keep that note.");
      return;
    }

    supabase.functions.invoke("process-note", { body: { noteId: data.id } }).then(({ error: fnError }) => {
      if (fnError) console.error("process-note failed:", fnError.message);
      else associateNote(data.id);
    });

    setText("");
    textareaRef.current?.blur();
    toast.success("Kept it.");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div
        ref={barRef}
        className="mx-auto w-full max-w-[720px] px-5 md:px-10 md:pl-[calc(248px+2.5rem)] md:max-w-[968px]"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {recovered && !recording && (
          <div className="pointer-events-auto mb-3 rounded-[18px] border border-hairline bg-paper p-4 animate-fade-up">
            <p className="text-[0.92rem] leading-[1.6] text-foreground">
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
                className="text-[0.85rem] text-primary hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {busy ? "Keeping…" : "Keep it"}
              </button>
              <button
                onClick={() => void discard()}
                disabled={busy}
                className="text-[0.85rem] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            "pointer-events-auto rounded-[26px] border border-hairline bg-paper transition-all duration-300",
            recording ? "px-4 pt-4 pb-3" : "px-2.5 py-2",
          )}
        >
          {recording && (
            <div className="mb-3 max-h-32 overflow-y-auto">
              <p className="text-[0.92rem] leading-[1.7] text-muted-foreground">
                {liveText || "Listening…"}
              </p>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={hasText && !recording ? saveText : handleMic}
              disabled={status === "saving" || saving}
              aria-label={
                recording ? "Stop recording" : hasText ? "Save note" : "Start recording"
              }
              className={cn(
                "relative flex items-center justify-center w-[50px] h-[50px] min-h-[44px] min-w-[44px] shrink-0 rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                (status === "saving" || saving) && "opacity-60",
              )}
            >
              {recording && (
                <span
                  className="absolute inset-0 rounded-full bg-primary/25 animate-ripple"
                  style={{ transform: `scale(${1 + level * 1.4})` }}
                />
              )}
              {saving ? (
                <Loader2 className="w-[19px] h-[19px] relative animate-spin" strokeWidth={1.6} />
              ) : recording ? (
                <Square className="w-4 h-4 relative" strokeWidth={2} fill="currentColor" />
              ) : hasText ? (
                <ArrowUp className="w-[20px] h-[20px] relative" strokeWidth={1.8} />
              ) : (
                <Mic className="w-[20px] h-[20px] relative" strokeWidth={1.6} />
              )}
            </button>

            {recording || status === "saving" ? (
              <div className="min-w-0 flex-1 pb-3 pl-1">
                {status === "saving" ? (
                  <p className="text-[0.92rem] text-muted-foreground">Saving your note…</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-[0.92rem] tabular-nums text-foreground">{formatDuration(elapsed)}</p>
                    <button
                      onClick={cancel}
                      className="text-[0.82rem] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
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
                className="min-w-0 flex-1 resize-none bg-transparent px-2 py-3 text-[0.95rem] leading-[1.55] outline-none placeholder:text-muted-foreground/70"
                style={{ maxHeight: MAX_TEXTAREA_H }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
