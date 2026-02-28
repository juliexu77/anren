import { useMemo, useState } from "react";
import { Camera, Mic, Type, Link, AlertTriangle, Calendar, CheckCircle2, Archive, X } from "lucide-react";
import type { BrainCard, ItemStatus, RoutedType } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { isToday, isPast, parseISO, format, startOfDay, endOfDay } from "date-fns";
import type { CalendarEvent } from "@/hooks/useGoogleCalendar";

interface Props {
  cards: BrainCard[];
  calendarEvents: CalendarEvent[];
  calendarLoading: boolean;
  onCardClick: (card: BrainCard) => void;
  onRoute: (id: string, routedType: RoutedType, updates?: Partial<BrainCard>) => void;
  onSchedule: (card: BrainCard) => void;
}

const SOURCE_ICONS: Record<string, typeof Camera> = {
  screenshot: Camera,
  voice: Mic,
  text: Type,
};

export function HomeTriageView({ cards, calendarEvents, calendarLoading, onCardClick, onRoute, onSchedule }: Props) {
  const inbox = useMemo(() => cards.filter(c => c.status === "inbox"), [cards]);
  const routed = useMemo(() => cards.filter(c => c.status === "routed"), [cards]);

  const todayEvents = useMemo(() => {
    const now = new Date();
    return calendarEvents.filter(e => {
      const start = e.start.dateTime || e.start.date;
      if (!start) return false;
      return isToday(parseISO(start));
    });
  }, [calendarEvents]);

  const dueToday = useMemo(() => {
    return routed.filter(c => c.dueAt && isToday(parseISO(c.dueAt)));
  }, [routed]);

  const overdue = useMemo(() => {
    return routed.filter(c => c.dueAt && isPast(parseISO(c.dueAt)) && !isToday(parseISO(c.dueAt)));
  }, [routed]);

  const upcoming = useMemo(() => {
    return routed.filter(c => !c.dueAt || (!isToday(parseISO(c.dueAt!)) && !isPast(parseISO(c.dueAt!))));
  }, [routed]);

  return (
    <main className="px-4 space-y-5 pb-4">
      {/* ── LOAD TODAY ── */}
      <div
        className="rounded-lg px-3 py-3"
        style={{
          background: "hsl(var(--card-bg) / 0.5)",
          border: "1px solid hsl(var(--divider) / 0.2)",
        }}
      >
        <h2 className="text-label uppercase tracking-wider mb-2" style={{ color: "hsl(var(--text-muted))" }}>
          Load Today
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <MetricCell label="Inbox" value={inbox.length} highlight={inbox.length > 0} />
          <MetricCell label="Events" value={todayEvents.length} loading={calendarLoading} />
          <MetricCell label="Due" value={dueToday.length} />
          <MetricCell label="Overdue" value={overdue.length} danger={overdue.length > 0} />
        </div>
      </div>

      {/* ── IN YOUR HEAD (Inbox) ── */}
      <Section title="In Your Head" count={inbox.length}>
        {inbox.length === 0 ? (
          <EmptyRow text="All clear." />
        ) : (
          inbox.map(card => (
            <InboxRow
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onRoute={onRoute}
              onSchedule={() => onSchedule(card)}
            />
          ))
        )}
      </Section>

      {/* ── HANDLED ── */}
      {routed.length > 0 && (
        <Section title="Handled">
          {overdue.length > 0 && (
            <SubHeader label="Overdue" />
          )}
          {overdue.map(card => (
            <RoutedRow key={card.id} card={card} overdue onClick={() => onCardClick(card)} />
          ))}

          {dueToday.length > 0 && (
            <SubHeader label="Due Today" />
          )}
          {dueToday.map(card => (
            <RoutedRow key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}

          {upcoming.length > 0 && (
            <SubHeader label="Upcoming" />
          )}
          {upcoming.map(card => (
            <RoutedRow key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </Section>
      )}

      {cards.length === 0 && (
        <p className="text-caption text-center py-12" style={{ color: "hsl(var(--text-muted))" }}>
          No notes yet. Tap + to add one.
        </p>
      )}
    </main>
  );
}

/* ── Metric Cell ── */
function MetricCell({ label, value, highlight, danger, loading }: {
  label: string; value: number; highlight?: boolean; danger?: boolean; loading?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className="text-numeric-lg tabular-nums"
        style={{
          fontSize: "20px",
          lineHeight: "24px",
          color: danger ? "hsl(var(--destructive))" : highlight ? "hsl(var(--accent-1))" : "hsl(var(--text))",
        }}
      >
        {loading ? "–" : value}
      </p>
      <p className="text-micro" style={{ color: "hsl(var(--text-muted))" }}>{label}</p>
    </div>
  );
}

/* ── Section ── */
function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-label uppercase tracking-wider" style={{ color: "hsl(var(--text-muted))" }}>
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span
            className="text-micro font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--surface))", color: "hsl(var(--text-secondary))" }}
          >
            {count}
          </span>
        )}
      </div>
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "hsl(var(--card-bg) / 0.5)",
          border: "1px solid hsl(var(--divider) / 0.2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Sub Header inside section ── */
function SubHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pt-2 pb-1" style={{ borderTop: "1px solid hsl(var(--divider) / 0.15)" }}>
      <span className="text-micro uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--text-muted))" }}>
        {label}
      </span>
    </div>
  );
}

/* ── Empty Row ── */
function EmptyRow({ text }: { text: string }) {
  return (
    <div className="px-3 py-3">
      <span className="text-caption" style={{ color: "hsl(var(--text-muted))" }}>{text}</span>
    </div>
  );
}

/* ── Inbox Row ── */
function InboxRow({ card, onClick, onRoute, onSchedule }: {
  card: BrainCard;
  onClick: () => void;
  onRoute: (id: string, type: RoutedType, updates?: Partial<BrainCard>) => void;
  onSchedule: () => void;
}) {
  const isParsing = card.body === "@@PARSING@@";
  const isFailed = card.body === "@@PARSE_FAILED@@";
  const SrcIcon = SOURCE_ICONS[card.source] || Type;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 transition-colors"
      style={{ borderBottom: "1px solid hsl(var(--divider) / 0.1)" }}
    >
      <SrcIcon className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--text-muted))" }} />

      <button
        onClick={onClick}
        className="flex-1 text-left truncate min-w-0"
      >
        {isParsing ? (
          <span className="text-caption italic animate-pulse" style={{ color: "hsl(var(--text-muted))" }}>Processing…</span>
        ) : isFailed ? (
          <span className="text-caption flex items-center gap-1" style={{ color: "hsl(var(--destructive))" }}>
            <AlertTriangle className="w-3 h-3" /> Failed — tap to edit
          </span>
        ) : (
          <span className="text-caption truncate" style={{ color: "hsl(var(--text))" }}>
            {card.title || card.body.split("\n")[0].substring(0, 80) || "Empty note"}
          </span>
        )}
      </button>

      {!isParsing && !isFailed && (
        <div className="flex items-center gap-0.5 shrink-0">
          <ActionBtn
            icon={CheckCircle2}
            title="Task"
            onClick={(e) => { e.stopPropagation(); onRoute(card.id, "task"); }}
          />
          <ActionBtn
            icon={Calendar}
            title="Schedule"
            onClick={(e) => { e.stopPropagation(); onSchedule(); }}
          />
          <ActionBtn
            icon={Archive}
            title="Ref"
            onClick={(e) => { e.stopPropagation(); onRoute(card.id, "reference"); }}
          />
          <ActionBtn
            icon={X}
            title="Ignore"
            onClick={(e) => { e.stopPropagation(); onRoute(card.id, "ignore"); }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Action Button ── */
function ActionBtn({ icon: Icon, title, onClick }: {
  icon: typeof CheckCircle2; title: string; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors hover:bg-foreground/[0.05] active:bg-foreground/[0.08]"
    >
      <Icon className="w-3.5 h-3.5" style={{ color: "hsl(var(--text-muted))" }} />
    </button>
  );
}

/* ── Routed Row ── */
function RoutedRow({ card, overdue, onClick }: { card: BrainCard; overdue?: boolean; onClick: () => void }) {
  const typeLabel = card.routedType === "task" ? "Task" : card.routedType === "event" ? "Event" : card.routedType === "reference" ? "Ref" : "";
  const timeStr = card.dueAt ? format(parseISO(card.dueAt), "MMM d") : "";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.03]"
      style={{ borderBottom: "1px solid hsl(var(--divider) / 0.1)" }}
    >
      {timeStr && (
        <span
          className="text-micro font-medium w-[44px] shrink-0 text-right"
          style={{ color: overdue ? "hsl(var(--destructive))" : "hsl(var(--text-muted))" }}
        >
          {timeStr}
        </span>
      )}
      <span
        className="text-caption flex-1 truncate"
        style={{ color: overdue ? "hsl(var(--destructive))" : "hsl(var(--text))" }}
      >
        {card.title || card.body.split("\n")[0].substring(0, 60) || "Empty"}
      </span>
      {typeLabel && (
        <span
          className="text-micro px-1.5 py-0.5 rounded shrink-0"
          style={{ background: "hsl(var(--surface))", color: "hsl(var(--text-muted))" }}
        >
          {typeLabel}
        </span>
      )}
    </button>
  );
}
