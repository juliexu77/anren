import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderMark } from "@/components/folder-glyphs";
import { markProjectLooked, type ProjectOverview } from "@/hooks/useProjectOverview";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const EXPANDED_KEY = "anren.mapExpandedProjects";

function readExpanded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeExpanded(id: string, value: boolean) {
  try {
    const next = { ...readExpanded(), [id]: value };
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(next));
  } catch {
    /* fine */
  }
}

export function ProjectOverviewCard({ overview }: { overview: ProjectOverview }) {
  const { project, count, recent, newSinceLooked, lastActivityAt } = overview;
  const [expanded, setExpanded] = useState(() => readExpanded()[project.id] ?? false);
  const seen = () => markProjectLooked(project.id);
  const active = lastActivityAt > 0 && Date.now() - lastActivityAt < WEEK;
  const isEmpty = count === 0;

  useEffect(() => {
    writeExpanded(project.id, expanded);
  }, [project.id, expanded]);

  const toggle = () => {
    if (!isEmpty) setExpanded((v) => !v);
  };

  return (
    <article className="rounded-[18px] border border-hairline bg-paper/70 px-5 py-4">
      <button
        onClick={toggle}
        disabled={isEmpty}
        className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-left"
      >
        <span className="flex min-w-0 max-w-full items-center gap-2 sm:max-w-[70%]">
          {newSinceLooked > 0 && (
            <span
              aria-hidden
              className="h-[6px] w-[6px] shrink-0 rounded-full bg-primary"
            />
          )}
          <FolderMark value={project.emoji} />
          <h3 className="truncate font-editorial text-[1.15rem] leading-tight tracking-[-0.01em]">
            {project.name}
          </h3>
        </span>
        <span className="flex items-center gap-2">
          {active && (
            <span className="text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground/60">
              Active this week
            </span>
          )}
          {!isEmpty && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              strokeWidth={1.5}
            />
          )}
        </span>
      </button>

      {isEmpty ? (
        <p className="mt-2 text-[0.85rem] text-muted-foreground/70">Nothing in here yet.</p>
      ) : expanded ? (
        <>
          <div className="mt-2.5">
            {recent.map((n) => (
              <Link
                key={n.id}
                to={`/note/${n.id}`}
                onClick={seen}
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
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-4 text-[0.8rem]">
            <span className="text-muted-foreground/70">
              {newSinceLooked > 0
                ? `${newSinceLooked} new since you last looked`
                : "\u00a0"}
            </span>
            <Link
              to={`/folder/${project.id}`}
              onClick={seen}
              className="text-primary transition-opacity hover:opacity-80"
            >
              Open →
            </Link>
          </div>
        </>
      ) : null}
    </article>
  );
}
