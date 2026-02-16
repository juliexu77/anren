import { format, isSameDay, addDays, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarViewMode = "day" | "3day" | "week";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onTitleClick?: () => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  onTitleClick,
}: CalendarHeaderProps) {
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="px-4 pt-2 pb-2 space-y-2">
      {/* Row 1: Nav + title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <button onClick={onTitleClick} className="text-sm font-semibold text-foreground">
          {format(currentDate, "MMMM yyyy")}
        </button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs rounded-full px-3"
          onClick={onToday}
          disabled={isToday}
        >
          Today
        </Button>
      </div>

      {/* Row 2: View mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg p-0.5" style={{ background: "hsl(var(--muted))" }}>
          {(["day", "3day", "week"] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "3day" ? "3 Day" : mode === "day" ? "Day" : "Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Day column headers for multi-day views */}
      {viewMode !== "day" && (
        <DayHeaders currentDate={currentDate} viewMode={viewMode} />
      )}
    </div>
  );
}

function DayHeaders({ currentDate, viewMode }: { currentDate: Date; viewMode: CalendarViewMode }) {
  const count = viewMode === "3day" ? 3 : 7;
  const startOffset = viewMode === "week" ? -currentDate.getDay() : 0;
  const dates = Array.from({ length: count }, (_, i) => addDays(currentDate, startOffset + i));

  return (
    <div className="flex pl-12">
      {dates.map((d: Date, i: number) => {
        const isToday = isSameDay(d, new Date());
        return (
          <div key={i} className="flex-1 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">
              {format(d, "EEE")}
            </p>
            <p
              className={`text-sm font-semibold ${
                isToday
                  ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                  : "text-foreground"
              }`}
            >
              {format(d, "d")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
