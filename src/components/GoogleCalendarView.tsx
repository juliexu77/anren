import { useEffect, useState, useCallback } from "react";
import { useGoogleCalendar, type CalendarEvent } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function GoogleCalendarView() {
  const { events, loading, fetchEvents, createEvent, deleteEvent } = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [creating, setCreating] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Check if Google Calendar is connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth-callback?action=check-status`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }
        );
        const result = await res.json();
        setCalendarConnected(result.connected);
      } catch {
        setCalendarConnected(false);
      }
    };
    checkConnection();
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const redirectUri = `${window.location.origin}/google-callback`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth-callback?action=get-auth-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ redirectUri }),
        }
      );

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      // Redirect to Google consent screen
      window.location.href = result.url;
    } catch (e: any) {
      console.error("Connect error:", e);
      setConnecting(false);
    }
  }, []);

  // Fetch events when connected
  useEffect(() => {
    if (calendarConnected) {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      fetchEvents(start.toISOString(), end.toISOString());
    }
  }, [selectedDate, fetchEvents, calendarConnected]);

  const eventsForDate = events.filter((e) => {
    const eventDate = e.start.dateTime
      ? parseISO(e.start.dateTime)
      : e.start.date
        ? parseISO(e.start.date)
        : null;
    return eventDate && isSameDay(eventDate, selectedDate);
  });

  const datesWithEvents = events.map((e) => {
    return e.start.dateTime
      ? parseISO(e.start.dateTime)
      : e.start.date
        ? parseISO(e.start.date)
        : null;
  }).filter(Boolean) as Date[];

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await createEvent({
        summary: newTitle,
        description: newDesc || undefined,
        start: { dateTime: `${dateStr}T${newStartTime}:00`, timeZone: tz },
        end: { dateTime: `${dateStr}T${newEndTime}:00`, timeZone: tz },
      });
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      fetchEvents(start.toISOString(), end.toISOString());
    } finally {
      setCreating(false);
    }
  };

  // Show connect screen if not connected
  if (calendarConnected === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!calendarConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
        <p className="text-sm text-muted-foreground text-center">
          Connect your Google Calendar to view and manage events.
        </p>
        <Button onClick={handleConnect} disabled={connecting} className="rounded-full">
          {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Connect Google Calendar
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8">
      {/* Calendar picker */}
      <div className="flex justify-center mb-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          modifiers={{ hasEvent: datesWithEvents }}
          modifiersClassNames={{ hasEvent: "bg-primary/20 font-bold" }}
          className="rounded-2xl border border-border p-3"
        />
      </div>

      {/* Selected date header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">
          {format(selectedDate, "EEEE, MMM d")}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="rounded-full">
          <Plus className="w-4 h-4 mr-1" />
          Event
        </Button>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : eventsForDate.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No events this day</p>
      ) : (
        <div className="space-y-2">
          {eventsForDate.map((event) => (
            <div
              key={event.id}
              className="rounded-xl p-3 border border-border bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{event.summary}</p>
                  {event.start.dateTime && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(event.start.dateTime), "h:mm a")}
                      {event.end.dateTime && ` – ${format(parseISO(event.end.dateTime), "h:mm a")}`}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteEvent(event.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">New Event</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="Event title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="resize-none"
              rows={2}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <Input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Event
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
