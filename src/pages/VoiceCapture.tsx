import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useRecorder } from "@/contexts/RecorderContext";
import { formatDuration } from "@/lib/wav";
import { cn } from "@/lib/utils";

const BARS = 21;

/** A private room: time, a little movement, and what you're saying. */
const VoiceCapture = () => {
  const { status, elapsed, liveText, level, start, stop, cancel } = useRecorder();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const folderId = params.get("folder");
  const prompt = params.get("prompt");
  const continues = params.get("continues");
  const began = useRef(false);

  useEffect(() => {
    if (began.current) return;
    began.current = true;
    if (status === "idle") {
      void start(folderId, continues);
      if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Medium });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light });
    // The words are already written down — nothing to wait around for. anren
    // finishes the write-up on its own while you carry on.
    const { noteId, openId } = await stop();
    if (continues && openId) {
      navigate(`/note/${openId}`, { replace: true });
    } else if (noteId) {
      navigate("/capture", { state: { kept: openId ?? noteId } });
    } else {
      navigate("/notes");
    }
  };

  const leave = () => {
    if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light });
    cancel();
    if (continues) {
      navigate(`/note/${continues}`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const saving = status === "saving";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]">
        <button
          onClick={leave}
          disabled={saving}
          className="text-[0.9rem] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Cancel
        </button>
        <p className="text-[0.95rem] tabular-nums text-foreground">{formatDuration(elapsed)}</p>
        <span className="w-[3.5rem]" />
      </div>

      <div className="mt-8 flex items-end justify-center gap-[3px] h-8">
        {Array.from({ length: BARS }).map((_, i) => {
          const centre = 1 - Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2);
          const h = 3 + level * 44 * (0.35 + centre * 0.9) * (0.6 + ((i * 37) % 11) / 11);
          return (
            <span
              key={i}
              className="w-[3px] rounded-full bg-primary/70 transition-[height] duration-100"
              style={{ height: `${Math.min(32, Math.max(3, h))}px` }}
            />
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-10">
        <>
            {prompt && !liveText && status !== "saving" && (
              <div className="mx-auto mb-6 max-w-[36ch] text-center">
                <p className="font-editorial text-[1.05rem] italic leading-[1.6] text-muted-foreground/80">
                  {prompt}
                </p>
                <button
                  onClick={() => {
                    cancel();
                    const p = new URLSearchParams({ prompt });
                    if (folderId) p.set("folder", folderId);
                    if (continues) p.set("continues", continues);
                    navigate(`/capture/write?${p.toString()}`, { replace: true });
                  }}
                  className="mt-2 text-[0.78rem] text-muted-foreground/70 underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
                >
                  write it instead
                </button>
              </div>
            )}
            <p
              className={cn(
                "mx-auto max-w-[36ch] font-editorial text-[1.35rem] leading-[1.7]",
                liveText ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {status === "saving"
                ? continues
                  ? "Keeping this with your note…"
                  : "anren is keeping it…"
                : liveText || "Listening…"}
            </p>
        </>
      </div>


      <div className="flex justify-center px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
        <button
          onClick={finish}
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-[0.95rem] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
          {saving ? "Keeping it…" : "Keep it"}
        </button>
      </div>
    </div>
  );
};

export default VoiceCapture;
