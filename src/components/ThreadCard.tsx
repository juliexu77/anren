import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import type { Thread } from "@/hooks/useThreads";

const DAY = 24 * 60 * 60 * 1000;

/** How long a stretch of days reads out loud. */
function span(days: number) {
  if (days <= 2) return "in the last couple of days";
  if (days <= 9) return "over the last week";
  if (days <= 20) return "over two weeks";
  if (days <= 45) return "over the last month";
  return "over a few months";
}

/** One quiet line about how alive this is — never a metric. */
function aliveness(thread: Thread) {
  const dates = thread.notes.map((n) => +new Date(n.recordedAt)).sort((a, b) => b - a);
  const count = dates.length;
  const stretch = dates.length > 1 ? (dates[0] - dates[dates.length - 1]) / DAY : 0;
  const gap = dates.length > 1 ? (dates[0] - dates[1]) / DAY : 0;
  const sinceLast = (Date.now() - dates[0]) / DAY;

  const tail = `${count} note${count === 1 ? "" : "s"} ${span(stretch)}`;

  if (gap > 18) return `You came back to this after a few weeks · ${tail}`;
  if (sinceLast > 10) return `Quiet for a while now · ${tail}`;
  if (count >= 4 && stretch <= 14) return `Showing up more lately · ${tail}`;
  return tail;
}

export function ThreadCard({
  thread,
  onDismiss,
  onPromoted,
  working,
}: {
  thread: Thread;
  onDismiss: () => void;
  onPromoted: (thread: Thread, createProject: (name: string) => Promise<{ id: string } | null>) => Promise<string | null>;
  working: boolean;
}) {
  const { createProject } = useProjects();
  const navigate = useNavigate();

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
    <article className="border-b border-hairline pb-8 last:border-b-0">
      <h2 className="font-editorial text-[1.45rem] leading-tight tracking-[-0.01em]">{thread.name}</h2>
      <p className="mt-1 text-[0.82rem] text-muted-foreground">{aliveness(thread)}</p>

      {thread.blurb && (
        <p className="mt-3 font-editorial text-[1.02rem] leading-[1.6] text-foreground/85">{thread.blurb}</p>
      )}

      {thread.quotes.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-l border-primary/40 pl-4">
          {thread.quotes.map((quote, i) => (
            <p key={i} className="font-editorial text-[0.98rem] italic leading-[1.6] text-foreground/70">
              “{quote}”
            </p>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col">
        {thread.notes.slice(0, 4).map((n) => (
          <Link
            key={n.id}
            to={`/note/${n.id}`}
            className="flex items-baseline justify-between gap-3 py-1.5 transition-colors hover:text-foreground"
          >
            <span className="truncate text-[0.85rem] text-muted-foreground">{n.title ?? "Untitled note"}</span>
            <span className="shrink-0 text-[0.7rem] uppercase tracking-[0.13em] text-muted-foreground/60">
              {new Date(n.recordedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </Link>
        ))}
        {thread.notes.length > 4 && (
          <p className="py-1.5 text-[0.8rem] text-muted-foreground/70">
            and {thread.notes.length - 4} more
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-5 text-[0.85rem]">
        <button
          onClick={promote}
          disabled={working}
          className="text-primary underline decoration-[0.5px] underline-offset-[3px] transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          Make this a Project
        </button>
        <button
          onClick={onDismiss}
          disabled={working}
          className="text-muted-foreground/70 transition-colors hover:text-foreground disabled:opacity-50"
        >
          Not this
        </button>
      </div>
    </article>
  );
}
