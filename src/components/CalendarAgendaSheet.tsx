import { useState, useMemo, useRef, useCallback } from "react";
import { format, addDays, startOfDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from "date-fns";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerDate, setMonthPickerDate] = useState<Date>(new Date());

  // Touch/swipe state
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      setSelectedDate((prev) => addDays(prev, diff < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  }, []);

  // Generate day chips: 3 days before + selected + 3 days after
  const chipDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 3)),
    [selectedDate]
  );

  const getChipLabel = (date: Date) => {
    if (isSameDay(date, new Date())) return "Today";
    if (isSameDay(date, addDays(new Date(), 1))) return "Tmrw";
    return format(date, "EEE");
  };

  // Month picker grid
  const monthDays = useMemo(() => {
    const start = startOfMonth(monthPickerDate);
    const end = endOfMonth(monthPickerDate);
    return eachDayOfInterval({ start, end });
  }, [monthPickerDate]);

  const monthStartDow = getDay(startOfMonth(monthPickerDate));

  const handleSelectFromMonth = (date: Date) => {
    setSelectedDate(startOfDay(date));
    setShowMonthPicker(false);
  };

  const handleClose = () => {
    onClose();
    setSelectedDate(startOfDay(new Date()));
    setShowMonthPicker(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] p-0 max-w-xl mx-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 pb-2" style={{ background: "hsl(var(--background))", paddingTop: "max(20px, env(safe-area-inset-top, 20px))" }}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 p-1 -ml-1"
              aria-label="Back to home"
            >
              <ChevronLeft className="w-5 h-5" style={{ color: "hsl(var(--text) / 0.5)" }} />
              <span className="text-[13px] font-medium" style={{ color: "hsl(var(--text) / 0.5)" }}>Home</span>
            </button>
            <button onClick={handleClose} className="p-2 -mr-2">
              <X className="w-5 h-5" style={{ color: "hsl(var(--text-muted))" }} />
            </button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                setMonthPickerDate(selectedDate);
                setShowMonthPicker((v) => !v);
              }}
              className="font-display text-left flex items-center gap-2"
              style={{ fontSize: "24px", fontWeight: 400, color: "hsl(var(--text))" }}
            >
              {format(selectedDate, "MMMM yyyy")}
              <span
                className="inline-flex items-center justify-center rounded-full transition-colors"
                style={{
                  width: "28px",
                  height: "28px",
                  background: showMonthPicker ? "hsl(var(--primary) / 0.15)" : "hsl(var(--text) / 0.08)",
                }}
              >
                <span className="text-[12px]" style={{ color: showMonthPicker ? "hsl(var(--primary))" : "hsl(var(--text) / 0.5)" }}>
                  {showMonthPicker ? "▲" : "▼"}
                </span>
              </span>
            </button>
          </div>

          {/* Month picker dropdown */}
          {showMonthPicker && (
            <div className="pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setMonthPickerDate((d) => subMonths(d, 1))}
                  className="p-1.5 rounded-lg hover:bg-foreground/5"
                >
                  <ChevronLeft className="w-4 h-4" style={{ color: "hsl(var(--text) / 0.5)" }} />
                </button>
                <span className="text-sm font-medium" style={{ color: "hsl(var(--text))" }}>
                  {format(monthPickerDate, "MMMM yyyy")}
                </span>
                <button
                  onClick={() => setMonthPickerDate((d) => addMonths(d, 1))}
                  className="p-1.5 rounded-lg hover:bg-foreground/5"
                >
                  <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--text) / 0.5)" }} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium" style={{ color: "hsl(var(--text) / 0.35)" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {/* Empty cells for offset */}
                {Array.from({ length: monthStartDow }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {monthDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleSelectFromMonth(day)}
                      className="flex items-center justify-center h-8 w-8 mx-auto rounded-full text-[13px] font-medium transition-colors"
                      style={{
                        background: isSelected ? "hsl(var(--primary))" : "transparent",
                        color: isSelected
                          ? "hsl(var(--primary-foreground))"
                          : isToday
                            ? "hsl(var(--primary))"
                            : "hsl(var(--text) / 0.7)",
                      }}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day chips – scrollable */}
          <div
            className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {chipDays.map((date, i) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(startOfDay(date))}
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

        {/* Time grid – swipeable */}
        <div
          className="flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <CalendarTimeGrid
            dates={[selectedDate]}
            events={events}
            onEventClick={onEventClick}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
