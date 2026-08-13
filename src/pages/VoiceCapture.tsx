import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRecorder } from "@/contexts/RecorderContext";
import { NoticingBeat } from "@/components/NoticingBeat";
import { landingLine, noticeNote, type NoticeStage } from "@/lib/noticing";
import { formatDuration } from "@/lib/wav";
import { cn } from "@/lib/utils";

const BARS = 21;
/** How long the last line sits there before the screen lets go. */
const HOLD_MS = 1400;

/** A private room: time, a little movement, and what you're saying. */
const VoiceCapture = () => {
  const { status, elapsed, liveText, level, start, stop, cancel } = useRecorder();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const folderId = params.get("folder");
  const began = useRef(false);
  const [stage, setStage] = useState<NoticeStage | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);

  useEffect(() => {
    if (began.current) return;
    began.current = true;
    if (status === "idle") void start(folderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    const { noteId, openId } = await stop({ deferWriteUp: true });
    if (!noteId) {
      navigate("/notes");
      return;
    }

    setStage("writing");
    const noticed = await noticeNote(noteId, setStage);
    setTitle(noticed.title);
    const line = landingLine(noticed.landing);
    setLanded(line);

    const land = () =>
      navigate("/capture", {
        state: {
          kept: openId ?? noteId,
          filedInto: noticed.landing.projectId,
          filedIntoName: noticed.landing.projectName,
        },
      });

    if (line) window.setTimeout(land, HOLD_MS);
    else land();
  };

  const leave = () => {
    cancel();
    navigate(-1);
  };

  const saving = status === "saving" || stage !== null;
  const noticing = stage !== null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
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
        {noticing ? (
          <NoticingBeat stage={stage} title={title} landing={landed} />
        ) : (
          <p
            className={cn(
              "mx-auto max-w-[36ch] font-editorial text-[1.35rem] leading-[1.7]",
              liveText ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {status === "saving" ? "anren is keeping it…" : liveText || "Listening…"}
          </p>
        )}
      </div>

      <div className="flex justify-center px-6 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))]">
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
