import { useNavigate, useParams } from "react-router-dom";
import { Mic, Square } from "lucide-react";
import { useRecorder } from "@/contexts/RecorderContext";
import { formatDuration } from "@/lib/wav";
import { cn } from "@/lib/utils";

export function CaptureBar() {
  const { status, elapsed, liveText, level, start, stop } = useRecorder();
  const navigate = useNavigate();
  const params = useParams();
  const folderId = params.projectId ?? null;

  const recording = status === "recording";

  const handleClick = async () => {
    if (status === "idle") {
      await start(folderId);
    } else if (recording) {
      const noteId = await stop();
      if (noteId) navigate(`/note/${noteId}`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto w-full max-w-[720px] px-5 md:px-10 pb-6 md:pl-[calc(248px+2.5rem)] md:max-w-[968px]">
        <div
          className={cn(
            "pointer-events-auto rounded-[22px] border border-hairline bg-paper/95 backdrop-blur-xl transition-all duration-500",
            recording ? "p-5 shadow-lift" : "p-3",
          )}
        >
          {recording && (
            <div className="mb-4 max-h-32 overflow-y-auto">
              <p className="text-[0.92rem] leading-[1.7] text-muted-foreground">
                {liveText || "Listening…"}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleClick}
              disabled={status === "saving"}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className={cn(
                "relative flex items-center justify-center w-12 h-12 rounded-full shrink-0 transition-colors",
                recording ? "bg-primary text-primary-foreground" : "bg-primary/90 text-primary-foreground hover:bg-primary",
                status === "saving" && "opacity-60",
              )}
            >
              {recording && (
                <span
                  className="absolute inset-0 rounded-full bg-primary/25 animate-ripple"
                  style={{ transform: `scale(${1 + level * 1.4})` }}
                />
              )}
              {recording ? (
                <Square className="w-4 h-4 relative" strokeWidth={2} fill="currentColor" />
              ) : (
                <Mic className="w-[19px] h-[19px] relative" strokeWidth={1.6} />
              )}
            </button>

            <div className="min-w-0 flex-1">
              {status === "saving" ? (
                <p className="text-[0.92rem] text-muted-foreground">Saving your note…</p>
              ) : recording ? (
                <p className="text-[0.92rem] tabular-nums text-foreground">{formatDuration(elapsed)}</p>
              ) : (
                <p className="text-[0.92rem] text-muted-foreground">
                  Talk it through. Anren listens and writes it up.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
