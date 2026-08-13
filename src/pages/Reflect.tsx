import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useLookBack } from "@/hooks/useLookBack";
import { useThreads } from "@/hooks/useThreads";
import { AskNotes } from "@/components/AskNotes";
import { ProjectSuggestion } from "@/components/ProjectSuggestion";
import { useNotes } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

/** Reads as continuous attention rather than a report you asked for. */
function watchedLine(updatedAt: string) {
  const then = new Date(updatedAt);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 90) return "Updated just after your last note";
  const hours = Math.round(mins / 60);
  if (hours < 12) return "Updated after your note this morning";
  if (hours < 36) return "Updated after your notes yesterday";
  return `Last read back ${then.toLocaleDateString([], { weekday: "long" })}`;
}

const Reflect = () => {
  const { digest, loading, generating, weekStart, generate, readyForFirst } = useLookBack();
  const { notes, loading: notesLoading } = useNotes(null);
  const { threads } = useThreads();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(false);

  const scopedId = params.get("thread");
  const scoped = scopedId ? (threads ?? []).find((t) => t.id === scopedId) : undefined;

  const weekLabel = new Date(`${weekStart}T00:00:00`).toLocaleDateString([], {
    month: "long",
    day: "numeric",
  });

  const lookAgain = async () => {
    try {
      await generate();
    } catch {
      toast("Couldn't look back just now.");
    }
  };

  // Scoped read: one thread, one lens, nothing else in the way.
  if (scopedId) {
    return (
      <div>
        <header className="mb-8">
          <Link
            to="/threads"
            className="text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Threads
          </Link>
          <h1 className="mt-2 font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">
            {scoped?.name ?? "This thread"}
          </h1>
          {scoped?.blurb && (
            <p className="mt-1.5 max-w-[46ch] text-[0.92rem] leading-relaxed text-muted-foreground">
              {scoped.blurb}
            </p>
          )}
        </header>

        {scoped ? (
          <AskNotes scope={{ name: scoped.name, noteIds: scoped.notes.map((n) => n.id) }} />
        ) : (
          <p className="text-[0.9rem] text-muted-foreground">
            That grouping isn't here anymore. <Link to="/reflect" className="underline decoration-hairline underline-offset-4">Read the week instead</Link>.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">Reflect</h1>
        <div className="mt-1.5 flex items-center gap-3 text-[0.9rem] text-muted-foreground">
          <span>Week of {weekLabel}</span>
          {digest && !generating && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[0.82rem] text-muted-foreground/70">
                {watchedLine(digest.updatedAt)}
              </span>
            </>
          )}
        </div>
      </header>

      {loading ? (
        <p className="text-[0.9rem] text-muted-foreground">Looking back over the week…</p>
      ) : generating ? (
        <p className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Reading back your week…
        </p>
      ) : !digest ? (
        <div className="rounded-[20px] border border-hairline bg-paper/70 px-6 py-10 text-center">
          <p className="font-editorial text-[1.2rem] leading-snug">Nothing pulled together yet.</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
            {readyForFirst
              ? "anren will read this week back shortly."
              : "Once you've left a few notes this week, anren reads them back on its own and says what's moving."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* What changed, named the way Threads names it. */}
          {digest.movements.length > 0 && (
            <section>
              <h2 className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
                What moved
              </h2>
              <div className="mt-3 flex flex-col gap-3.5">
                {digest.movements.map((m) => (
                  <p key={m.name} className="max-w-[52ch] text-[0.95rem] leading-relaxed">
                    <span className="font-editorial text-[1.05rem]">{m.name}</span>
                    <span className="text-muted-foreground"> — {m.moved}</span>
                  </p>
                ))}
              </div>
            </section>
          )}

          {digest.tension && (
            <section className="border-l-2 border-primary/50 pl-5">
              <h2 className="text-[0.68rem] uppercase tracking-[0.16em] text-primary/80">
                Pulling against each other
              </h2>
              <p className="mt-2 max-w-[48ch] font-editorial text-[1.15rem] leading-[1.6]">
                {digest.tension}
              </p>
            </section>
          )}

          <div>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex items-center gap-2 text-[0.9rem] italic underline decoration-[0.5px] underline-offset-[3px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Read this week back
              <ChevronDown
                className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")}
                strokeWidth={1.5}
              />
            </button>

            {open && (
              <>
                <ul className="mt-4 flex max-w-[52ch] flex-col gap-3 motion-safe:animate-fade-in">
                  {digest.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="font-editorial text-[1.05rem] leading-[1.55]"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={lookAgain}
                  className="mt-5 text-[0.82rem] text-muted-foreground/70 underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Read it again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-10">
        <ProjectSuggestion enabled={!notesLoading && notes.length >= 5} />
      </div>

      <AskNotes />
    </div>
  );
};

export default Reflect;
