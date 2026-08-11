import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Project } from "@/types/note";

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, position")
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    if (data) setProjects(data as Project[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const createProject = useCallback(
    async (name: string) => {
      if (!user || !name.trim()) return null;
      const { data } = await supabase
        .from("projects")
        .insert({ user_id: user.id, name: name.trim(), position: projects.length })
        .select("id, name, position")
        .single();
      if (data) setProjects((prev) => [...prev, data as Project]);
      return data as Project | null;
    },
    [user, projects.length],
  );

  const renameProject = useCallback(async (id: string, name: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    await supabase.from("projects").update({ name }).eq("id", id);
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("projects").delete().eq("id", id);
  }, []);

  return { projects, loading, reload: load, createProject, renameProject, deleteProject };
}
