import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePatterns } from "@/hooks/usePatterns";
import { useNotes } from "@/hooks/useNotes";

const STOP_WORDS = new Set(
  `a about actually after again all also always am an and another any anything are around as at back be because been before being but by came can cant come could did didnt do does doesnt doing done dont down each even ever every feel feels felt few for from get gets getting go goes going good got had has have having he her here hers him his how i if im in into is isnt it its ive just keep kept know knew like little lot made make makes many maybe me mean means might mine more most much my myself never new no nor not now of off oh ok on once one only or other our out over own really right said same say says see seem seems she should since so some someone something still such sure take than that thats the their them then there these they thing things think this those though thought through time to too took two up us use used very want wanted was wasnt way we well went were what when where which while who why will with would yeah year yes yet you your youre`.split(
    /\s+/,
  ),
);

/** Single words that recur across two or more notes — counting, no model. */
function recurringWords(transcripts: string[]) {
  const seen = new Map<string, number>();
  for (const text of transcripts) {
    const words = new Set(
      (text.toLowerCase().match(/[a-z']{4,}/g) ?? [])
        .map((w) => w.replace(/'/g, ""))
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w)),
    );
    for (const w of words) seen.set(w, (seen.get(w) ?? 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function agoLabel(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Patterns — a letter anren writes across your notes, unprompted. */
const Patterns = () => {
  const { letter, loading, working, thin, readAgain } = usePatterns();
  const { notes } = useNotes();

  const words = useMemo(
    () => recurringWords(notes.map((n) => `${n.transcript ?? ""} ${n.body ?? ""}`)),
    [notes],
  );

  const sources = useMemo(() => {
    if (!letter) return [];
    const byId = new Map(notes.map((n) => [n.id, n]));
    return letter.noteIds.map((id) => byId.get(id)).filter(Boolean);
  }, [letter, notes]);

  const paragraphs = letter ? letter.body.split(/\n\s*\n/).filter((p) => p.trim()) : [];

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">Patterns</h1>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[0.9rem] leading-relaxed text-muted-foreground">
            {letter
              ? `Read across ${letter.notesAnalyzed} note${letter.notesAnalyzed === 1 ? "" : "s"} · ${agoLabel(letter.computedAt)}`
              : "What runs through everything you've kept."}
          </p>
          <button
            onClick={readAgain}
            disabled={working}
            className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
          >
            {working && <Loader2 className="w-3 h-3 animate-spin" />}
            {working ? "Reading…" : letter ? "Read again" : "Read my notes"}
          </button>
        </div>
      </header>

      {loading && !letter && (
        <div className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Opening the last reading…
        </div>
      )}

      {!loading && !letter && thin && (
        <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
          Nothing has repeated enough to read yet. Keep talking and this will fill in.
        </p>
      )}

      {letter && (
        <article className="animate-fade-up border-t border-hairline pt-7">
          <div className="flex flex-col gap-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="font-editorial text-[1.15rem] leading-[1.8]">
                {p}
              </p>
            ))}
          </div>

          {sources.length > 0 && (
            <div className="mt-8 border-t border-hairline pt-4">
              <p className="text-[0.7rem] uppercase tracking-[0.13em] text-muted-foreground/60">
                Drawn from
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {sources.map((n) => (
                  <Link
                    key={n!.id}
                    to={`/note/${n!.id}`}
                    className="text-[0.9rem] text-muted-foreground underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {n!.title ?? "Untitled note"}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      )}

      {words.length > 0 && (
        <div className="mt-10">
          <p className="text-[0.7rem] uppercase tracking-[0.13em] text-muted-foreground/60">
            Words you keep using
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {words.map((w) => (
              <span
                key={w}
                className="rounded-full border border-hairline bg-paper/60 px-3 py-1 text-[0.82rem] text-muted-foreground"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Patterns;
