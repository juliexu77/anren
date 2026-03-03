import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import type { BrainCard } from "@/types/card";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { generateDailyOrientation } from "@/lib/dailyOrientation";

interface Props {
  cards: BrainCard[];
  calendarEvents: CalendarEvent[];
  onDismiss: () => void;
}

export function DailyBriefOverlay({ cards, calendarEvents, onDismiss }: Props) {
  const orientation = useMemo(
    () => generateDailyOrientation(cards, calendarEvents),
    [cards, calendarEvents]
  );

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    const t = setTimeout(onDismiss, 60_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 animate-in fade-in duration-700"
      style={{ background: "hsl(var(--bg))" }}
    >
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-14 right-5 p-2 rounded-lg transition-colors"
        style={{ color: "hsl(var(--text-muted))" }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Content */}
      <div className="max-w-sm w-full space-y-6">
        <h1
          className="text-h2 text-center"
          style={{
            fontFamily: "var(--font-serif)",
            color: "hsl(var(--text))",
            fontWeight: 400,
          }}
        >
          Your day
        </h1>

        <div
          className="rounded-xl px-5 py-4"
          style={{
            background: "hsl(var(--card-bg) / 0.6)",
            border: "1px solid hsl(var(--divider) / 0.15)",
          }}
        >
          <pre
            className="text-body-sm whitespace-pre-wrap font-sans"
            style={{
              color: "hsl(var(--text-secondary))",
              lineHeight: "1.7",
            }}
          >
            {orientation}
          </pre>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl text-button transition-all active:scale-[0.98]"
          style={{
            background: "hsl(var(--surface) / 0.7)",
            border: "1px solid hsl(var(--divider) / 0.25)",
            color: "hsl(var(--text))",
          }}
        >
          I'm ready
        </button>
      </div>
    </div>
  );
}
