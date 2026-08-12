import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mic, PenLine } from "lucide-react";
import { useRecordingRecovery } from "@/hooks/useRecordingRecovery";

/** How long the quiet confirmation lingers before the page goes blank again. */
const CONFIRM_MS = 4200;

/**
 * The blank page: one soft line and two ways in — speak it, or write it.
 * Both open their own focused capture state; nothing is composed here.
 */
export function CaptureSurface() {
  const { session: recovered, busy, keep, discard } = useRecordingRecovery();
  const navigate = useNavigate();
  const location = useLocation();
  const keptFromState = (location.state as { kept?: string } | null)?.kept ?? null;
  const [kept, setKept] = useState<string | null>(keptFromState);

  useEffect(() => {
    if (keptFromState) setKept(keptFromState);
  }, [keptFromState]);

  useEffect(() => {
    if (!kept) return;
    const t = window.setTimeout(() => setKept(null), CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [kept]);

  return (
    <div className="w-full">
      {recovered && (
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

      <div className="min-h-[3.5rem] text-center">
        {kept ? (
          <p className="text-[0.95rem] text-muted-foreground motion-safe:animate-fade-in">
            Kept it.{" "}
            <Link
              to={`/note/${kept}`}
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

      <div className="mt-10 flex flex-col items-center gap-4">
        <button
          onClick={() => navigate("/capture/voice")}
          aria-label="Speak a new thought"
          className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <Mic className="h-8 w-8" strokeWidth={1.4} />
        </button>
        <p className="text-[0.8rem] uppercase tracking-[0.16em] text-muted-foreground/70">Speak it</p>

        <button
          onClick={() => navigate("/capture/write")}
          className="mt-4 flex items-center gap-2 text-[0.92rem] italic text-muted-foreground underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
        >
          <PenLine className="h-[15px] w-[15px]" strokeWidth={1.5} />
          or write it instead
        </button>
      </div>
    </div>
  );
}
