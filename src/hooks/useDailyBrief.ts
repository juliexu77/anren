import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DailyBriefSettings {
  delivery_time: string; // "HH:MM:SS"
  timezone: string;
  calendars: string[];
  enabled: boolean;
}

const DEFAULT_SETTINGS: DailyBriefSettings = {
  delivery_time: "07:00:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  calendars: ["primary"],
  enabled: true,
};

export function useDailyBrief() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true); // default hidden until we know
  const [settings, setSettings] = useState<DailyBriefSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [briefText, setBriefText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if brief was dismissed today
  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    (async () => {
      const { data } = await supabase
        .from("daily_brief_dismissals")
        .select("id")
        .eq("user_id", user.id)
        .eq("dismissed_date", today)
        .maybeSingle();

      setDismissed(!!data);
      setLoading(false);
    })();
  }, [user]);

  // Load settings
  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("daily_brief_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          delivery_time: data.delivery_time,
          timezone: data.timezone,
          calendars: data.calendars,
          enabled: data.enabled,
        });
      }
      setSettingsLoaded(true);
    })();
  }, [user]);

  const dismiss = useCallback(async () => {
    if (!user) return;
    setDismissed(true);

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_brief_dismissals").upsert(
      { user_id: user.id, dismissed_date: today },
      { onConflict: "user_id,dismissed_date" }
    );
  }, [user]);

  const updateSettings = useCallback(
    async (updates: Partial<DailyBriefSettings>) => {
      if (!user) return;

      const merged = { ...settings, ...updates };
      setSettings(merged);

      await supabase.from("daily_brief_settings").upsert(
        {
          user_id: user.id,
          delivery_time: merged.delivery_time,
          timezone: merged.timezone,
          calendars: merged.calendars,
          enabled: merged.enabled,
        },
        { onConflict: "user_id" }
      );
    },
    [user, settings]
  );

  const shouldShow = !loading && !dismissed && settings.enabled;

  return {
    shouldShow,
    dismissed,
    dismiss,
    settings,
    settingsLoaded,
    updateSettings,
    briefText,
    setBriefText,
    loading,
  };
}
