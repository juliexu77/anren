import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTextCapture } from "@/hooks/useTextCapture";
import { NoticingBeat } from "@/components/NoticingBeat";
import { landingLine, noticeNote, type NoticeStage } from "@/lib/noticing";

/** How long the last line sits there before the screen lets go. */
const HOLD_MS = 1400;

/** A blank sheet, not a chat box. */
const WriteCapture = () => {
  const { save, saving } = useTextCapture();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const folderId = params.get("folder");
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const [stage, setStage] = useState<NoticeStage | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [landed, setLanded] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const keep = async () => {
    const noteId = await save(text, folderId);
    if (!noteId) {
      toast("Couldn't keep that just now.");
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
          kept: noteId,
          filedInto: noticed.landing.projectId,
          filedIntoName: noticed.landing.projectName,
        },
      });

    if (line) window.setTimeout(land, HOLD_MS);
    else land();
  };

  const noticing = stage !== null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate(-1)}
          disabled={noticing}
          className="text-[0.9rem] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          Cancel
        </button>
        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
          New thought
        </span>
        <button
          onClick={keep}
          disabled={!text.trim() || saving || noticing}
          className="flex items-center gap-1.5 text-[0.9rem] text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {(saving || noticing) && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />}
          Keep
        </button>
      </div>

      {noticing ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <NoticingBeat stage={stage} title={title} landing={landed} />
        </div>
      ) : (
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void keep();
            }
          }}
          aria-label="Type or paste your thought"
          placeholder="Type it, or paste it from wherever it lives…"
          className="mx-auto mt-8 w-full max-w-[640px] flex-1 resize-none bg-transparent px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-[1.05rem] leading-[1.75] outline-none placeholder:text-muted-foreground/60"
        />
      )}
    </div>
  );
};

export default WriteCapture;
