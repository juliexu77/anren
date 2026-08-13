import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notesChanged } from "@/lib/noteEvents";

export interface ThreadNote {
  id: string;
  title: string | null;
  recordedAt: string;
  projectId: string | null;
}

export interface Thread {
  id: string;
  name: string;
  blurb: string | null;
  quotes: string[];
  notes: ThreadNote[];
  firstSeenAt: string;
  lastSeenAt: string;
}

const LOOKED_KEY = "anren.threadsLookedAt";
const A_DAY = 24 * 60 * 60 * 1000;
const MIN_NOTES = 6;

/**
 * Threads are noticed, never made: anren reads back over the notes now and then
 * and says what keeps rhyming. Nothing here is a hierarchy to maintain.
 */
export function useThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [noticing, setNoticing] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!user) return [];
    const { data: rows } = await supabase
      .from("threads")
      .select("id, name, blurb, quotes, note_ids, first_seen_at, last_seen_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("last_seen_at", { ascending: false })
      .limit(6);

    const ids = [...new Set((rows ?? []).flatMap((r) => (r.note_ids ?? []) as string[]))];
    const notesById = new Map<string, ThreadNote>();
    if (ids.length) {
      const { data: notes } = await supabase
        .from("notes")
        .select("id, title, recorded_at, project_id")
        .in("id", ids)
        .is("deleted_at", null);
      for (const n of notes ?? []) {
        notesById.set(n.id, {
          id: n.id,
          title: n.title,
          recordedAt: n.recorded_at,
          projectId: n.project_id ?? null,
        });
      }
    }

    const mapped: Thread[] = (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      blurb: r.blurb,
      quotes: Array.isArray(r.quotes) ? (r.quotes as string[]).filter((q) => typeof q === "string") : [],
      notes: ((r.note_ids ?? []) as string[])
        .map((id) => notesById.get(id))
        .filter((n): n is ThreadNote => Boolean(n))
        .sort((a, b) => +new Date(b.recordedAt) - +new Date(a.recordedAt)),
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
    }));

    setThreads(mapped);
    return mapped;
  }, [user]);

  // Look at most once a day, and only once there's enough to rhyme.
  const notice = useCallback(
    async (force = false) => {
      if (!user) return;
      if (!force) {
        const last = Number(window.localStorage.getItem(LOOKED_KEY) ?? 0);
        if (Date.now() - last < A_DAY) return;
        const { count } = await supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .eq("status", "ready");
        if ((count ?? 0) < MIN_NOTES) return;
      }
      window.localStorage.setItem(LOOKED_KEY, String(Date.now()));
      setNoticing(true);
      try {
        await supabase.functions.invoke("notice-threads").catch(() => undefined);
        await load();
      } finally {
        setNoticing(false);
      }
    },
    [user, load],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const found = await load();
      if (cancelled || found.length) return;
      await notice();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, load, notice]);

  const dismiss = useCallback(async (thread: Thread) => {
    setThreads((prev) => (prev ?? []).filter((t) => t.id !== thread.id));
    await supabase
      .from("threads")
      .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("id", thread.id);
  }, []);

  /** Promoting a thread is the one place it becomes something you keep. */
  const promote = useCallback(
    async (
      thread: Thread,
      createProject: (name: string) => Promise<{ id: string } | null>,
      existingProjectId?: string,
    ) => {
      setWorking(true);
      try {
        // If most of this thread already lives in a project, we just file the rest.
        const target = existingProjectId
          ? { id: existingProjectId }
          : await createProject(thread.name);
        if (!target?.id) return null;
        const toFile = thread.notes.filter((n) => n.projectId !== target.id).map((n) => n.id);
        if (toFile.length) {
          await supabase
            .from("notes")
            .update({ project_id: target.id, auto_filed_at: new Date().toISOString() })
            .in("id", toFile);
        }
        await supabase
          .from("threads")
          .update({ status: "promoted", project_id: target.id })
          .eq("id", thread.id);
        setThreads((prev) => (prev ?? []).filter((t) => t.id !== thread.id));
        notesChanged();
        return created.id;
      } finally {
        setWorking(false);
      }
    },
    [],
  );

  return { threads, noticing, working, notice, dismiss, promote };
}
