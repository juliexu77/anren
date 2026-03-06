import { useMemo, useRef, useEffect } from "react";
import { format, parseISO, isSameDay, differenceInMinutes, startOfDay } from "date-fns";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";

const HOUR_HEIGHT = 60; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface CalendarTimeGridProps {
  dates: Date[];
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

function getEventPosition(event: CalendarEvent, date: Date) {
  const startStr = event.start.dateTime;
  const endStr = event.end.dateTime;
  if (!startStr || !endStr) return null;

  const start = parseISO(startStr);
  const end = parseISO(endStr);
  if (!isSameDay(start, date)) return null;

  const dayStart = startOfDay(date);
  const topMinutes = differenceInMinutes(start, dayStart);
  const durationMinutes = Math.max(differenceInMinutes(end, start), 15);

  return {
    top: (topMinutes / 60) * HOUR_HEIGHT,
    height: (durationMinutes / 60) * HOUR_HEIGHT,
  };
}

function getAllDayEvents(events: CalendarEvent[], date: Date) {
  return events.filter((e) => {
    if (e.start.date && !e.start.dateTime) {
      const eventDate = parseISO(e.start.date);
      return isSameDay(eventDate, date);
    }
    return false;
  });
}

export function CalendarTimeGrid({ dates, events, onEventClick }: CalendarTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const isMultiDay = dates.length > 1;

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const scrollTo = (now.getHours() - 1) * HOUR_HEIGHT;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, scrollTo);
    }
  }, []);

  // Current time position
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;

  // Collect all-day events per date
  const allDayByDate = useMemo(() => {
    return dates.map((d) => getAllDayEvents(events, d));
  }, [dates, events]);

  const hasAllDay = allDayByDate.some((arr) => arr.length > 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day header row */}
      <div className="flex border-b border-divider-color/25 px-0">
        {/* Gutter */}
        <div className="w-12 shrink-0 flex flex-col items-center justify-center py-1.5">
          {dates.length === 1 && (
            <>
              <span className="text-[11px] font-medium text-text-muted-color uppercase leading-none">
                {format(dates[0], "EEE")}
              </span>
              <span
                className={`text-[22px] font-bold leading-none mt-0.5 w-9 h-9 flex items-center justify-center rounded-full ${
                  isSameDay(dates[0], now)
                    ? "bg-primary text-primary-foreground"
                    : "text-text-primary"
                }`}
              >
                {format(dates[0], "d")}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-1">
          {isMultiDay &&
            dates.map((date, i) => {
              const isToday = isSameDay(date, now);
              return (
                <div key={i} className="flex-1 flex flex-col items-center py-1.5 min-w-0">
                  <span className="text-[11px] font-medium text-text-muted-color uppercase leading-none">
                    {format(date, "EEE")}
                  </span>
                  <span
                    className={`text-[22px] font-bold leading-none mt-0.5 w-9 h-9 flex items-center justify-center rounded-full ${
                      isToday ? "bg-primary text-primary-foreground" : "text-text-primary"
                    }`}
                  >
                    {format(date, "d")}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* All-day events strip */}
      {hasAllDay && (
        <div className="flex border-b border-divider-color/25 px-0">
          <div className="w-12 shrink-0" />
          <div className="flex flex-1">
            {dates.map((date, i) => (
              <div key={i} className="flex-1 px-0.5 py-1 min-w-0">
                {allDayByDate[i].map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick?.(ev)}
                    className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary truncate mb-0.5"
                  >
                    {ev.summary}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Time labels gutter */}
          <div className="w-12 shrink-0 relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-text-muted-color leading-none"
                style={{ top: h * HOUR_HEIGHT - 5 }}
              >
                {h === 0 ? "" : format(new Date(2000, 0, 1, h), "h a")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex flex-1 relative">
            {dates.map((date, colIdx) => {
              const isToday = isSameDay(date, now);
              const colEvents = events.filter((e) => {
                if (!e.start.dateTime) return false;
                return isSameDay(parseISO(e.start.dateTime), date);
              });

              return (
                <div
                  key={colIdx}
                  className={`flex-1 relative ${colIdx > 0 ? "border-l border-divider-color/25" : ""}`}
                >
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-divider-color/15"
                      style={{ top: h * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Half-hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={`half-${h}`}
                      className="absolute left-0 right-0 border-t border-divider-color/8"
                      style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Events */}
                  {colEvents.map((event) => {
                    const pos = getEventPosition(event, date);
                    if (!pos) return null;
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden text-left transition-opacity hover:opacity-80 bg-primary/20 border-l-[3px] border-primary"
                        style={{
                          top: pos.top,
                          height: Math.max(pos.height, 18),
                        }}
                      >
                        <p className="text-[10px] font-medium text-text-primary truncate leading-tight">
                          {event.summary}
                        </p>
                        {pos.height > 30 && event.start.dateTime && (
                          <p className="text-[9px] text-text-muted-color leading-tight">
                            {format(parseISO(event.start.dateTime), "h:mm a")}
                          </p>
                        )}
                      </button>
                    );
                  })}

                  {/* Current time indicator — accent color, not red */}
                  {isToday && (
                    <div
                      ref={nowLineRef}
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full -ml-1 bg-accent-1" />
                        <div className="flex-1 h-[1.5px] bg-accent-1" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
