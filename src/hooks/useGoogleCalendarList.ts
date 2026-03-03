import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
}

export function useGoogleCalendarList() {
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCalendarList = useCallback(async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=calendarList`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setCalendars(result.calendars || []);
    } catch (e) {
      console.error("Calendar list fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { calendars, loading, fetchCalendarList };
}
