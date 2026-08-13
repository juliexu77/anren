import { useNavigate } from "react-router-dom";
import { Mic, PenLine } from "lucide-react";

/**
 * The same compact capture trigger that sits at the top of the Notes tab,
 * centered and a little larger for the blank Home page.
 */
export function HomeCaptureLine({ projectId }: { projectId?: string | null }) {
  const navigate = useNavigate();
  const suffix = projectId ? `?folder=${projectId}` : "";

  return (
    <div className="flex items-center justify-center gap-4 border-b border-hairline pb-3 max-w-[420px] mx-auto">
      <button
        onClick={() => navigate(`/capture/write${suffix}`)}
        className="font-editorial text-[1.35rem] italic text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        What's on your mind?
      </button>
      <button
        onClick={() => navigate(`/capture/voice${suffix}`)}
        aria-label="Speak a new thought"
        className="p-2 text-muted-foreground/70 transition-colors hover:text-primary"
      >
        <Mic className="h-[19px] w-[19px]" strokeWidth={1.5} />
      </button>
      <button
        onClick={() => navigate(`/capture/write${suffix}`)}
        aria-label="Write a new thought"
        className="p-2 text-muted-foreground/70 transition-colors hover:text-primary"
      >
        <PenLine className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>
    </div>
  );
}
