import type { BrainCard } from "@/types/card";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { isToday, isPast, parseISO, format, differenceInDays } from "date-fns";

const MILESTONE_KEYWORDS = ["birthday", "anniversary", "bday", "b-day"];

function isMilestoneEvent(event: CalendarEvent): boolean {
  const summary = (event.summary || "").toLowerCase();
  return MILESTONE_KEYWORDS.some((kw) => summary.includes(kw));
}

export function generateDailyOrientation(
  cards: BrainCard[],
  calendarEvents: CalendarEvent[]
): string {
  const active = cards.filter((c) => c.status === "active" && c.body !== "@@PARSING@@");
  const scheduled = cards.filter((c) => c.status === "scheduled");
  const overdue = scheduled.filter((c) => c.dueAt && isPast(parseISO(c.dueAt)) && !isToday(parseISO(c.dueAt)));
  const dueToday = scheduled.filter((c) => c.dueAt && isToday(parseISO(c.dueAt)));

  const todayEvents = calendarEvents.filter((e) => {
    const start = e.start.dateTime || e.start.date;
    return start ? isToday(parseISO(start)) : false;
  });

  const milestones = calendarEvents
    .filter(isMilestoneEvent)
    .map((e) => {
      const start = e.start.dateTime || e.start.date;
      const startDate = start ? parseISO(start) : new Date();
      const daysAway = differenceInDays(startDate, new Date());
      return { ...e, startDate, daysAway };
    })
    .filter((e) => e.daysAway >= 0 && e.daysAway <= 7)
    .sort((a, b) => a.daysAway - b.daysAway);

  const lines: string[] = ["Good morning.", ""];

  // Milestones
  if (milestones.length > 0) {
    milestones.forEach((m) => {
      const when = m.daysAway === 0 ? "Today" : m.daysAway === 1 ? "Tomorrow" : format(m.startDate, "EEEE");
      lines.push(`🎂 ${m.summary} — ${when}`);
    });
    lines.push("");
  }

  // Today
  const todayItems: string[] = [];
  todayEvents
    .filter((e) => !isMilestoneEvent(e))
    .slice(0, 3)
    .forEach((e) => {
      const time = e.start.dateTime ? format(parseISO(e.start.dateTime), "h:mm a") : "All day";
      todayItems.push(`${time} — ${e.summary}`);
    });
  dueToday.slice(0, 2).forEach((c) => todayItems.push(c.title || "Untitled"));
  overdue.slice(0, 2).forEach((c) => todayItems.push(`${c.title || "Untitled"} (overdue)`));

  if (todayItems.length > 0) {
    lines.push("Today:");
    todayItems.forEach((t) => lines.push(`• ${t}`));
    lines.push("");
  }

  // Holding
  if (active.length > 0) {
    lines.push("Holding:");
    active.slice(0, 3).forEach((c) => lines.push(`• ${c.title || c.body.split("\n")[0].substring(0, 50) || "Unnamed"}`));
    if (active.length > 3) lines.push(`• +${active.length - 3} more`);
    lines.push("");
  }

  // Coming up
  const upcoming = scheduled.filter((c) => c.dueAt && !isToday(parseISO(c.dueAt!)) && !isPast(parseISO(c.dueAt!)));
  if (upcoming.length > 0) {
    lines.push("Coming up:");
    upcoming.slice(0, 2).forEach((c) => {
      const date = c.dueAt ? format(parseISO(c.dueAt), "MMM d") : "";
      lines.push(`• ${date} — ${c.title || "Untitled"}`);
    });
  }

  // If nothing at all
  if (todayItems.length === 0 && active.length === 0 && upcoming.length === 0 && milestones.length === 0) {
    lines.push("Nothing pressing. Everything is here.");
  }

  return lines.join("\n");
}
