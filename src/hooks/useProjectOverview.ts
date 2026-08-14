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
  /** Notes that arrived since you last opened this project. */
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

/** Stamped when you actually open a project — not when you glance at the list. */
export function markProjectLooked(projectId: string) {
  try {
    const next = { ...readLooked(), [projectId]: Date.now() };
    window.localStorage.setItem(LOOKED_KEY, JSON.stringify(next));
  } catch {
    /* fine — "new since" is a nicety */
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
  const [looseRecent, setLooseRecent] = useState<OverviewNote[]>([]);


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
    const loose: OverviewNote[] = [];
    for (const row of rows) {
      if (!row.project_id) {
        loose.push({ id: row.id, title: row.title, recordedAt: row.recorded_at });
        continue;
      }
      const list = byProject.get(row.project_id) ?? [];
      list.push({ id: row.id, title: row.title, recordedAt: row.recorded_at });
      byProject.set(row.project_id, list);
    }


    const mapped: ProjectOverview[] = projects.map((project) => {
      const notes = byProject.get(project.id) ?? [];
      const since = looked[project.id] ?? 0;
      // A project never looked at yet: everything in it counts as unread once
      // there's more than the first thing.
      const newSinceLooked = since
        ? notes.filter((n) => +new Date(n.recordedAt) > since).length
        : 0;
      return {
        project,
        count: notes.length,
        recent: notes.slice(0, 2),
        newSinceLooked,
        lastActivityAt: notes.length ? +new Date(notes[0].recordedAt) : 0,
      };
    });

    // What moved sits above what's been sitting still.
    mapped.sort((a, b) => {
      if (!!a.newSinceLooked !== !!b.newSinceLooked) return a.newSinceLooked ? -1 : 1;
      return b.lastActivityAt - a.lastActivityAt;
    });
    setOverviews(mapped);
    setLooseCount(loose.length);
    setLooseRecent(loose.slice(0, 10));
  }, [user, projects]);

  useEffect(() => {
    if (projectsLoading) return;
    void load();
  }, [load, projectsLoading]);

  return { overviews, looseCount, looseRecent, loading: overviews === null, reload: load };
}


