import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import type { Thread } from "@/hooks/useThreads";

const DAY = 24 * 60 * 60 * 1000;

/** One short line: how many, and how alive — never a metric dashboard. */
function countLine(thread: Thread) {
  const dates = thread.notes.map((n) => +new Date(n.recordedAt)).sort((a, b) => b - a);
  const count = dates.length;
  const noun = `${count} note${count === 1 ? "" : "s"}`;
  if (!count) return noun;

  const stretch = count > 1 ? (dates[0] - dates[count - 1]) / DAY : 0;
  const gap = count > 1 ? (dates[0] - dates[1]) / DAY : 0;
  const sinceLast = (Date.now() - dates[0]) / DAY;

  if (gap > 18) return `${noun} · back again`;
  if (sinceLast > 14) return `${noun} · quiet lately`;
  if (count >= 4 && stretch <= 14) return `${noun} · active lately`;
  if (count >= 3 && sinceLast <= 7) return `${noun} · growing`;
  return noun;
}

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
  const { createProject, projects } = useProjects();
  const navigate = useNavigate();

  // If most of this grouping already sits in one project, say so instead of
  // offering to make a second one.
  const tally = new Map<string, number>();
  for (const n of thread.notes) {
    if (n.projectId) tally.set(n.projectId, (tally.get(n.projectId) ?? 0) + 1);
  }
  let homeId: string | null = null;
  for (const [id, n] of tally) {
    if (n >= 2 && n >= (tally.get(homeId ?? "") ?? 0)) homeId = id;
  }
  const home = homeId ? projects.find((p) => p.id === homeId) : undefined;
  const unfiled = home ? thread.notes.filter((n) => n.projectId !== home.id).length : 0;

  const shown = thread.notes.slice(0, 5);
  const rest = thread.notes.length - shown.length;

  const promote = async () => {
    const projectId = await onPromoted(thread, createProject, home?.id);
    if (!projectId) {
      toast("Couldn't set that up just now.");
      return;
    }
    toast(home ? `Filed into ${home.name}.` : `${thread.name} is a project now.`, {
      action: { label: "Open", onClick: () => navigate(`/folder/${projectId}`) },
    });
  };

  return (
    <article>
      <h2 className="font-editorial text-[1.22rem] leading-tight tracking-[-0.01em]">{thread.name}</h2>
      <p className="mt-1 text-[0.78rem] text-muted-foreground/80">{countLine(thread)}</p>

      <div className="thread-cluster mt-3">
        {shown.map((n) => (
          <Link
            key={n.id}
            to={`/note/${n.id}`}
            className="flex items-baseline justify-between gap-3 py-[0.3rem] transition-colors hover:text-foreground"
          >
            <span className="truncate text-[0.875rem] leading-snug text-foreground/75">
              {n.title ?? "Untitled note"}
            </span>
            <span className="shrink-0 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground/50">
              {new Date(n.recordedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </Link>
        ))}
        {rest > 0 && (
          <p className="py-[0.3rem] text-[0.8rem] text-muted-foreground/60">and {rest} more</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-5 pl-4 text-[0.82rem]">
        {home && unfiled === 0 ? (
          <Link
            to={`/folder/${home.id}`}
            className="text-muted-foreground/80 transition-colors hover:text-foreground"
          >
            Already a Project · {home.name}
          </Link>
        ) : (
          <button
            onClick={promote}
            disabled={working}
            className="text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {home
              ? `Already a Project · Add ${unfiled} note${unfiled === 1 ? "" : "s"} →`
              : "Gather into Project →"}
          </button>
        )}
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
