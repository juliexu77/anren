import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import type { Thread, ThreadNote } from "@/hooks/useThreads";

const DAY = 24 * 60 * 60 * 1000;

/** A plain read of the shape of this little pile — never a metric. */
function shapeLine(notes: ThreadNote[]) {
  const dates = notes.map((n) => +new Date(n.recordedAt)).sort((a, b) => b - a);
  if (dates.length < 2) return "These seem to belong together";
  const stretch = (dates[0] - dates[dates.length - 1]) / DAY;
  const gap = (dates[0] - dates[1]) / DAY;
  if (gap > 18) return "You came back to this";
  if (stretch > 14) return "These have been accumulating";
  return "These seem to belong together";
}

/**
 * A loose grouping outside your projects: anren has gathered these together
 * provisionally. Lighter than a project on purpose.
 */
export function ThreadCard({
  thread,
  onDismiss,
  onPromoted,
  working,
}: {
  thread: Thread;
  onDismiss: () => void;
  onPromoted: (
    thread: Thread,
    createProject: (name: string) => Promise<{ id: string } | null>,
    existingProjectId?: string,
  ) => Promise<string | null>;
  working: boolean;
}) {
  const { createProject } = useProjects();
  const navigate = useNavigate();

  const loose = thread.notes.filter((n) => !n.projectId);
  if (loose.length < 2) return null;

  const shown = loose.slice(0, 5);
  const rest = loose.length - shown.length;

  const promote = async () => {
    const projectId = await onPromoted(thread, createProject);
    if (!projectId) {
      toast("Couldn't set that up just now.");
      return;
    }
    toast(`${thread.name} is a project now.`, {
      action: { label: "Open", onClick: () => navigate(`/folder/${projectId}`) },
    });
  };

  return (
    <article>
      <h3 className="font-editorial text-[1.1rem] leading-tight tracking-[-0.01em]">
        {thread.name}
        <span className="ml-2 font-sans text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground/60">
          {loose.length} notes
        </span>
      </h3>
      <p className="mt-1 text-[0.8rem] text-muted-foreground/75">{shapeLine(loose)}</p>

      <div className="thread-cluster mt-2.5">
        {shown.map((n) => (
          <Link
            key={n.id}
            to={`/note/${n.id}`}
            className="flex items-baseline justify-between gap-3 py-[0.28rem] transition-colors hover:text-foreground"
          >
            <span className="truncate text-[0.865rem] leading-snug text-foreground/75">
              {n.title ?? "Untitled note"}
            </span>
            <span className="shrink-0 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground/50">
              {new Date(n.recordedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </Link>
        ))}
        {rest > 0 && (
          <p className="py-[0.28rem] text-[0.8rem] text-muted-foreground/60">and {rest} more</p>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-5 pl-4 text-[0.82rem]">
        <button
          onClick={promote}
          disabled={working}
          className="text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          Gather into a project →
        </button>
        <button
          onClick={onDismiss}
          disabled={working}
          className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
        >
          Not this
        </button>
      </div>
    </article>
  );
}
