import type { BrainCard } from "@/types/card";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { isToday, isPast, parseISO, format } from "date-fns";

export function generateDailyBrief(
  cards: BrainCard[],
  calendarEvents: CalendarEvent[]
): string {
  const inbox = cards.filter(c => c.status === "inbox" && c.body !== "@@PARSING@@");
  const routed = cards.filter(c => c.status === "routed");
  const overdue = routed.filter(c => c.dueAt && isPast(parseISO(c.dueAt)) && !isToday(parseISO(c.dueAt)));
  const dueToday = routed.filter(c => c.dueAt && isToday(parseISO(c.dueAt)));

  const todayEvents = calendarEvents.filter(e => {
    const start = e.start.dateTime || e.start.date;
    return start ? isToday(parseISO(start)) : false;
  });

  const lines: string[] = ["Good morning.", ""];

  // Today section
  const todayItems: string[] = [];
  todayEvents.slice(0, 3).forEach(e => {
    const time = e.start.dateTime ? format(parseISO(e.start.dateTime), "h:mm a") : "All day";
    todayItems.push(`${time} — ${e.summary}`);
  });
  dueToday.slice(0, 2).forEach(c => todayItems.push(c.title || "Untitled item"));
  overdue.slice(0, 2).forEach(c => todayItems.push(`⚠ ${c.title || "Untitled"} (overdue)`));

  if (todayItems.length > 0) {
    lines.push("Today:");
    todayItems.forEach(t => lines.push(`• ${t}`));
    lines.push("");
  }

  // Unresolved
  if (inbox.length > 0) {
    lines.push("Unresolved:");
    inbox.slice(0, 3).forEach(c => lines.push(`• ${c.title || c.body.split("\n")[0].substring(0, 50) || "New note"}`));
    if (inbox.length > 3) lines.push(`• +${inbox.length - 3} more`);
    lines.push("");
  }

  // Upcoming
  const upcoming = routed.filter(c => c.dueAt && !isToday(parseISO(c.dueAt!)) && !isPast(parseISO(c.dueAt!)));
  if (upcoming.length > 0) {
    lines.push("Upcoming:");
    upcoming.slice(0, 2).forEach(c => {
      const date = c.dueAt ? format(parseISO(c.dueAt), "MMM d") : "";
      lines.push(`• ${date} — ${c.title || "Untitled"}`);
    });
  }

  return lines.join("\n");
}
