import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CalendarPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-6">
        <Calendar className="w-10 h-10 text-primary/50" />
      </div>
      <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
        Calendar Coming Soon
      </h2>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-6">
        Connect your Google Calendar to see your events alongside your brain dumps.
      </p>
      <Button variant="outline" disabled className="rounded-full">
        Connect Google Calendar
      </Button>
    </div>
  );
}
