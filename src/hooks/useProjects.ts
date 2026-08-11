import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { undoableDelete } from "@/lib/undo";
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
      .is("deleted_at", null)
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
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    await supabase.from("projects").update({ name: trimmed }).eq("id", id);
  }, []);

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      void supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);

      undoableDelete({
        message: "Folder deleted · its notes stayed",
        onUndo: async () => {
          await supabase.from("projects").update({ deleted_at: null }).eq("id", id);
          load();
        },
        onFinalize: async () => {
          // Notes keep living in the main list.
          await supabase.from("notes").update({ project_id: null }).eq("project_id", id);
          await supabase.from("projects").delete().eq("id", id);
        },
      });
    },
    [load],
  );

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
