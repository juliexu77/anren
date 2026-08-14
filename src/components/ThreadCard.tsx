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

/** Plain count and span — never a metric, never a verdict. */
function countLine(notes: ThreadNote[]) {
  const dates = notes.map((n) => +new Date(n.recordedAt)).sort((a, b) => b - a);
  const count = `${notes.length} thought${notes.length === 1 ? "" : "s"}`;
  if (dates.length < 2) return count;
  const oldest = new Date(dates[dates.length - 1]);
  const spanDays = (dates[0] - dates[dates.length - 1]) / DAY;
  if (spanDays < 9) return `${count} lately`;
  if (spanDays < 40) {
    return `${count} over ${Math.max(2, Math.round(spanDays / 7))} weeks`;
  }
  return `${count} · since ${oldest.toLocaleDateString([], { month: "long" })}`;
}

/**
 * At most one observational line, and only when it names something concrete
 * that literally recurs. Anything reading like a diagnosis is dropped.
 */
function recurringLine(thread: Thread) {
  const phrase = thread.quotes
    .map((q) => q.trim().replace(/^["“']|["”']$/g, ""))
    .filter((q) => q.length >= 8 && q.length <= 60)
    .sort((a, b) => a.length - b.length)[0];
  if (!phrase) return null;
  const lower = phrase.charAt(0).toLowerCase() + phrase.slice(1);
  return `${lower.replace(/[.…]+$/, "")} keeps coming up.`;
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

/** Overlapping paper edges — the pile thickens as you keep talking about it. */
function PaperStack({ count }: { count: number }) {
  const sheets = Math.min(4, Math.max(2, count - 1));
  return (
    <span aria-hidden className="inline-flex shrink-0 items-end">
      {Array.from({ length: sheets }).map((_, i) => (
        <span
          key={i}
          className="h-[13px] w-[10px] rounded-[2px] border border-hairline bg-paper-sunk/70"
          style={{
            marginLeft: i ? "-4px" : 0,
            transform: `rotate(${(i - (sheets - 1) / 2) * 5}deg)`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Something taking shape: anren has noticed these keep rhyming, but nothing has
 * been claimed yet. Lighter than a project on purpose.
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
  const [open, setOpen] = useState(false);
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

  const trail = loose.slice(0, 3).map((n) => n.title ?? "Untitled note");
  const recurring = recurringLine(thread);

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
    <article className={cn(gathering && "motion-safe:animate-gather")}>
      <h3 className="font-editorial text-[1.15rem] leading-tight tracking-[-0.01em]">
        {gathering ?? thread.name}
      </h3>
      <p className="mt-1 text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/60">
        {gathering ? "Gathering these together…" : countLine(loose)}
      </p>

      <div className="mt-2 flex items-center gap-2.5">
        <PaperStack count={loose.length} />
        <p className="min-w-0 truncate text-[0.85rem] text-muted-foreground/75">
          {trail.join(" · ")}
          {loose.length > trail.length && ` · and ${loose.length - trail.length} more`}
        </p>
      </div>

      {recurring && !gathering && (
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-foreground/70">{recurring}</p>
      )}

      {open && (
        <div className="mt-2.5 border-l border-hairline pl-4 motion-safe:animate-fade-in">
          {loose.map((n) => (
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
        </div>
      )}

      {!gathering && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.82rem]">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-muted-foreground/80 transition-colors hover:text-foreground"
          >
            {open ? "Hide the pieces" : "See the pieces →"}
          </button>
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
            {suggestion ? "Make its own project →" : "Make this a project →"}
          </button>
          <button
            onClick={onDismiss}
            disabled={working}
            className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </article>
  );
}
