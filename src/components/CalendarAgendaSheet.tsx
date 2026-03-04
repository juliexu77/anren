import { useState, useMemo } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { CalendarTimeGrid } from "@/components/calendar/CalendarTimeGrid";

interface Props {
  events: CalendarEvent[];
  open: boolean;
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarAgendaSheet({ events, open, onClose, onEventClick }: Props) {
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const agendaDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i)),
    []
  );

  const selectedDate = agendaDays[selectedDateIndex];

  const getChipLabel = (date: Date) => {
    if (isSameDay(date, new Date())) return "Today";
    if (isSameDay(date, addDays(new Date(), 1))) return "Tmrw";
    return format(date, "EEE");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { onClose(); setSelectedDateIndex(0); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[90vh] p-0 max-w-xl mx-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-2" style={{ background: "hsl(var(--background))" }}>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="font-display"
              style={{ fontSize: "24px", fontWeight: 400, color: "hsl(var(--text))" }}
            >
              {format(selectedDate, "MMM d")}
              <span style={{ color: "hsl(var(--text) / 0.35)", fontWeight: 400 }}>
                {" · "}{format(selectedDate, "EEEE")}
              </span>
            </h2>
            <button onClick={onClose} className="p-2 -mr-2">
              <X className="w-5 h-5" style={{ color: "hsl(var(--text-muted))" }} />
            </button>
          </div>

          {/* Day chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {agendaDays.map((date, i) => {
              const isSelected = i === selectedDateIndex;
              const isToday = isSameDay(date, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDateIndex(i)}
                  className="shrink-0 flex flex-col items-center rounded-xl px-3 py-1.5 transition-colors"
                  style={{
                    background: isSelected ? "hsl(var(--primary) / 0.15)" : "transparent",
                    minWidth: "52px",
                  }}
                >
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: isSelected
                        ? "hsl(var(--primary))"
                        : "hsl(var(--text) / 0.4)",
                    }}
                  >
                    {getChipLabel(date)}
                  </span>
                  <span
                    className="text-[15px] font-medium mt-0.5"
                    style={{
                      color: isSelected
                        ? "hsl(var(--primary))"
                        : isToday
                          ? "hsl(var(--text))"
                          : "hsl(var(--text) / 0.6)",
                    }}
                  >
                    {format(date, "d")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time grid */}
        <CalendarTimeGrid
          dates={[selectedDate]}
          events={events}
          onEventClick={onEventClick}
        />
      </SheetContent>
    </Sheet>
  );
}
