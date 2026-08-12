import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { useProjectSuggestions } from "@/hooks/useProjectSuggestions";

/**
 * A quiet nudge, never a chore: anren says what it noticed and you either let
 * it stand or wave it away. Notes stay in the feed either way.
 */
export function ProjectSuggestion({ enabled }: { enabled: boolean }) {
  const { suggestion, accept, dismiss, working } = useProjectSuggestions(enabled);
  const { createProject } = useProjects();
  const navigate = useNavigate();

  if (!suggestion) return null;

  const count = suggestion.noteIds.length;
  const existing = suggestion.kind === "existing";

  const onAccept = async () => {
    const projectId = await accept((name) => createProject(name));
    if (!projectId) {
      toast("Couldn't set that up just now.");
      return;
    }
    toast(`${suggestion.name} — anren will keep an eye on it.`, {
      action: { label: "Open", onClick: () => navigate(`/folder/${projectId}`) },
    });
  };

  return (
    <div className="mb-8 rounded-[18px] border border-hairline bg-paper/70 px-5 py-4">
      <p className="font-editorial text-[1.1rem] leading-snug">
        {existing ? `This sounds like ${suggestion.name}` : `These sound like one thing — ${suggestion.name}`}
      </p>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-muted-foreground">
        {suggestion.reason ??
          (existing
            ? `${count} recent note${count === 1 ? "" : "s"} aren't in it yet.`
            : `${count} recent note${count === 1 ? "" : "s"}.`)}
      </p>

      <div className="mt-3 flex items-center gap-4 text-[0.85rem]">
        <button
          onClick={onAccept}
          disabled={working}
          className="underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground disabled:opacity-50"
        >
          {existing ? "Add them" : "Yes, make it"}
        </button>
        <button
          onClick={dismiss}
          disabled={working}
          className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
