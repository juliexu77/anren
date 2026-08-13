import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { suggestProjectForThread } from "@/lib/associateNote";
import { cn } from "@/lib/utils";
import type { Thread, ThreadNote } from "@/hooks/useThreads";

const DAY = 24 * 60 * 60 * 1000;
/** How long the notes take to visibly draw together before they're a project. */
const GATHER_MS = 620;
const SUGGEST_KEY = "anren.clusterSuggestions";

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

interface Suggestion {
  projectId: string;
  projectName: string;
}

function readCache(): Record<string, Suggestion | null> {
  try {
    const raw = window.sessionStorage.getItem(SUGGEST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Suggestion | null>) : {};
  } catch {
    return {};
  }
}

function writeCache(threadId: string, value: Suggestion | null) {
  try {
    const next = { ...readCache(), [threadId]: value };
    window.sessionStorage.setItem(SUGGEST_KEY, JSON.stringify(next));
  } catch {
    /* a suggestion is a nicety */
  }
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
  const { createProject, projects } = useProjects();
  const navigate = useNavigate();
  const [gathering, setGathering] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const loose = thread.notes.filter((n) => !n.projectId);

  // Might this pile already belong somewhere? Asked once per visit, quietly.
  useEffect(() => {
    if (!projects.length || loose.length < 2) return;
    const cache = readCache();
    if (thread.id in cache) {
      setSuggestion(cache[thread.id]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const found = await suggestProjectForThread(thread.id);
      const valid = found && projects.some((p) => p.id === found.projectId) ? found : null;
      writeCache(thread.id, valid);
      if (!cancelled) setSuggestion(valid);
    })();
    return () => {
      cancelled = true;
    };
  }, [thread.id, projects, loose.length]);

  if (loose.length < 2) return null;

  const shown = loose.slice(0, 5);
  const rest = loose.length - shown.length;

  const gather = async (existingProjectId?: string, label?: string) => {
    setGathering(label ?? thread.name);
    // Let the pile visibly draw together before it becomes a project.
    await new Promise((r) => window.setTimeout(r, GATHER_MS));
    const projectId = await onPromoted(thread, createProject, existingProjectId);
    if (!projectId) {
      setGathering(null);
      toast("Couldn't set that up just now.");
      return;
    }
    toast(
      existingProjectId
        ? `Added to ${label ?? "that project"}.`
        : `${thread.name} is a project now.`,
      { action: { label: "Open", onClick: () => navigate(`/folder/${projectId}`) } },
    );
  };

  return (
    <article>
      <h3 className="font-editorial text-[1.1rem] leading-tight tracking-[-0.01em]">
        {gathering ?? thread.name}
        <span className="ml-2 font-sans text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground/60">
          {loose.length} notes
        </span>
      </h3>
      <p className="mt-1 text-[0.8rem] text-muted-foreground/75">
        {gathering ? "Gathering these together…" : shapeLine(loose)}
      </p>

      <div className={cn("thread-cluster mt-2.5", gathering && "motion-safe:animate-gather")}>
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

      {!gathering && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 pl-4 text-[0.82rem]">
          {suggestion && (
            <button
              onClick={() => gather(suggestion.projectId, suggestion.projectName)}
              disabled={working}
              className="text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              Add to {suggestion.projectName} →
            </button>
          )}
          <button
            onClick={() => gather()}
            disabled={working}
            className={cn(
              "transition-opacity hover:opacity-80 disabled:opacity-50",
              suggestion ? "text-muted-foreground/80 hover:text-foreground" : "text-primary",
            )}
          >
            {suggestion ? "Start a project instead →" : "Gather into a project →"}
          </button>
          <button
            onClick={onDismiss}
            disabled={working}
            className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
          >
            Not this
          </button>
        </div>
      )}

      <Link
        to={`/reflect?thread=${thread.id}`}
        className="mt-2 inline-block pl-4 text-[0.8rem] italic text-muted-foreground/70 underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
      >
        What's going on in this?
      </Link>
    </article>
  );
}
