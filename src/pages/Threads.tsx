import { Link } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { ThreadCard } from "@/components/ThreadCard";
import { ProjectOverviewCard } from "@/components/ProjectOverviewCard";
import { useThreads } from "@/hooks/useThreads";
import { useProjectOverview } from "@/hooks/useProjectOverview";

const Threads = () => {
  const { threads, noticing, working, notice, dismiss, promote } = useThreads();
  const { overviews, looseCount } = useProjectOverview();

  // Only groupings made of notes that haven't found a home count here.
  const groupings = (threads ?? []).filter(
    (t) => t.notes.filter((n) => !n.projectId).length >= 2,
  );
  const grouped = new Set(
    groupings.flatMap((t) => t.notes.filter((n) => !n.projectId).map((n) => n.id)),
  );
  const ungrouped = Math.max(0, looseCount - grouped.size);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">Threads</h1>
        <div className="mt-1.5 flex items-center gap-3 text-[0.9rem] text-muted-foreground">
          <span>What you have going on in here</span>
          {!noticing && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <button
                onClick={() => notice(true)}
                className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground/80 transition-colors hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                Look again
              </button>
            </>
          )}
        </div>
      </header>

      <section className="mb-12">
        <h2 className="mb-3 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
          Your projects
        </h2>
        {overviews === null ? (
          <p className="text-[0.9rem] text-muted-foreground">Opening…</p>
        ) : overviews.length === 0 ? (
          <p className="max-w-[42ch] text-[0.92rem] leading-relaxed text-muted-foreground">
            Nothing gathered on purpose yet — anren will point out what's clumping together.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {overviews.map((o) => (
              <ProjectOverviewCard key={o.project.id} overview={o} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
          Outside your projects
        </h2>

        {noticing ? (
          <p className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Reading back over your notes…
          </p>
        ) : threads === null ? (
          <p className="text-[0.9rem] text-muted-foreground">Opening…</p>
        ) : looseCount === 0 ? (
          <p className="max-w-[38ch] text-[0.95rem] leading-relaxed text-muted-foreground">
            Everything you've kept has found a home.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {groupings.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                working={working}
                onDismiss={() => dismiss(thread)}
                onPromoted={promote}
              />
            ))}

            {ungrouped > 0 && (
              <div>
                <Link
                  to="/notes"
                  className="font-editorial text-[1.05rem] leading-tight text-foreground/80 transition-opacity hover:opacity-80"
                >
                  {ungrouped} other loose note{ungrouped === 1 ? "" : "s"}
                </Link>
                <p className="mt-1 text-[0.8rem] text-muted-foreground/70">
                  {groupings.length ? "Not enough connection yet." : "Nothing rhyming across these yet."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Threads;
