import { Link } from "react-router-dom";
import { FolderMark } from "@/components/folder-glyphs";
import type { ProjectOverview } from "@/hooks/useProjectOverview";

export function ProjectOverviewCard({ overview }: { overview: ProjectOverview }) {
  const { project, count, recent, newSinceLooked } = overview;

  return (
    <article className="rounded-[18px] border border-hairline bg-paper/70 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          to={`/folder/${project.id}`}
          className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <FolderMark value={project.emoji} />
          <h3 className="truncate font-editorial text-[1.15rem] leading-tight tracking-[-0.01em]">
            {project.name}
          </h3>
        </Link>
        <span className="shrink-0 text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground/60">
          {count} note{count === 1 ? "" : "s"}
        </span>
      </div>

      {count === 0 ? (
        <p className="mt-2 text-[0.85rem] text-muted-foreground/70">Nothing in here yet.</p>
      ) : (
        <div className="mt-2.5">
          {recent.map((n) => (
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
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-4 text-[0.8rem]">
        <span className="text-muted-foreground/70">
          {newSinceLooked > 0
            ? `${newSinceLooked} new since you last looked`
            : "\u00a0"}
        </span>
        <Link to={`/folder/${project.id}`} className="text-primary transition-opacity hover:opacity-80">
          Open →
        </Link>
      </div>
    </article>
  );
}
