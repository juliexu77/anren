import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notesChanged } from "@/lib/noteEvents";

/**
 * The one place a typed note is kept, so every capture surface stays in step.
 * Keeping and writing up are separate on purpose: the caller runs the write-up
 * so it can show what anren noticed while it happens.
 */
export function useTextCapture() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (body: string, projectId: string | null): Promise<string | null> => {
      const trimmed = body.trim();
      if (!user || !trimmed || saving) return null;
      setSaving(true);

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          project_id: projectId,
          source: "typed",
          body: trimmed,
          transcript: trimmed,
          recorded_at: new Date().toISOString(),
          status: "processing",
        })
        .select("id")
        .single();

      setSaving(false);
      if (error || !data) return null;

      notesChanged();
      return data.id as string;
    },
    [user, saving],
  );

  return { save, saving };
}
