import { useNavigate } from "react-router-dom";
import { PROMPT_SETS, PROMPT_SURFACES, type PromptSurface } from "@/lib/prompts";
import { cn } from "@/lib/utils";

interface Props {
  surface: PromptSurface;
  projectId?: string | null;
  className?: string;
}

/**
 * A few quiet ways in, for when a surface has nothing on it yet. Tapping one
 * opens the voice screen with the prompt printed above the transcript — a cue
 * only; it never becomes part of the note.
 */
export function StarterPrompts({ surface, projectId, className }: Props) {
  const navigate = useNavigate();
  if (!PROMPT_SURFACES[surface]) return null;

  const prompts = PROMPT_SETS[surface];
  if (!prompts?.length) return null;

  const open = (prompt: string) => {
    const params = new URLSearchParams({ prompt });
    if (projectId) params.set("folder", projectId);
    navigate(`/capture/voice?${params.toString()}`);
  };

  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {prompts.map((p) => (
        <button
          key={p}
          onClick={() => open(p)}
          className="rounded-full border border-hairline bg-paper/60 px-3.5 py-1.5 text-[0.82rem] leading-snug text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
