import type { BrainCard } from "@/types/card";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { isToday, isPast, parseISO, format, differenceInDays } from "date-fns";

const MILESTONE_KEYWORDS = ["birthday", "anniversary", "bday", "b-day"];

function isMilestoneEvent(event: CalendarEvent): boolean {
  const summary = (event.summary || "").toLowerCase();
  return MILESTONE_KEYWORDS.some((kw) => summary.includes(kw));
}

export interface OrientationLine {
  text: string;
  type: "greeting" | "milestone" | "today" | "holding" | "holding-more" | "upcoming" | "empty" | "spacer" | "section-header";
  cardId?: string;
}

export function generateDailyOrientation(
  cards: BrainCard[],
  calendarEvents: CalendarEvent[]
): OrientationLine[] {
  const active = cards.filter((c) => c.status === "active" && c.body !== "@@PARSING@@");
  const scheduled = cards.filter((c) => c.status === "scheduled");
  const overdue = scheduled.filter((c) => c.dueAt && isPast(parseISO(c.dueAt)) && !isToday(parseISO(c.dueAt)));
  const dueToday = scheduled.filter((c) => c.dueAt && isToday(parseISO(c.dueAt)));

  const seenEvents = new Set<string>();
  const todayEvents = calendarEvents.filter((e) => {
    const start = e.start.dateTime || e.start.date;
    if (!start || !isToday(parseISO(start))) return false;
    const key = `${(e.summary || "").trim().toLowerCase()}|${start}`;
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
  });

  const seenMilestones = new Set<string>();
  const milestones = calendarEvents
    .filter(isMilestoneEvent)
    .map((e) => {
      const start = e.start.dateTime || e.start.date;
      const startDate = start ? parseISO(start) : new Date();
      const daysAway = differenceInDays(startDate, new Date());
      return { ...e, startDate, daysAway };
    })
    .filter((e) => {
      if (e.daysAway < 0 || e.daysAway > 7) return false;
      const key = `${(e.summary || "").trim().toLowerCase()}|${e.start.dateTime || e.start.date}`;
      if (seenMilestones.has(key)) return false;
      seenMilestones.add(key);
      return true;
    })
    .sort((a, b) => a.daysAway - b.daysAway);

  const lines: OrientationLine[] = [{ text: "Good morning.", type: "greeting" }, { text: "", type: "spacer" }];

  // Milestones
  if (milestones.length > 0) {
    milestones.forEach((m) => {
      const when = m.daysAway === 0 ? "Today" : m.daysAway === 1 ? "Tomorrow" : format(m.startDate, "EEEE");
      lines.push({ text: `🎂 ${m.summary} — ${when}`, type: "milestone" });
    });
    lines.push({ text: "", type: "spacer" });
  }

  // Today
  const todayItems: OrientationLine[] = [];
  todayEvents
    .filter((e) => !isMilestoneEvent(e))
    .slice(0, 3)
    .forEach((e) => {
      const time = e.start.dateTime ? format(parseISO(e.start.dateTime), "h:mm a") : "All day";
      todayItems.push({ text: `${time} — ${e.summary}`, type: "today" });
    });
  dueToday.slice(0, 2).forEach((c) => todayItems.push({ text: c.title || "Untitled", type: "today", cardId: c.id }));
  overdue.slice(0, 2).forEach((c) => todayItems.push({ text: `${c.title || "Untitled"} (overdue)`, type: "today", cardId: c.id }));

  if (todayItems.length > 0) {
    lines.push({ text: "Today:", type: "section-header" });
    todayItems.forEach((t) => lines.push({ ...t, text: `• ${t.text}` }));
    lines.push({ text: "", type: "spacer" });
  }

  // Holding
  if (active.length > 0) {
    lines.push({ text: "Holding:", type: "section-header" });
    active.slice(0, 3).forEach((c) => lines.push({
      text: `• ${c.title || c.body.split("\n")[0].substring(0, 50) || "Unnamed"}`,
      type: "holding",
      cardId: c.id,
    }));
    if (active.length > 3) lines.push({ text: `and ${active.length - 3} others resting here`, type: "holding-more" });
    lines.push({ text: "", type: "spacer" });
  }

  // Coming up
  const upcoming = scheduled.filter((c) => c.dueAt && !isToday(parseISO(c.dueAt!)) && !isPast(parseISO(c.dueAt!)));
  if (upcoming.length > 0) {
    lines.push({ text: "Coming up:", type: "section-header" });
    upcoming.slice(0, 2).forEach((c) => {
      const date = c.dueAt ? format(parseISO(c.dueAt), "MMM d") : "";
      lines.push({ text: `• ${date} — ${c.title || "Untitled"}`, type: "upcoming", cardId: c.id });
    });
  }

  // If nothing at all
  if (todayItems.length === 0 && active.length === 0 && upcoming.length === 0 && milestones.length === 0) {
    lines.push({ text: "Nothing pressing. Everything is here.", type: "empty" });
  }

  return lines;
}
