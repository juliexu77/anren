import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { undoableDelete } from "@/lib/undo";
import type { Project } from "@/types/note";

const SELECT = "id, name, position, emoji";

// Shared across every mounted rail: name -> the insert already on its way.
const recentCreates = new Map<string, Promise<Project | null>>();

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    // Folders whose undo window closed while the app wasn't looking shouldn't
    // sit half-deleted forever.
    await supabase
      .from("projects")
      .delete()
      .eq("user_id", user.id)
      .lt("deleted_at", new Date(Date.now() - 60_000).toISOString());
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

      // Two rails are mounted at once (drawer + sidebar) and a keypress can land
      // beside a trailing blur, so the same folder used to get written twice.
      // Anything asking for the same name within a breath gets the first row.
      const key = `${user.id}:${trimmed.toLowerCase()}`;
      const inFlight = recentCreates.get(key);
      if (inFlight) return inFlight;

      const request = (async () => {
        const { data } = await supabase
          .from("projects")
          .insert({ user_id: user.id, name: trimmed, position: projects.length })
          .select(SELECT)
          .single();
        return (data as Project | null) ?? null;
      })();
      recentCreates.set(key, request);
      window.setTimeout(() => recentCreates.delete(key), 3000);

      const data = await request;
      if (!data) {
        recentCreates.delete(key);
        return null;
      }


      const created = data as Project;
      setProjects((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));

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
    let previous: string | undefined;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        previous = p.name;
        return { ...p, name: trimmed };
      }),
    );
    const { error } = await supabase.from("projects").update({ name: trimmed }).eq("id", id);
    if (error) {
      if (previous !== undefined) {
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: previous! } : p)));
      }
      toast("That rename didn't save.");
    }
  }, []);

  const deleteProject = useCallback(
    async (id: string) => {
      const before = projects;
      setProjects((prev) => prev.filter((p) => p.id !== id));
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        setProjects(before);
        toast("Couldn't delete that folder just now.");
        return;
      }

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
    [load, projects],
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
