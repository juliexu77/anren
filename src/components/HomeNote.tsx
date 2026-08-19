import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { greetingLine } from "@/lib/greeting";
import { cn } from "@/lib/utils";

/** How stale a reading can get before anren has another look. */
const RECOMPUTE_AFTER_MS = 6 * 60 * 60 * 1000;
/** How many new notes are enough to be worth a fresh look on their own. */
const NEW_NOTES_TRIGGER = 2;

interface Said {
  observation: string | null;
  noteIds: string[];
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/**
 * One quiet line above the blank page. Usually a soft greeting; when the last
 * week has a current running through it, what anren has noticed instead —
 * with the notes it came from a tap away, so it's never a claim you can't check.
 */
export function HomeNote() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [said, setSaid] = useState<Said>({ observation: null, noteIds: [] });
  const [dismissed, setDismissed] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<{ id: string; title: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const run = async () => {
      const { data: last } = await supabase
        .from("notes")
        .select("recorded_at")
        .is("deleted_at", null)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      // Nothing kept yet: the page stays completely blank on a first run.
      if (!last) return;

      setGreeting(greetingLine(new Date(last.recorded_at)));

      const { data: stored } = await supabase
        .from("home_notes")
        .select("line, note_ids, dismissed_at, computed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (stored?.dismissed_at && isToday(stored.dismissed_at)) setDismissed(true);
      if (stored?.line) {
        setSaid({ observation: stored.line, noteIds: (stored.note_ids ?? []) as string[] });
      }

      const stale =
        !stored ||
        Date.now() - new Date(stored.computed_at).getTime() > RECOMPUTE_AFTER_MS;

      let fresh = stale;
      if (!fresh && stored) {
        const { count } = await supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gt("recorded_at", stored.computed_at);
        fresh = (count ?? 0) >= NEW_NOTES_TRIGGER;
      }

      if (!fresh || !alive) return;

      // Silent by design: if this fails or finds nothing, the greeting stands.
      const { data, error } = await supabase.functions.invoke("home-note");
      if (!alive || error) return;
      const observation = (data?.observation as string | undefined) ?? null;
      if (observation) {
        setDismissed(false);
        setSaid({ observation, noteIds: (data?.noteIds as string[] | undefined) ?? [] });
      } else {
        setSaid({ observation: null, noteIds: [] });
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    if (!showSources || !said.noteIds.length || sources.length) return;
    void supabase
      .from("notes")
      .select("id, title")
      .in("id", said.noteIds)
      .then(({ data }) => setSources(data ?? []));
  }, [showSources, said.noteIds, sources.length]);

  const observing = Boolean(said.observation) && !dismissed;
  const line = observing ? said.observation : greeting;
  if (!line) return null;

  const letGo = async () => {
    setDismissed(true);
    setShowSources(false);
    if (user) {
      await supabase
        .from("home_notes")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  };

  return (
    <div className="mb-10 animate-fade-up">
      <p
        onClick={observing ? letGo : undefined}
        className={cn(
          "max-w-[46ch] font-editorial leading-[1.65] text-muted-foreground",
          observing ? "text-[1.05rem] cursor-pointer" : "text-[0.95rem]",
        )}
      >
        {line}
      </p>

      {observing && said.noteIds.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowSources((s) => !s)}
            className="text-[0.72rem] text-muted-foreground/70 underline decoration-[0.5px] underline-offset-[3px] transition-colors hover:text-foreground"
          >
            {showSources ? "hide" : `from ${said.noteIds.length} notes`}
          </button>
          {showSources && (
            <ul className="mt-2 space-y-1">
              {sources.map((n) => (
                <li key={n.id}>
                  <Link
                    to={`/note/${n.id}`}
                    className="text-[0.8rem] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {n.title ?? "Untitled"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
