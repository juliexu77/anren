import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isNeedsKeyError, NEEDS_KEY_MESSAGE } from "@/lib/aiAccess";
import { toast } from "sonner";

interface Source {
  noteId: string;
  title: string | null;
}

interface Turn {
  question: string;
  answer: string;
  sources: Source[];
}

const STARTERS = [
  "What keeps coming up lately?",
  "What have I been avoiding?",
  "What was I excited about last month?",
];

/** Ask — a way to put a question to your own notes and hear them read back. */
const AskPage = () => {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const ask = async (raw?: string) => {
    const question = (raw ?? query).trim();
    if (!question || pending) return;
    setQuery("");
    setPending(question);

    const history = turns.slice(-4).map((t) => ({ question: t.question, answer: t.answer }));
    const { data, error } = await supabase.functions.invoke("ask-notes", {
      body: { question, history },
    });
    setPending(null);

    if (error) {
      toast.error(isNeedsKeyError(error) ? NEEDS_KEY_MESSAGE : "That didn't come back. Try again?");
      setQuery(question);
      return;
    }
    const payload = data as { answer?: string; sources?: Source[] };
    setTurns((prev) => [
      ...prev,
      {
        question,
        answer: payload.answer ?? "You haven't left anything that speaks to this yet.",
        sources: payload.sources ?? [],
      },
    ]);
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">Ask</h1>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted-foreground">
          Ask anything about what you've been saying.
        </p>
      </header>

      <div className="flex items-end gap-2 border-b border-hairline pb-2 focus-within:border-primary/50">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="What's been on my mind about work?"
          className="flex-1 bg-transparent text-[0.98rem] outline-none placeholder:text-muted-foreground/55"
        />
        <button
          onClick={() => ask()}
          disabled={!query.trim() || !!pending}
          aria-label="Ask"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <ArrowUp className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>

      {!turns.length && !pending && (
        <div className="mt-6 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="rounded-full border border-hairline bg-paper/60 px-3.5 py-1.5 text-[0.82rem] leading-snug text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-9 flex flex-col gap-9">
        {turns.map((turn, i) => (
          <div key={`${i}-${turn.question}`} className="animate-fade-up">
            <p className="text-[0.72rem] uppercase tracking-[0.13em] text-muted-foreground/60">You asked</p>
            <p className="mt-1.5 text-[0.94rem] leading-relaxed text-muted-foreground">{turn.question}</p>

            <p className="mt-5 whitespace-pre-line font-editorial text-[1.05rem] leading-[1.75]">{turn.answer}</p>

            {turn.sources.length > 0 && (
              <div className="mt-5 border-t border-hairline pt-4">
                <p className="text-[0.7rem] uppercase tracking-[0.13em] text-muted-foreground/60">From your notes</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {turn.sources.map((s) => (
                    <Link
                      key={s.noteId}
                      to={`/note/${s.noteId}`}
                      className="text-[0.9rem] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {s.title ?? "Untitled note"}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {pending && (
          <div className="animate-fade-up">
            <p className="text-[0.72rem] uppercase tracking-[0.13em] text-muted-foreground/60">You asked</p>
            <p className="mt-1.5 text-[0.94rem] leading-relaxed text-muted-foreground">{pending}</p>
            <div className="mt-5 flex items-center gap-2 text-[0.9rem] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Reading back through your notes…
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AskPage;
