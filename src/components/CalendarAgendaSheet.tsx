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

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      setSelectedDate((prev) => addDays(prev, dx < 0 ? 1 : -1));
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  const chipDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i - 3)),
    [selectedDate]
  );

  const getChipLabel = (date: Date) => {
    if (isSameDay(date, new Date())) return "Today";
    if (isSameDay(date, addDays(new Date(), 1))) return "Tmrw";
    return format(date, "EEE");
  };

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
      <SheetContent side="bottom" className="rounded-t-3xl h-[100dvh] p-0 max-w-xl mx-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 pb-2 bg-background" style={{ paddingTop: "max(20px, env(safe-area-inset-top, 20px))" }}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 p-1 -ml-1"
              aria-label="Back to home"
            >
              <ChevronLeft className="w-5 h-5 text-text-primary/50" />
              <span className="text-[13px] font-medium text-text-primary/50">Home</span>
            </button>
            <div className="w-8" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                setMonthPickerDate(selectedDate);
                setShowMonthPicker((v) => !v);
              }}
              className="font-display text-left flex items-center gap-2 text-[24px] font-normal text-text-primary"
            >
              {format(selectedDate, "MMMM yyyy")}
              <span
                className={`inline-flex items-center justify-center rounded-full transition-colors w-7 h-7 ${
                  showMonthPicker ? "bg-primary/15" : "bg-text-primary/8"
                }`}
              >
                <span className={`text-[12px] ${showMonthPicker ? "text-primary" : "text-text-primary/50"}`}>
                  {showMonthPicker ? "▲" : "▼"}
                </span>
              </span>
            </button>
          </div>

          {/* Month picker dropdown */}
          {showMonthPicker && (
            <div className="pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setMonthPickerDate((d) => subMonths(d, 1))}
                  className="p-1.5 rounded-lg hover:bg-surface-color/60"
                >
                  <ChevronLeft className="w-4 h-4 text-text-primary/50" />
                </button>
                <span className="text-sm font-medium text-text-primary">
                  {format(monthPickerDate, "MMMM yyyy")}
                </span>
                <button
                  onClick={() => setMonthPickerDate((d) => addMonths(d, 1))}
                  className="p-1.5 rounded-lg hover:bg-surface-color/60"
                >
                  <ChevronRight className="w-4 h-4 text-text-primary/50" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-text-primary/35">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-0.5">
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
                      className={`flex items-center justify-center h-8 w-8 mx-auto rounded-full text-[13px] font-medium transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday
                            ? "text-primary"
                            : "text-text-primary/70"
                      }`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day chips */}
          {!showMonthPicker && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
              {chipDays.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(startOfDay(date))}
                    className={`shrink-0 flex flex-col items-center rounded-xl px-3 py-1.5 transition-colors min-w-[52px] ${
                      isSelected ? "bg-primary/15" : ""
                    }`}
                  >
                    <span
                      className={`text-[11px] font-medium ${
                        isSelected ? "text-primary" : "text-text-primary/40"
                      }`}
                    >
                      {getChipLabel(date)}
                    </span>
                    <span
                      className={`text-[15px] font-medium mt-0.5 ${
                        isSelected
                          ? "text-primary"
                          : isToday
                            ? "text-text-primary"
                            : "text-text-primary/60"
                      }`}
                    >
                      {format(date, "d")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Time grid */}
        <div className="flex-1 min-h-0 overflow-hidden">
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
