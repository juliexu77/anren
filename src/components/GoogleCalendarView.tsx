import { useEffect, useState, useCallback, useMemo } from "react";
import { useGoogleCalendar, type CalendarEvent } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import {
  format,
  addDays,
  subDays,
  startOfDay,
  isSameDay,
  parseISO,
} from "date-fns";
import { getAppOrigin } from "@/lib/utils";
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
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [showMiniCal, setShowMiniCal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
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

      const redirectUri = `${getAppOrigin()}/google-callback`;

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
      window.location.href = result.url;
    } catch (e: any) {
      console.error("Connect error:", e);
      setConnecting(false);
    }
  }, []);

  // Agenda: 7 days from today
  const agendaDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)),
    []
  );

  const getDayLabel = (date: Date) => {
    if (isSameDay(date, new Date())) return "Today";
    if (isSameDay(date, addDays(new Date(), 1))) return "Tomorrow";
    return null;
  };

  const getEventsForDay = useCallback(
    (date: Date) =>
      events.filter((e) => {
        const eventDate = e.start.dateTime
          ? parseISO(e.start.dateTime)
          : e.start.date
            ? parseISO(e.start.date)
            : null;
        return eventDate && isSameDay(eventDate, date);
      }),
    [events]
  );

  // Fetch events for agenda range
  useEffect(() => {
    if (calendarConnected && agendaDays.length > 0) {
      const timeMin = subDays(agendaDays[0], 1).toISOString();
      const timeMax = addDays(agendaDays[agendaDays.length - 1], 2).toISOString();
      fetchEvents(timeMin, timeMax);
    }
  }, [calendarConnected, agendaDays, fetchEvents]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const dateStr = format(currentDate, "yyyy-MM-dd");
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
      const timeMin = subDays(agendaDays[0], 1).toISOString();
      const timeMax = addDays(agendaDays[agendaDays.length - 1], 2).toISOString();
      fetchEvents(timeMin, timeMax);
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (calendarConnected === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not connected
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
    <>
      <div className="flex flex-col flex-1 overflow-auto pb-32">
        {/* Header */}
        <div className="px-5 pt-2 pb-4">
          <h2
            className="font-display"
            style={{
              fontSize: "32px",
              lineHeight: "38px",
              fontWeight: 400,
              color: "hsl(var(--text))",
            }}
          >
            Calendar
          </h2>
        </div>

        {loading && events.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-5">
            {agendaDays.map((date) => {
              const dayLabel = getDayLabel(date);
              const dayEvents = getEventsForDay(date);

              return (
                <div key={date.toISOString()}>
                  <div
                    className="flex items-baseline gap-2 py-4"
                    style={{
                      borderBottom: "1px solid hsl(var(--divider) / 0.15)",
                    }}
                  >
                    <span
                      className="font-display"
                      style={{
                        fontSize: "18px",
                        fontWeight: 400,
                        color: "hsl(var(--text))",
                      }}
                    >
                      {format(date, "MMM d")}
                    </span>
                    {dayLabel && (
                      <>
                        <span style={{ fontSize: "13px", color: "hsl(var(--text) / 0.3)" }}>·</span>
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: 400,
                            color: isSameDay(date, new Date())
                              ? "hsl(var(--primary))"
                              : "hsl(var(--text) / 0.5)",
                          }}
                        >
                          {dayLabel}
                        </span>
                      </>
                    )}
                    <span style={{ fontSize: "13px", color: "hsl(var(--text) / 0.3)" }}>·</span>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 400,
                        color: "hsl(var(--text) / 0.35)",
                      }}
                    >
                      {format(date, "EEEE")}
                    </span>
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="py-2 space-y-1.5">
                      {dayEvents.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-foreground/5"
                        >
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: 400,
                              color: "hsl(var(--text) / 0.85)",
                            }}
                          >
                            {ev.summary}
                          </p>
                          {ev.start.dateTime && (
                            <p
                              style={{
                                fontSize: "12px",
                                color: "hsl(var(--text) / 0.4)",
                                marginTop: "2px",
                              }}
                            >
                              {format(parseISO(ev.start.dateTime), "h:mm a")}
                              {ev.end.dateTime && ` – ${format(parseISO(ev.end.dateTime), "h:mm a")}`}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event detail sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-lg">{selectedEvent.summary}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {selectedEvent.start.dateTime && (
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(selectedEvent.start.dateTime), "EEEE, MMM d · h:mm a")}
                    {selectedEvent.end.dateTime &&
                      ` – ${format(parseISO(selectedEvent.end.dateTime), "h:mm a")}`}
                  </p>
                )}
                {selectedEvent.start.date && !selectedEvent.start.dateTime && (
                  <p className="text-sm text-muted-foreground">All day</p>
                )}
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                )}
                <div className="flex gap-2 pt-2">
                  {selectedEvent.htmlLink && (
                    <a href={selectedEvent.htmlLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" className="w-full rounded-full" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in Google
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full"
                    onClick={async () => {
                      await deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                      const timeMin = subDays(agendaDays[0], 1).toISOString();
                      const timeMax = addDays(agendaDays[agendaDays.length - 1], 2).toISOString();
                      fetchEvents(timeMin, timeMax);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
            <p className="text-xs text-muted-foreground">
              {format(currentDate, "EEEE, MMMM d, yyyy")}
            </p>
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
    </>
  );
}
