import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isNeedsKeyError, NEEDS_KEY_MESSAGE } from "@/lib/aiAccess";
import { toast } from "sonner";

/** How stale a letter can get before anren writes another. */
const REWRITE_AFTER_MS = 24 * 60 * 60 * 1000;
/** How many new notes are worth a fresh letter on their own. */
const NEW_NOTES_TRIGGER = 3;

export interface PatternLetter {
  body: string;
  noteIds: string[];
  notesAnalyzed: number;
  computedAt: string;
}

/**
 * The letter anren keeps current about what runs through your notes: cached so
 * the page opens instantly, quietly rewritten when it's gone stale.
 */
export function usePatterns() {
  const { user } = useAuth();
  const [letter, setLetter] = useState<PatternLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [thin, setThin] = useState(false);

  const write = useCallback(async (announce: boolean) => {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("notice-patterns");
    setWorking(false);

    if (error) {
      if (announce) {
        toast.error(isNeedsKeyError(error) ? NEEDS_KEY_MESSAGE : "That reading didn't come back. Try again?");
      }
      return;
    }

    const payload = data as {
      body?: string | null;
      noteIds?: string[];
      notesAnalyzed?: number;
      computedAt?: string;
      thin?: boolean;
    };

    if (payload.thin || !payload.body) {
      setThin(true);
      return;
    }
    setThin(false);
    setLetter({
      body: payload.body,
      noteIds: payload.noteIds ?? [],
      notesAnalyzed: payload.notesAnalyzed ?? 0,
      computedAt: payload.computedAt ?? new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const run = async () => {
      const { data: stored } = await supabase
        .from("patterns")
        .select("body, note_ids, notes_analyzed, computed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (stored) {
        setLetter({
          body: stored.body,
          noteIds: (stored.note_ids ?? []) as string[],
          notesAnalyzed: stored.notes_analyzed ?? 0,
          computedAt: stored.computed_at,
        });
      }
      setLoading(false);

      let fresh =
        !stored || Date.now() - new Date(stored.computed_at).getTime() > REWRITE_AFTER_MS;

      if (!fresh && stored) {
        const { count } = await supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gt("recorded_at", stored.computed_at);
        fresh = (count ?? 0) >= NEW_NOTES_TRIGGER;
      }

      if (!fresh || !alive) return;
      // Silent by design: if this fails, what's stored stands.
      await write(false);
    };

    void run();
    return () => {
      alive = false;
    };
  }, [user, write]);

  return { letter, loading, working, thin, readAgain: () => write(true) };
}
