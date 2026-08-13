import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/types/note";

export interface OverviewNote {
  id: string;
  title: string | null;
  recordedAt: string;
}

export interface ProjectOverview {
  project: Project;
  count: number;
  recent: OverviewNote[];
  /** Notes that arrived since you last opened this screen. */
  newSinceLooked: number;
  lastActivityAt: number;
}

const LOOKED_KEY = "anren.projectsLookedAt";

function readLooked(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(LOOKED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/**
 * A bird's-eye read of what's inside the projects you've deliberately made:
 * how much, the last couple of things, and what has landed since you looked.
 */
export function useProjectOverview() {
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const [overviews, setOverviews] = useState<ProjectOverview[] | null>(null);
  const [looseCount, setLooseCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notes")
      .select("id, title, recorded_at, project_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .is("continues_note_id", null)
      .order("recorded_at", { ascending: false });

    const rows = data ?? [];
    const looked = readLooked();

    const byProject = new Map<string, OverviewNote[]>();
    let loose = 0;
    for (const row of rows) {
      if (!row.project_id) {
        loose += 1;
        continue;
      }
      const list = byProject.get(row.project_id) ?? [];
      list.push({ id: row.id, title: row.title, recordedAt: row.recorded_at });
      byProject.set(row.project_id, list);
    }

    const mapped: ProjectOverview[] = projects.map((project) => {
      const notes = byProject.get(project.id) ?? [];
      const since = looked[project.id] ?? 0;
      return {
        project,
        count: notes.length,
        recent: notes.slice(0, 2),
        newSinceLooked: since
          ? notes.filter((n) => +new Date(n.recordedAt) > since).length
          : 0,
        lastActivityAt: notes.length ? +new Date(notes[0].recordedAt) : 0,
      };
    });

    mapped.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    setOverviews(mapped);
    setLooseCount(loose);

    // Mark this visit once we've read what was new.
    const next: Record<string, number> = { ...looked };
    const now = Date.now();
    for (const p of projects) next[p.id] = now;
    try {
      window.localStorage.setItem(LOOKED_KEY, JSON.stringify(next));
    } catch {
      /* fine — "new since" is a nicety */
    }
  }, [user, projects]);

  useEffect(() => {
    if (projectsLoading) return;
    void load();
  }, [load, projectsLoading]);

  return { overviews, looseCount, loading: overviews === null, reload: load };
}
