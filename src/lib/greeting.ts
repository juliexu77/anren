/**
 * The neutral line at the top of Home when there's nothing worth noticing.
 * No AI, no request, no stats — just a soft acknowledgement that varies with
 * the hour and with how long it's been since you last put something down.
 */

function pick(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length];
}

/** A stable-per-hour seed, so the line doesn't flicker between renders. */
function seedFor(now: Date): number {
  return Math.floor(now.getTime() / 3_600_000);
}

function timeOfDay(hour: number): string[] {
  if (hour < 5) return ["Late.", "Still up.", "The quiet hours."];
  if (hour < 9) return ["Morning.", "Early.", "Morning — still soft out."];
  if (hour < 12) return ["Morning.", "Mid-morning.", "The day's still open."];
  if (hour < 14) return ["Midday.", "The middle of the day.", "Halfway through."];
  if (hour < 18) return ["Afternoon.", "The long part of the afternoon.", "Later on."];
  if (hour < 22) return ["Evening.", "The evening.", "Winding down."];
  return ["Late evening.", "End of the day.", "Late."];
}

/** Lines for when it's been a while — these take precedence over the hour. */
function sinceLast(days: number): string[] | null {
  if (days >= 21) return ["It's been a while.", "Been a long time since you were here."];
  if (days >= 7) return ["It's been over a week.", "A while since you put anything down."];
  if (days >= 3) return ["It's been a few days.", "A few days since the last one."];
  return null;
}

/**
 * @param lastNoteAt when they last kept a note, if ever
 */
export function greetingLine(lastNoteAt: Date | null, now = new Date()): string {
  const seed = seedFor(now);
  if (lastNoteAt) {
    const days = Math.floor((now.getTime() - lastNoteAt.getTime()) / 86_400_000);
    const gap = sinceLast(days);
    if (gap) return pick(gap, seed);
  }
  return pick(timeOfDay(now.getHours()), seed);
}
