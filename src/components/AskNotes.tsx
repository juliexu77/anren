import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNeedsKeyError, NEEDS_KEY_MESSAGE } from "@/lib/aiAccess";

interface Source {
  noteId: string;
  title: string | null;
}

interface Turn {
  question: string;
  answer: string | null;
  sources: Source[];
}

const STARTERS = [
  "What have I been avoiding?",
  "What keeps coming back up?",
  "What have I stopped mentioning?",
];

/**
 * Ask something of the whole body of notes. Retrieval happens first on the
 * server, so every answer is anchored in words already spoken — the notes it
 * leaned on sit right underneath. Nothing here is kept once you walk away.
 */
export function AskNotes() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ask = async (raw?: string) => {
    const value = (raw ?? question).trim();
    if (!value || asking) return;

    setAsking(true);
    setQuestion("");
    setTurns((prev) => [...prev, { question: value, answer: null, sources: [] }]);

    const history = turns
      .filter((t) => t.answer)
      .slice(-4)
      .map((t) => ({ question: t.question, answer: t.answer as string }));

    const { data, error } = await supabase.functions.invoke("ask-notes", {
      body: { question: value, history },
    });
    setAsking(false);

    if (error) {
      setTurns((prev) => prev.slice(0, -1));
      setQuestion(value);
      toast(isNeedsKeyError(error) ? NEEDS_KEY_MESSAGE : "That didn't come back. Try again?");
      return;
    }

    const payload = data as { answer?: string | null; sources?: Source[] };
    setTurns((prev) =>
      prev.map((turn, i) =>
        i === prev.length - 1
          ? { ...turn, answer: payload.answer ?? "Nothing in your notes speaks to that yet.", sources: payload.sources ?? [] }
          : turn,
      ),
    );
  };

  return (
    <section className="mt-12 border-t border-hairline pt-9">
      <h2 className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Ask about your notes</h2>

      {turns.length > 0 && (
        <div className="mt-6 flex flex-col gap-8">
          {turns.map((turn, i) => (
            <div key={i}>
              <p className="font-editorial italic text-[1rem] leading-[1.6] text-muted-foreground">{turn.question}</p>
              {turn.answer === null ? (
                <p className="mt-3 flex items-center gap-2 text-[0.9rem] text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reading back through your notes…
                </p>
              ) : (
                <>
                  <p className="mt-3 whitespace-pre-line font-editorial text-[1.08rem] leading-[1.7]">{turn.answer}</p>
                  {turn.sources.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <span className="text-[0.72rem] uppercase tracking-[0.13em] text-muted-foreground/60">
                        Drawn from
                      </span>
                      {turn.sources.map((source) => (
                        <Link
                          key={source.noteId}
                          to={`/note/${source.noteId}`}
                          className="rounded-full border border-hairline px-3 py-1 text-[0.78rem] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                        >
                          {source.title ?? "Untitled note"}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-end gap-2 rounded-[20px] border border-hairline bg-paper px-4 py-2.5">
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask();
            }
          }}
          rows={1}
          placeholder="What have I been circling lately?"
          aria-label="Ask about your notes"
          className="flex-1 resize-none bg-transparent py-1.5 text-[0.95rem] leading-[1.6] outline-none placeholder:text-muted-foreground/55"
        />
        <button
          onClick={() => void ask()}
          disabled={!question.trim() || asking}
          aria-label="Ask"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={1.75} />}
        </button>
      </div>

      {!turns.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              onClick={() => {
                setQuestion(starter);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-hairline px-3.5 py-1.5 text-[0.8rem] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-[0.78rem] leading-relaxed text-muted-foreground/70">
        anren only reads your own notes, and nothing you ask here is kept.
      </p>
    </section>
  );
}
