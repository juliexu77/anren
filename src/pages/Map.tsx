import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThreadCard } from "@/components/ThreadCard";
import { ProjectOverviewCard } from "@/components/ProjectOverviewCard";
import { useThreads } from "@/hooks/useThreads";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import { StarterPrompts } from "@/components/StarterPrompts";
import { HomeNote } from "@/components/HomeNote";

const SECTIONS_KEY = "anren.mapSections";

function readExpanded(): { takingShape?: boolean } {
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    return raw ? (JSON.parse(raw) as { takingShape?: boolean }) : {};
  } catch {
    return {};
  }
}

function writeExpanded(patch: { takingShape?: boolean }) {
  try {
    const next = { ...readExpanded(), ...patch };
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
  } catch {
    /* fine */
  }
}

const SectionHeader = ({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) => (
  <AccordionTrigger className="group flex w-full items-baseline justify-between gap-3 py-0 text-left hover:no-underline">
    <span className="flex items-baseline gap-2">
      <h2 className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
        {children}
      </h2>
      {typeof count === "number" && count > 0 && (
        <span className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/50">
          {count}
        </span>
      )}
    </span>
    <ChevronDown
      className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180"
      strokeWidth={1.5}
    />
  </AccordionTrigger>
);

/**
 * Home: one map of your thinking, from loose to claimed. No page title — you
 * open the app and simply see what's taking shape.
 */
const MindMap = () => {
  const { threads, noticing, working, notice, dismiss, promote } = useThreads();
  const { overviews, looseCount, looseRecent } = useProjectOverview();
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const saved = readExpanded();
    setExpanded(saved.takingShape !== false ? ["taking-shape"] : []);
  }, []);

  const onValueChange = (value: string[]) => {
    setExpanded(value);
    writeExpanded({ takingShape: value.includes("taking-shape") });
  };

  // Only groupings made of notes that haven't found a home take shape here.
  const forming = (threads ?? []).filter(
    (t) => t.notes.filter((n) => !n.projectId).length >= 2,
  );

  return (
    <div className="pb-6">
      <HomeNote />
      <Accordion
        type="multiple"
        value={expanded}
        onValueChange={onValueChange}
        className="space-y-14"
      >
        <AccordionItem value="taking-shape" className="border-0">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <SectionHeader count={forming.length}>Taking shape</SectionHeader>
            {!noticing && (
              <button
                onClick={() => notice(true)}
                className="flex shrink-0 items-center gap-1.5 text-[0.78rem] text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                Look again
              </button>
            )}
          </div>

          <AccordionContent className="pb-0 pt-0">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {overviews !== null && overviews.length > 0 && (
        <section className="mt-14">
          <div className="mb-3.5 flex items-baseline gap-2">
            <h2 className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              Projects
            </h2>
            <span className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/50">
              {overviews.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {overviews.map((o) => (
              <ProjectOverviewCard key={o.project.id} overview={o} />
            ))}
          </div>
        </section>
      )}

      {looseRecent.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-3.5 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
            Recently on your mind
          </h2>
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
