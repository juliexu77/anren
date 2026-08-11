import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Project } from "@/types/note";

const SELECT = "id, name, position, emoji";

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select(SELECT)
      .eq("user_id", user.id)
      .order("position", { ascending: true });
    if (data) setProjects(data as Project[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const setProjectEmoji = useCallback(async (id: string, emoji: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, emoji } : p)));
    await supabase.from("projects").update({ emoji }).eq("id", id);
  }, []);

  const createProject = useCallback(
    async (name: string) => {
      if (!user || !name.trim()) return null;
      const trimmed = name.trim();
      const { data } = await supabase
        .from("projects")
        .insert({ user_id: user.id, name: trimmed, position: projects.length })
        .select(SELECT)
        .single();
      if (!data) return null;

      const created = data as Project;
      setProjects((prev) => [...prev, created]);

      // Suggest an emoji in the background; silent on failure.
      supabase.functions
        .invoke("suggest-folder-emoji", { body: { name: trimmed } })
        .then(({ data: result, error }) => {
          const emoji = !error && result?.emoji ? String(result.emoji) : null;
          if (emoji) void setProjectEmoji(created.id, emoji);
        })
        .catch(() => undefined);

      return created;
    },
    [user, projects.length, setProjectEmoji],
  );

  const renameProject = useCallback(async (id: string, name: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    await supabase.from("projects").update({ name }).eq("id", id);
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("projects").delete().eq("id", id);
  }, []);

  return {
    projects,
    loading,
    reload: load,
    createProject,
    renameProject,
    deleteProject,
    setProjectEmoji,
  };
}
