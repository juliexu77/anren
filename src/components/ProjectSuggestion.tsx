import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { useProjectSuggestions } from "@/hooks/useProjectSuggestions";

/** Say it plainly: how many notes, and where they'd go. */
function effectLine(count: number, existing: boolean, name: string) {
  const notes = `${count} note${count === 1 ? "" : "s"}`;
  return existing ? `Files ${notes} into ${name}.` : `Creates ${name} and files ${notes} into it.`;
}

/**
 * A quiet nudge, never a chore: anren says what it noticed, shows the notes it
 * means, and you either let it stand or wave it away.
 */
export function ProjectSuggestion({
  enabled,
  variant = "card",
}: {
  enabled: boolean;
  variant?: "card" | "rail";
}) {
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

  const titles = (
    <ul className="mt-2 flex flex-col gap-1">
      {suggestion.notes.map((n) => (
        <li key={n.id} className="flex gap-1.5 text-[0.82rem] leading-[1.5]">
          <span className="text-muted-foreground/50">·</span>
          <Link
            to={`/note/${n.id}`}
            className="text-foreground/80 transition-opacity hover:opacity-70"
          >
            {n.title ?? "Untitled"}
          </Link>
        </li>
      ))}
    </ul>
  );

  if (variant === "rail") {
    return (
      <div className="px-3 py-2">
        <p className="font-editorial text-[0.98rem] leading-snug">
          {existing ? `These belong in ${suggestion.name}` : `These sound like one thing — ${suggestion.name}`}
        </p>
        {titles}
        <div className="mt-2 flex items-center gap-3 text-[0.8rem]">
          <button
            onClick={onAccept}
            disabled={working}
            className="text-primary underline decoration-[0.5px] underline-offset-[3px] transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {existing ? "Add them" : "Make it"}
          </button>
          <button
            onClick={dismiss}
            disabled={working}
            className="text-muted-foreground/70 transition-colors hover:text-foreground disabled:opacity-50"
          >
            Not now
          </button>
        </div>
        <p className="mt-1 text-[0.74rem] leading-[1.45] text-muted-foreground/60">
          {effectLine(count, existing, suggestion.name)}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-[18px] border border-hairline bg-paper/70 px-5 py-4">
      <p className="font-editorial text-[1.1rem] leading-snug">
        {existing ? `These belong in ${suggestion.name}` : `These sound like one thing — ${suggestion.name}`}
      </p>
      {titles}

      <div className="mt-3 flex items-center gap-4 text-[0.85rem]">
        <button
          onClick={onAccept}
          disabled={working}
          className="text-primary underline decoration-[0.5px] underline-offset-[3px] transition-opacity hover:opacity-80 disabled:opacity-50"
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
      <p className="mt-1.5 text-[0.76rem] leading-[1.45] text-muted-foreground/60">
        {effectLine(count, existing, suggestion.name)}
      </p>
    </div>
  );
}
