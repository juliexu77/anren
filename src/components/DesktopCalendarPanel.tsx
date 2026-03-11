import { useMemo, useCallback } from "react";
import { format, addDays, startOfDay, isSameDay, parseISO } from "date-fns";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";

interface Props {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function DesktopCalendarPanel({ events, onEventClick }: Props) {
  const agendaDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)),
    []
  );

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

  const getDayLabel = (date: Date) => {
    if (isSameDay(date, new Date())) return "Today";
    if (isSameDay(date, addDays(new Date(), 1))) return "Tomorrow";
    return null;
  };

  return (
    <div className="h-full overflow-y-auto pb-8">
      <div className="px-5 pt-4 pb-2">
        <h2
          className="font-display text-text-primary"
          style={{ fontSize: "24px", fontWeight: 400 }}
        >
          Calendar
        </h2>
      </div>

      <div className="px-5">
        {agendaDays.map((date) => {
          const dayLabel = getDayLabel(date);
          const dayEvents = getEventsForDay(date);

          return (
            <div key={date.toISOString()}>
              <div
                className="flex items-baseline gap-2 py-3"
                style={{ borderBottom: "1px solid hsl(var(--divider) / 0.15)" }}
              >
                <span className="font-display text-text-primary" style={{ fontSize: "16px", fontWeight: 400 }}>
                  {format(date, "MMM d")}
                </span>
                {dayLabel && (
                  <>
                    <span style={{ fontSize: "12px", color: "hsl(var(--text) / 0.3)" }}>·</span>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 400,
                        color: isSameDay(date, new Date())
                          ? "hsl(var(--accent-1))"
                          : "hsl(var(--text) / 0.5)",
                      }}
                    >
                      {dayLabel}
                    </span>
                  </>
                )}
                <span style={{ fontSize: "12px", color: "hsl(var(--text) / 0.3)" }}>·</span>
                <span style={{ fontSize: "14px", fontWeight: 400, color: "hsl(var(--text) / 0.35)" }}>
                  {format(date, "EEE")}
                </span>
              </div>

              {dayEvents.length > 0 && (
                <div className="py-1.5 space-y-0.5">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-surface-color/60"
                    >
                      <p className="text-caption text-text-primary/85">{ev.summary}</p>
                      {ev.start.dateTime && (
                        <p className="text-micro text-text-muted-color mt-0.5">
                          {format(parseISO(ev.start.dateTime), "h:mm a")}
                          {ev.end?.dateTime && ` – ${format(parseISO(ev.end.dateTime), "h:mm a")}`}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {dayEvents.length === 0 && isSameDay(date, new Date()) && (
                <div className="py-2 px-3">
                  <p className="text-micro text-text-muted-color italic">Nothing scheduled</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
