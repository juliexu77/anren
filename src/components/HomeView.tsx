import { useMemo, useState, useEffect } from "react";
import { isToday, isPast, parseISO, format } from "date-fns";
import { CalendarClock, Loader2, Camera } from "lucide-react";
import type { BrainCard } from "@/types/card";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";
import { generateDailyOrientation, type OrientationLine } from "@/lib/dailyOrientation";
import { useRef, useCallback } from "react";

const LOADING_LINES = [
  "Tell me, what is it you plan to do with your one wild and precious life?",
  "Someone I loved once gave me a box full of darkness. It took me years to understand that this too, was a gift.",
  "Keep some room in your heart for the unimaginable.",
  "I don't want to end up simply having visited this world.",
  "Attention is the beginning of devotion.",
  "Let yourself be silently drawn by the strange pull of what you really love.",
  "The wound is the place where the light enters you.",
  "Respond to every call that excites your spirit.",
  "Why do you stay in prison when the door is so wide open?",
  "Wherever you are, and whatever you do, be in love.",
  "Anything or anyone that does not bring you alive is too small for you.",
  "The rest is yet to come.",
  "Sometimes it takes darkness and the sweet confinement of your aloneness to learn that anything or anyone that does not bring you alive is too small for you.",
  "Start close in. Don't take the second step or the third. Start with the first thing close in.",
];

interface Props {
  cards: BrainCard[];
  cardsLoading: boolean;
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  onCardClick: (card: BrainCard) => void;
  onCalendarEventClick: (event: CalendarEvent) => void;
  onViewCalendar: () => void;
  onComplete: (id: string) => void;
  onSchedule: (card: BrainCard) => void;
  onOpenCamera: () => void;
  onOpenBrainDump: () => void;
  onReorder: () => void;
  reordering: boolean;
}

export function HomeView({ cards, cardsLoading, calendarEvents, calendarLoading, onCardClick, onCalendarEventClick, onViewCalendar, onComplete, onSchedule, onOpenCamera, onOpenBrainDump, onReorder, reordering }: Props) {
  const [meditativeIndex, setMeditativeIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_LINES.length)
  );

  useEffect(() => {
    if (!cardsLoading) return;
    const interval = setInterval(() => {
      setMeditativeIndex((prev) => (prev + 1) % LOADING_LINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [cardsLoading]);
  const active = useMemo(() => cards.filter((c) => c.status === "active" && c.body !== "@@PARSING@@" && c.body !== "@@PARSE_FAILED@@"), [cards]);
  const parsing = useMemo(() => cards.filter((c) => c.body === "@@PARSING@@"), [cards]);
  const scheduled = useMemo(() => cards.filter((c) => c.status === "scheduled"), [cards]);

  const todayEvents = useMemo(() => {
    const seen = new Set<string>();
    return calendarEvents.filter((e) => {
      const start = e.start.dateTime || e.start.date;
      if (!start || !isToday(parseISO(start))) return false;
      const key = `${(e.summary || "").trim().toLowerCase()}|${start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [calendarEvents]);

  const dueToday = useMemo(() => scheduled.filter((c) => c.dueAt && isToday(parseISO(c.dueAt))), [scheduled]);
  const overdue = useMemo(() => scheduled.filter((c) => c.dueAt && isPast(parseISO(c.dueAt)) && !isToday(parseISO(c.dueAt))), [scheduled]);
  const upcoming = useMemo(() => scheduled.filter((c) => !c.dueAt || (!isToday(parseISO(c.dueAt!)) && !isPast(parseISO(c.dueAt!)))), [scheduled]);

  const orientationLines = useMemo(() => generateDailyOrientation(cards, calendarEvents), [cards, calendarEvents]);
  const restingSectionRef = useRef<HTMLDivElement>(null);

  const handleOrientationTap = useCallback((line: OrientationLine) => {
    if (line.type === "holding-more") {
      restingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (line.calendarEventId) {
      const event = calendarEvents.find((e) => e.id === line.calendarEventId);
      if (event) onCalendarEventClick(event);
    } else if (line.cardId) {
      const card = cards.find((c) => c.id === line.cardId);
      if (card) onCardClick(card);
    }
  }, [cards, calendarEvents, onCardClick, onCalendarEventClick]);

  if (cardsLoading) {
    return (
      <main className="px-4 pb-4 flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-8 h-8 rounded-full border-2 animate-spin border-divider-color/20 border-t-text-muted-color" />
          <p
            key={meditativeIndex}
            className="text-caption text-center italic max-w-[280px] animate-fade-in text-text-muted-color leading-relaxed"
          >
            {LOADING_LINES[meditativeIndex]}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 space-y-5 pb-4">
      {/* ── Action buttons (top) ── */}
      <div className="flex gap-3">
        <button
          onClick={onOpenCamera}
          className="sanctuary-btn py-3 px-4 shrink-0"
          title="Capture screenshot"
        >
          <Camera className="w-5 h-5" />
        </button>
        <button
          onClick={onOpenBrainDump}
          className="sanctuary-btn flex-1 py-3 text-button font-medium"
        >
          Clear your mind
        </button>
      </div>

      {/* ── Daily Orientation ── */}
      <div className="orientation-card">
        <div className="space-y-0 leading-relaxed">
          {orientationLines.map((line, i) => {
            if (line.type === "spacer") return <div key={i} className="h-2" />;
            const isClickable = line.type === "holding-more" || !!line.cardId || !!line.calendarEventId;
            return (
              <div
                key={i}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? () => handleOrientationTap(line) : undefined}
                className={`text-caption font-sans ${isClickable ? "cursor-pointer active:opacity-60" : ""} ${
                  line.type === "holding-more" ? "text-text-muted-color" : "text-text-secondary-color"
                }`}
              >
                {line.text}
              </div>
            );
          })}
          <div className="h-1" />
          <button
            onClick={onViewCalendar}
            className="text-micro active:opacity-60 transition-opacity text-text-muted-color"
          >
            View calendar →
          </button>
        </div>
      </div>

      {(overdue.length > 0 || dueToday.length > 0) && (
        <div className="sanctuary-card">
          {overdue.map((card) => (
            <ItemRow key={card.id} card={card} overdue onClick={() => onCardClick(card)} onComplete={() => onComplete(card.id)} />
          ))}
          {dueToday.map((card) => (
            <ItemRow key={card.id} card={card} onClick={() => onCardClick(card)} onComplete={() => onComplete(card.id)} />
          ))}
        </div>
      )}

      {/* ── PARSING ── */}
      {parsing.length > 0 && (
        <div className="sanctuary-card">
          {parsing.map((card) => (
            <div key={card.id} className="item-row">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-text-muted-color" />
              <span className="text-caption text-text-muted-color">
                Parsing image…
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── RESTING HERE ── */}
      {active.length > 0 && (
        <Section title="Resting here" sectionRef={restingSectionRef}>
          {active.map((card) => (
            <ItemRow
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onSchedule={() => onSchedule(card)}
              onComplete={() => onComplete(card.id)}
            />
          ))}
          <button
            onClick={onReorder}
            disabled={reordering}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-caption transition-colors active:opacity-60 text-text-muted-color border-t border-divider-color/[0.08]"
          >
            {reordering ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>✦</span>
            )}
            {reordering ? "Organizing…" : "Help me get organized"}
          </button>
        </Section>
      )}

      {/* ── IN MOTION ── */}
      {upcoming.length > 0 && (
        <Section title="In motion">
          {upcoming.map((card) => (
            <ItemRow key={card.id} card={card} showDate onClick={() => onCardClick(card)} onComplete={() => onComplete(card.id)} />
          ))}
        </Section>
      )}

      {cards.length === 0 && !calendarLoading && (
        <p className="text-caption text-center py-12 text-text-muted-color">
          Nothing resting here yet.
        </p>
      )}
    </main>
  );
}

/* ── Section ── */
function Section({ title, children, sectionRef }: { title: string; children: React.ReactNode; sectionRef?: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={sectionRef}>
      <h2 className="text-label uppercase tracking-wider mb-1 text-text-muted-color">
        {title}
      </h2>
      <div className="sanctuary-card">
        {children}
      </div>
    </div>
  );
}

/* ── Empty Row ── */
function EmptyRow({ text }: { text: string }) {
  return (
    <div className="px-3 py-2.5">
      <span className="text-caption text-text-muted-color">{text}</span>
    </div>
  );
}

/* ── Item Row ── */
function ItemRow({
  card,
  overdue,
  showDate,
  onClick,
  onComplete,
  onSchedule,
}: {
  card: BrainCard;
  overdue?: boolean;
  showDate?: boolean;
  onClick: () => void;
  onComplete?: () => void;
  onSchedule?: () => void;
}) {
  const typeLabel = card.type === "ongoing" ? "ongoing" : card.type === "event" ? "event" : "";
  const dateStr = showDate && card.dueAt ? format(parseISO(card.dueAt), "MMM d") : "";

  return (
    <div className="item-row">
      {onComplete && (
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          className="w-4 h-4 rounded-full border shrink-0 transition-colors hover:border-foreground/40 border-divider-color/40"
          title="Mark complete"
        />
      )}

      {dateStr && (
        <span className="text-micro font-medium w-[44px] shrink-0 text-right tabular-nums text-text-muted-color">
          {dateStr}
        </span>
      )}

      <button onClick={onClick} className="flex-1 text-left truncate min-w-0">
        <span className="text-caption truncate text-text-primary">
          {card.title || card.body.split("\n")[0].substring(0, 60) || "Unnamed"}
        </span>
      </button>

      {typeLabel && (
        <span className="text-micro px-1.5 py-0.5 rounded shrink-0 bg-surface-color text-text-muted-color">
          {typeLabel}
        </span>
      )}

      {onSchedule && (
        <button
          onClick={(e) => { e.stopPropagation(); onSchedule(); }}
          className="p-1 rounded shrink-0 transition-colors hover:bg-foreground/[0.05] text-text-muted-color"
          title="Schedule"
        >
          <CalendarClock className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ── Calendar Event Row ── */
function EventRow({ event }: { event: CalendarEvent }) {
  const time = event.start.dateTime ? format(parseISO(event.start.dateTime), "h:mm a") : "All day";

  return (
    <div className="item-row">
      <span className="text-micro font-medium w-[60px] shrink-0 text-right tabular-nums text-text-muted-color">
        {time}
      </span>
      <span className="text-caption flex-1 truncate text-text-primary">
        {event.summary}
      </span>
    </div>
  );
}
