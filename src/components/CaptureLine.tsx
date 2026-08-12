import { useNavigate } from "react-router-dom";
import { Mic, PenLine } from "lucide-react";

/**
 * A quiet line printed onto the page — not an input. It only opens the capture
 * state you pick; nothing is typed here.
 */
export function CaptureLine({ projectId }: { projectId?: string | null }) {
  const navigate = useNavigate();
  const suffix = projectId ? `?folder=${projectId}` : "";

  return (
    <div className="mb-6 flex items-center gap-3 border-b border-hairline pb-3">
      <button
        onClick={() => navigate(`/capture/write${suffix}`)}
        className="flex-1 min-w-0 truncate text-left font-editorial text-[1.15rem] italic text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        What's on your mind?
      </button>
      <button
        onClick={() => navigate(`/capture/voice${suffix}`)}
        aria-label="Speak a new thought"
        className="p-1.5 text-muted-foreground/70 transition-colors hover:text-primary"
      >
        <Mic className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>
      <button
        onClick={() => navigate(`/capture/write${suffix}`)}
        aria-label="Write a new thought"
        className="p-1.5 text-muted-foreground/70 transition-colors hover:text-primary"
      >
        <PenLine className="h-[17px] w-[17px]" strokeWidth={1.5} />
      </button>
    </div>
  );
}
