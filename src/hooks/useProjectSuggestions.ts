import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notesChanged } from "@/lib/noteEvents";

export interface ProjectSuggestion {
  id: string;
  kind: "new" | "existing";
  name: string;
  projectId: string | null;
  noteIds: string[];
  reason: string | null;
  /** The notes it would actually gather, so the decision is legible. */
  notes: { id: string; title: string | null }[];
}

/** A grouping named after the app itself is never a real grouping. */
const NOT_A_NAME = new Set(["anren"]);

const LOOKED_KEY = "anren.projectShapesLookedAt";
const A_DAY = 24 * 60 * 60 * 1000;

/**
 * Projects should emerge rather than be maintained: anren reads over the notes
 * that aren't part of anything yet and, now and then, says what it notices.
 */
export function useProjectSuggestions(enabled: boolean) {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<ProjectSuggestion | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("project_suggestions")
      .select("id, kind, name, project_id, note_ids, reason")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    const mapped = row
      ? {
          id: row.id,
          kind: (row.kind === "existing" ? "existing" : "new") as "new" | "existing",
          name: row.name,
          projectId: row.project_id,
          noteIds: (row.note_ids ?? []) as string[],
          reason: row.reason,
        }
      : null;
    setSuggestion(mapped);
    return mapped;
  }, [user]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  // Look for a shape at most once a day, and only once notes have gathered.
  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;

    const look = async () => {
      const found = await load();
      if (cancelled || found) return;

      const last = Number(window.localStorage.getItem(LOOKED_KEY) ?? 0);
      if (Date.now() - last < A_DAY) return;

      const { count } = await supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("project_id", null)
        .is("deleted_at", null)
        .eq("status", "ready");
      if (cancelled || (count ?? 0) < 5) return;

      window.localStorage.setItem(LOOKED_KEY, String(Date.now()));
      await supabase.functions.invoke("suggest-projects").catch(() => undefined);
      if (!cancelled) await load();
    };

    const timer = window.setTimeout(look, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, user, load]);

  const dismiss = useCallback(async () => {
    if (!suggestion) return;
    setSuggestion(null);
    await supabase
      .from("project_suggestions")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", suggestion.id);
  }, [suggestion]);

  /** Creates the project if it's new, then associates the notes it rests on. */
  const accept = useCallback(
    async (createProject: (name: string) => Promise<{ id: string } | null>) => {
      if (!suggestion || !user) return null;
      setWorking(true);
      try {
        let projectId = suggestion.projectId;
        if (!projectId) {
          const created = await createProject(suggestion.name);
          projectId = created?.id ?? null;
        }
        if (!projectId) return null;

        await supabase
          .from("notes")
          .update({ project_id: projectId, auto_filed_at: new Date().toISOString() })
          .in("id", suggestion.noteIds);
        await supabase
          .from("project_suggestions")
          .update({ status: "accepted", project_id: projectId, updated_at: new Date().toISOString() })
          .eq("id", suggestion.id);

        setSuggestion(null);
        notesChanged();
        return projectId;
      } finally {
        setWorking(false);
      }
    },
    [suggestion, user],
  );

  return { suggestion, accept, dismiss, working };
}
