import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Theme {
  title: string;
  detail: string;
}

export interface Movement {
  name: string;
  moved: string;
}

export interface LookBack {
  id: string;
  weekStart: string;
  narrative: string;
  /** What moved, named the way the Threads screen names things. */
  movements: Movement[];
  /** Where two of those pull against each other, when they do. */
  tension: string | null;
  themes: Theme[];
  notesAnalyzed: number;
  updatedAt: string;
}

/** Notes needed before Anren reads a week back for the first time. */
const FIRST_LOOK_AT = 4;
/** New notes since the last look-back before it's worth writing again. */
const REFRESH_EVERY = 4;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** The Monday the edge function uses, so both sides agree on which week this is. */
export function weekStartUTC(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

/** One run at a time across every mount, so a remount can't double-spend. */
let inFlight: Promise<unknown> | null = null;

export function useLookBack() {
  const { user } = useAuth();
  const [digest, setDigest] = useState<LookBack | null>(null);
  const [noteCount, setNoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const weekStart = weekStartUTC();
  const autoTried = useRef(false);

  const load = useCallback(async () => {
    if (!user) return { digest: null as LookBack | null, count: 0 };

    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("weekly_digests")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .is("project_id", null)
        .maybeSingle(),
      supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "ready")
        .is("deleted_at", null)
        .gte("recorded_at", `${weekStart}T00:00:00Z`),
    ]);

    const mapped: LookBack | null = data
      ? {
          id: data.id,
          weekStart: data.week_start,
          narrative: data.narrative,
          movements: Array.isArray(data.movements)
            ? (data.movements as unknown as Movement[])
            : [],
          tension: (data.tension as string | null) ?? null,
          themes: Array.isArray(data.themes) ? (data.themes as unknown as Theme[]) : [],
          notesAnalyzed: data.notes_analyzed ?? 0,
          updatedAt: data.updated_at ?? data.created_at,
        }
      : null;

    setDigest(mapped);
    setNoteCount(count ?? 0);
    setLoading(false);
    return { digest: mapped, count: count ?? 0 };
  }, [user, weekStart]);

  const generate = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (inFlight) return false;
      setGenerating(true);
      const run = supabase.functions.invoke("weekly-digest", { body: {} });
      inFlight = run;
      const { error } = await run;
      inFlight = null;
      setGenerating(false);
      if (error) {
        // Out of allowance or a thin week — nothing worth interrupting them for.
        if (!silent) throw error;
        return false;
      }
      await load();
      return true;
    },
    [load],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { digest: current, count } = await load();
      if (cancelled || autoTried.current) return;

      const enough = count >= FIRST_LOOK_AT;
      const newSince = count - (current?.notesAnalyzed ?? 0);
      const stale =
        !!current && Date.now() - new Date(current.updatedAt).getTime() > STALE_MS && newSince > 0;

      // A digest written before "what moved" existed reads as a bare essay — rewrite it once.
      const legacy = !!current && current.movements.length === 0;
      const due = enough && (!current || legacy || newSince >= REFRESH_EVERY || stale);
      if (!due) return;

      // Don't re-attempt within a session if the last try got us nowhere.
      const marker = `anren:lookback:${weekStart}:${count}:${legacy ? "legacy" : "n"}`;
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "1");

      autoTried.current = true;
      await generate({ silent: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, load, generate, weekStart]);

  return {
    digest,
    noteCount,
    loading,
    generating,
    weekStart,
    reload: load,
    generate,
    readyForFirst: noteCount >= FIRST_LOOK_AT,
  };
}
