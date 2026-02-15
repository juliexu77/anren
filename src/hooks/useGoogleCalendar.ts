import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export function useGoogleCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (timeMin?: string, timeMax?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: "list" });
      if (timeMin) params.set("timeMin", timeMin);
      if (timeMax) params.set("timeMax", timeMax);

      const { data, error } = await supabase.functions.invoke("google-calendar", {
        body: null,
        headers: {},
      });

      // Use query params via GET-style workaround
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setEvents(result.events || []);
    } catch (e: any) {
      console.error("Calendar fetch error:", e);
      toast.error(e.message || "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
  }) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event }),
        }
      );

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success("Event created!");
      return result.event;
    } catch (e: any) {
      toast.error(e.message || "Failed to create event");
      throw e;
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=delete&eventId=${eventId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success("Event deleted");
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete event");
    }
  }, []);

  return { events, loading, fetchEvents, createEvent, deleteEvent };
}
