import { format, parseISO } from "date-fns";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";

interface Props {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function CalendarEventSheet({ event, open, onClose, onDelete }: Props) {
  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display text-lg">{event.summary}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {event.start.dateTime && (
            <p className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>
              {format(parseISO(event.start.dateTime), "EEEE, MMM d · h:mm a")}
              {event.end.dateTime && ` – ${format(parseISO(event.end.dateTime), "h:mm a")}`}
            </p>
          )}
          {event.start.date && !event.start.dateTime && (
            <p className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>All day</p>
          )}
          {event.description && (
            <p className="text-sm" style={{ color: "hsl(var(--text-muted))" }}>{event.description}</p>
          )}
          <div className="flex gap-2 pt-2">
            {event.htmlLink && (
              <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="flex-1">
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
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
