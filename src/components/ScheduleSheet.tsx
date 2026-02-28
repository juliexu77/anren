import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import type { BrainCard } from "@/types/card";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { format, addHours } from "date-fns";

interface Props {
  card: BrainCard | null;
  open: boolean;
  onClose: () => void;
  onCreateEvent: (event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
  }) => Promise<any>;
  onUpdateCard: (id: string, updates: any) => Promise<void>;
}

export function ScheduleSheet({ card, open, onClose, onCreateEvent, onUpdateCard }: Props) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const defaultDate = format(now, "yyyy-MM-dd");
  const defaultTime = format(addHours(now, 1), "HH:00");

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const startDt = new Date(`${date}T${time}`);
      const endDt = addHours(startDt, 1);
      const event = await onCreateEvent({
        summary: card.title || card.body.split("\n")[0].substring(0, 60) || "Anren item",
        description: card.body,
        start: { dateTime: startDt.toISOString(), timeZone: tz },
        end: { dateTime: endDt.toISOString(), timeZone: tz },
      });
      if (event?.id) {
        await onUpdateCard(card.id, {
          status: "scheduled",
          type: "event",
          googleEventId: event.id,
          dueAt: startDt.toISOString(),
        });
      }
      onClose();
    } catch {
      // error already toasted by hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle className="text-sheet-title">Schedule</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <p className="text-caption truncate" style={{ color: "hsl(var(--text))" }}>
            {card?.title || card?.body?.split("\n")[0]?.substring(0, 60) || ""}
          </p>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-label mb-1 block" style={{ color: "hsl(var(--text-muted))" }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="w-28">
              <label className="text-label mb-1 block" style={{ color: "hsl(var(--text-muted))" }}>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-button font-medium transition-colors"
            style={{
              background: "hsl(var(--accent-1))",
              color: "hsl(40 30% 97%)",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Scheduling…" : "Add to Calendar"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
