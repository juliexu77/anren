import type { BrainCard } from "@/types/card";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { isToday, parseISO, format, differenceInDays, startOfDay } from "date-fns";

/** Parse a calendar date string, treating date-only values (YYYY-MM-DD) as local midnight */
function parseCalendarDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return parseISO(value);
}

const MILESTONE_KEYWORDS = ["birthday", "anniversary", "bday", "b-day"];

function isMilestoneEvent(event: CalendarEvent): boolean {
  const summary = (event.summary || "").toLowerCase();
  return MILESTONE_KEYWORDS.some((kw) => summary.includes(kw));
}

export interface OrientationLine {
  text: string;
  type: "greeting" | "milestone" | "calendar" | "summary" | "empty" | "spacer";
  calendarEventId?: string;
}

export function generateDailyOrientation(
  cards: BrainCard[],
  calendarEvents: CalendarEvent[]
): OrientationLine[] {
  const active = cards.filter((c) => c.status === "active" && c.body !== "@@PARSING@@");
  const scheduled = cards.filter((c) => c.status === "scheduled");
  const allItems = active.length + scheduled.length;

  // Deduplicated milestones within 7 days
  const seenMilestones = new Set<string>();
  const milestones = calendarEvents
    .filter(isMilestoneEvent)
    .map((e) => {
      const start = e.start.dateTime || e.start.date;
      const startDate = start ? parseCalendarDate(start) : new Date();
      const daysAway = differenceInDays(startOfDay(startDate), startOfDay(new Date()));
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

  // Today's non-milestone calendar events (deduplicated)
  const seenEvents = new Set<string>();
  const todayCalEvents = calendarEvents.filter((e) => {
    const start = e.start.dateTime || e.start.date;
    if (!start || !isToday(parseCalendarDate(start))) return false;
    if (isMilestoneEvent(e)) return false;
    const key = `${(e.summary || "").trim().toLowerCase()}|${start}`;
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
  });

  const lines: OrientationLine[] = [
    { text: "Good morning.", type: "greeting" },
    { text: "", type: "spacer" },
  ];

  // Milestones
  milestones.forEach((m) => {
    const when = m.daysAway === 0 ? "Today" : m.daysAway === 1 ? "Tomorrow" : format(m.startDate, "EEEE");
    lines.push({ text: `🎂 ${m.summary} — ${when}`, type: "milestone" });
  });
  if (milestones.length > 0) lines.push({ text: "", type: "spacer" });

  // Calendar events as a gentle sentence
  if (todayCalEvents.length > 0) {
    const parts = todayCalEvents.slice(0, 3).map((e) => {
      const time = e.start.dateTime ? format(parseISO(e.start.dateTime), "h:mm a") : "all day";
      return `${e.summary} at ${time}`;
    });

    let sentence: string;
    if (parts.length === 1) {
      sentence = `You have ${parts[0]}.`;
    } else if (parts.length === 2) {
      sentence = `You have ${parts[0]}, then ${parts[1]}.`;
    } else {
      sentence = `You have ${parts[0]}, ${parts[1]}, then ${parts[2]}.`;
    }

    lines.push({ text: sentence, type: "calendar" });
    lines.push({ text: "", type: "spacer" });
  }

  // Gentle summary of resting items
  if (allItems > 0) {
    const word = allItems === 1 ? "thing" : "things";
    lines.push({
      text: `${allItems} ${word} resting here whenever you're ready.`,
      type: "summary",
    });
  } else if (todayCalEvents.length === 0 && milestones.length === 0) {
    lines.push({ text: "Nothing pressing. A quiet day.", type: "empty" });
  }

  return lines;
}
