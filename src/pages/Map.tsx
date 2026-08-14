import { Link } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { ThreadCard } from "@/components/ThreadCard";
import { ProjectOverviewCard } from "@/components/ProjectOverviewCard";
import { useThreads } from "@/hooks/useThreads";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { StarterPrompts } from "@/components/StarterPrompts";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3.5 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
    {children}
  </h2>
);

/**
 * Home: one map of your thinking, from loose to claimed. No page title — you
 * open the app and simply see what's taking shape.
 */
const MindMap = () => {
  const { threads, noticing, working, notice, dismiss, promote } = useThreads();
  const { overviews, looseCount, looseRecent } = useProjectOverview();

  // Only groupings made of notes that haven't found a home take shape here.
  const forming = (threads ?? []).filter(
    (t) => t.notes.filter((n) => !n.projectId).length >= 2,
  );

  return (
    <div className="pb-6">
      <section className="mb-14">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <h2 className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
            Taking shape
          </h2>
          {!noticing && (
            <button
              onClick={() => notice(true)}
              className="flex items-center gap-1.5 text-[0.78rem] text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
              Look again
            </button>
          )}
        </div>

        {noticing ? (
          <p className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Reading back over your notes…
          </p>
        ) : threads === null ? (
          <p className="text-[0.9rem] text-muted-foreground">Opening…</p>
        ) : forming.length === 0 ? (
          <div>
            <p className="max-w-[40ch] text-[0.95rem] leading-relaxed text-muted-foreground">
              {looseCount === 0
                ? "Everything you've kept has found a home."
                : "Nothing has started rhyming yet. Keep talking."}
            </p>
            <StarterPrompts surface="threads" className="mt-5 justify-start" />
          </div>
        ) : (
          <div className="flex flex-col gap-11">
            {forming.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                working={working}
                onDismiss={() => dismiss(thread)}
                onPromoted={promote}
              />
            ))}
          </div>
        )}
      </section>

      {overviews !== null && overviews.length > 0 && (
        <section className="mb-14">
          <SectionLabel>Projects</SectionLabel>
          <div className="flex flex-col gap-3">
            {overviews.map((o) => (
              <ProjectOverviewCard key={o.project.id} overview={o} />
            ))}
          </div>
        </section>
      )}

      {looseRecent.length > 0 && (
        <section>
          <SectionLabel>Recently on your mind</SectionLabel>
          <div>
            {looseRecent.map((n) => (
              <Link
                key={n.id}
                to={`/note/${n.id}`}
                className="flex items-baseline justify-between gap-3 py-[0.32rem] transition-colors hover:text-foreground"
              >
                <span className="truncate text-[0.875rem] leading-snug text-foreground/70">
                  {n.title ?? "Untitled note"}
                </span>
                <span className="shrink-0 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground/50">
                  {new Date(n.recordedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
          <Link
            to="/notes"
            className="mt-3 inline-block text-[0.82rem] text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            See all notes →
          </Link>
        </section>
      )}
    </div>
  );
};

export default MindMap;
