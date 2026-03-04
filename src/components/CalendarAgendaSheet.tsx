import { useMemo } from "react";
import { format, parseISO, addDays, startOfDay, isSameDay } from "date-fns";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";

interface Props {
  events: CalendarEvent[];
  open: boolean;
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarAgendaSheet({ events, open, onClose, onEventClick }: Props) {
  const agendaDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)),
    []
  );

  const getEventsForDay = (date: Date) =>
    events.filter((e) => {
      const eventDate = e.start.dateTime
        ? parseISO(e.start.dateTime)
        : e.start.date
          ? parseISO(e.start.date)
          : null;
      return eventDate && isSameDay(eventDate, date);
    });

  const getDayLabel = (date: Date) => {
    if (isSameDay(date, new Date())) return "Today";
    if (isSameDay(date, addDays(new Date(), 1))) return "Tomorrow";
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-auto p-0 max-w-xl mx-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3" style={{ background: "hsl(var(--background))" }}>
          <h2
            className="font-display"
            style={{ fontSize: "24px", fontWeight: 400, color: "hsl(var(--text))" }}
          >
            Calendar
          </h2>
          <button onClick={onClose} className="p-2 -mr-2">
            <X className="w-5 h-5" style={{ color: "hsl(var(--text-muted))" }} />
          </button>
        </div>

        <div className="px-5 pb-8">
          {agendaDays.map((date) => {
            const dayLabel = getDayLabel(date);
            const dayEvents = getEventsForDay(date);

            return (
              <div key={date.toISOString()}>
                <div
                  className="flex items-baseline gap-2 py-4"
                  style={{ borderBottom: "1px solid hsl(var(--divider) / 0.15)" }}
                >
                  <span
                    className="font-display"
                    style={{ fontSize: "18px", fontWeight: 400, color: "hsl(var(--text))" }}
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
                  <span style={{ fontSize: "15px", fontWeight: 400, color: "hsl(var(--text) / 0.35)" }}>
                    {format(date, "EEEE")}
                  </span>
                </div>

                {dayEvents.length > 0 && (
                  <div className="py-2 space-y-1.5">
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        className="w-full text-left px-3 py-2.5 rounded-lg transition-colors active:opacity-60"
                      >
                        <p
                          className="text-caption"
                          style={{ color: "hsl(var(--text) / 0.85)" }}
                        >
                          {ev.summary}
                        </p>
                        {ev.start.dateTime && (
                          <p
                            className="text-micro"
                            style={{ color: "hsl(var(--text) / 0.4)", marginTop: "2px" }}
                          >
                            {format(parseISO(ev.start.dateTime), "h:mm a")}
                            {ev.end.dateTime && ` – ${format(parseISO(ev.end.dateTime), "h:mm a")}`}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {dayEvents.length === 0 && (
                  <div className="py-3 px-3">
                    <p className="text-micro" style={{ color: "hsl(var(--text-muted))" }}>No events</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
