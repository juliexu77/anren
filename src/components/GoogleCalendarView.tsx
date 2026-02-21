import { useEffect, useState, useCallback, useMemo } from "react";
import { useGoogleCalendar, type CalendarEvent } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader, type CalendarViewMode } from "@/components/calendar/CalendarHeader";
import { CalendarTimeGrid } from "@/components/calendar/CalendarTimeGrid";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfDay,
  isSameDay,
  parseISO,
} from "date-fns";
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
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
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
      window.location.href = result.url;
    } catch (e: any) {
      console.error("Connect error:", e);
      setConnecting(false);
    }
  }, []);

  // Compute visible date range
  const visibleDates = useMemo(() => {
    if (viewMode === "day") return [currentDate];
    if (viewMode === "3day") return [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)];
    // week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentDate, viewMode]);

  // Fetch events for visible range (with buffer)
  useEffect(() => {
    if (calendarConnected) {
      const first = visibleDates[0];
      const last = visibleDates[visibleDates.length - 1];
      const timeMin = subDays(first, 1).toISOString();
      const timeMax = addDays(last, 2).toISOString();
      fetchEvents(timeMin, timeMax);
    }
  }, [currentDate, viewMode, fetchEvents, calendarConnected]);

  const handlePrev = () => {
    const step = viewMode === "day" ? 1 : viewMode === "3day" ? 3 : 7;
    setCurrentDate((d) => subDays(d, step));
  };

  const handleNext = () => {
    const step = viewMode === "day" ? 1 : viewMode === "3day" ? 3 : 7;
    setCurrentDate((d) => addDays(d, step));
  };

  const handleToday = () => setCurrentDate(new Date());

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
      // Refetch
      const first = visibleDates[0];
      const last = visibleDates[visibleDates.length - 1];
      fetchEvents(subDays(first, 1).toISOString(), addDays(last, 2).toISOString());
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
    <div className="flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onTitleClick={() => setShowMiniCal(true)}
      />

      {/* Day label for single day view */}
      {viewMode === "day" && (
        <div className="px-4 pb-1 pl-16">
          <p className="text-[10px] text-muted-foreground uppercase">
            {format(currentDate, "EEEE")}
          </p>
          <p
            className={`text-xl font-semibold ${
              isSameDay(currentDate, new Date())
                ? "text-primary"
                : "text-foreground"
            }`}
          >
            {format(currentDate, "d")}
          </p>
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="flex justify-center py-12 flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CalendarTimeGrid
          dates={visibleDates}
          events={events}
          onEventClick={setSelectedEvent}
        />
      )}

      {/* Mini calendar picker sheet */}
      <Sheet open={showMiniCal} onOpenChange={setShowMiniCal}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <div className="flex justify-center pb-4">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(d) => {
                if (d) {
                  setCurrentDate(d);
                  setShowMiniCal(false);
                }
              }}
              className="rounded-2xl"
            />
          </div>
        </SheetContent>
      </Sheet>

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
                      const first = visibleDates[0];
                      const last = visibleDates[visibleDates.length - 1];
                      fetchEvents(subDays(first, 1).toISOString(), addDays(last, 2).toISOString());
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
    </div>
  );
}
