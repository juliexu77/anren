import { useMemo } from "react";
import { Camera, Link, Calendar, Mail, Mic, Type, Check, Archive, AlertTriangle } from "lucide-react";
import type { BrainCard, CardCategory } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { isToday, isPast, isFuture, parseISO, format } from "date-fns";

interface Props {
  cards: BrainCard[];
  onCardClick: (card: BrainCard) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BrainCard>) => void;
}

const SOURCE_ICON: Record<string, typeof Camera> = {
  screenshot: Camera,
  voice: Mic,
  text: Type,
};

function suggestType(card: BrainCard): string {
  const cat = card.category;
  const body = (card.body + " " + card.title).toLowerCase();
  if (cat === "doctor" || body.includes("appointment") || body.includes("meeting") || body.includes("schedule"))
    return "Event";
  if (body.includes("todo") || body.includes("pick up") || body.includes("buy") || body.includes("call") || body.includes("book") || body.includes("need to") || body.includes("remind"))
    return "Task";
  return "Ref";
}

function getTypeColor(type: string): string {
  switch (type) {
    case "Task": return "hsl(var(--accent-1))";
    case "Event": return "hsl(var(--secondary))";
    default: return "hsl(var(--text-muted))";
  }
}

export function HomeTriageView({ cards, onCardClick, onDelete, onUpdate }: Props) {
  const { inbox, today, upcoming } = useMemo(() => {
    const now = new Date();
    const inboxCards: BrainCard[] = [];
    const todayCards: BrainCard[] = [];
    const upcomingCards: BrainCard[] = [];

    // Sort all cards by creation date descending
    const sorted = [...cards].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sorted.forEach((card) => {
      if (card.body === "@@PARSING@@" || card.body === "@@PARSE_FAILED@@") {
        inboxCards.push(card);
        return;
      }

      const created = parseISO(card.createdAt);
      const type = suggestType(card);

      // Uncategorized or very recent (last 24h) → inbox
      if (card.category === "uncategorized" || (now.getTime() - created.getTime() < 24 * 60 * 60 * 1000 && card.category === "uncategorized")) {
        inboxCards.push(card);
      } else if (isToday(created) || (type === "Task" && isPast(created))) {
        todayCards.push(card);
      } else {
        upcomingCards.push(card);
      }
    });

    // Sort today by time
    todayCards.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { inbox: inboxCards, today: todayCards, upcoming: upcomingCards };
  }, [cards]);

  return (
    <main className="px-4 space-y-6">
      {/* ── INBOX ── */}
      {inbox.length > 0 && (
        <Section title="Inbox" count={inbox.length}>
          {inbox.map((card) => (
            <InboxRow key={card.id} card={card} onClick={() => onCardClick(card)} onDelete={onDelete} />
          ))}
        </Section>
      )}

      {/* ── TODAY ── */}
      {today.length > 0 && (
        <Section title="Today">
          {today.map((card) => {
            const created = parseISO(card.createdAt);
            const overdue = suggestType(card) === "Task" && isPast(created) && !isToday(created);
            return (
              <TodayRow key={card.id} card={card} overdue={overdue} onClick={() => onCardClick(card)} />
            );
          })}
        </Section>
      )}

      {/* ── UPCOMING / WATCHLIST ── */}
      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map((card) => (
            <UpcomingRow key={card.id} card={card} onClick={() => onCardClick(card)} />
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

/* ── Section wrapper ── */
function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <h2 className="text-label uppercase tracking-wider" style={{ color: "hsl(var(--text-muted))" }}>
          {title}
        </h2>
        {count !== undefined && (
          <span
            className="text-micro font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              background: "hsl(var(--surface))",
              color: "hsl(var(--text-secondary))",
            }}
          >
            {count}
          </span>
        )}
      </div>
      <div
        className="rounded-lg overflow-hidden divide-y"
        style={{
          background: "hsl(var(--card-bg) / 0.5)",
          border: "1px solid hsl(var(--divider) / 0.3)",
        }}
        // Divide color
      >
        <style>{`.triage-divide > *:not(:last-child) { border-bottom: 1px solid hsl(var(--divider) / 0.2); }`}</style>
        <div className="triage-divide">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Inbox Row ── */
function InboxRow({ card, onClick, onDelete }: { card: BrainCard; onClick: () => void; onDelete: (id: string) => void }) {
  const isParsing = card.body === "@@PARSING@@";
  const isFailed = card.body === "@@PARSE_FAILED@@";
  const SrcIcon = SOURCE_ICON[card.source] || Type;
  const type = suggestType(card);

  return (
    <button
      onClick={isFailed ? () => onDelete(card.id) : onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.03] active:bg-foreground/[0.05]"
    >
      <SrcIcon className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--text-muted))" }} />

      {isParsing ? (
        <span className="text-caption flex-1 italic animate-pulse" style={{ color: "hsl(var(--text-muted))" }}>
          Processing…
        </span>
      ) : isFailed ? (
        <span className="text-caption flex-1 flex items-center gap-1.5" style={{ color: "hsl(var(--destructive))" }}>
          <AlertTriangle className="w-3 h-3" />
          Parse failed — tap to remove
        </span>
      ) : (
        <>
          <span className="text-caption flex-1 truncate" style={{ color: "hsl(var(--text))" }}>
            {card.title || card.body.split("\n")[0].substring(0, 60) || "Empty note"}
          </span>
          <span
            className="text-micro font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{
              color: getTypeColor(type),
              background: `${getTypeColor(type)}15`,
            }}
          >
            {type}
          </span>
        </>
      )}
    </button>
  );
}

/* ── Today Row ── */
function TodayRow({ card, overdue, onClick }: { card: BrainCard; overdue: boolean; onClick: () => void }) {
  const time = format(parseISO(card.createdAt), "h:mm a");
  const cat = CATEGORY_CONFIG[card.category];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.03] active:bg-foreground/[0.05]"
    >
      <span
        className="text-micro font-medium w-[52px] shrink-0 text-right"
        style={{ color: overdue ? "hsl(var(--destructive))" : "hsl(var(--text-muted))" }}
      >
        {overdue ? "overdue" : time}
      </span>

      <span
        className="text-caption flex-1 truncate"
        style={{ color: overdue ? "hsl(var(--destructive))" : "hsl(var(--text))" }}
      >
        {card.title || card.body.split("\n")[0].substring(0, 60) || "Empty note"}
      </span>

      {card.category !== "uncategorized" && (
        <span
          className="text-micro px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: "hsl(var(--surface))",
            color: "hsl(var(--text-muted))",
          }}
        >
          {cat.label}
        </span>
      )}
    </button>
  );
}

/* ── Upcoming Row ── */
function UpcomingRow({ card, onClick }: { card: BrainCard; onClick: () => void }) {
  const date = format(parseISO(card.createdAt), "MMM d");
  const cat = CATEGORY_CONFIG[card.category];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.03] active:bg-foreground/[0.05]"
    >
      <span className="text-micro font-medium w-[52px] shrink-0 text-right" style={{ color: "hsl(var(--text-muted))" }}>
        {date}
      </span>

      <span className="text-caption flex-1 truncate" style={{ color: "hsl(var(--text))" }}>
        {card.title || card.body.split("\n")[0].substring(0, 60) || "Empty note"}
      </span>

      {card.category !== "uncategorized" && (
        <span
          className="text-micro px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: "hsl(var(--surface))",
            color: "hsl(var(--text-muted))",
          }}
        >
          {cat.label}
        </span>
      )}
    </button>
  );
}
