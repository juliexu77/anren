import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Loader2, Camera, ChevronDown, Check, X } from "lucide-react";
import type { BrainCard } from "@/types/card";
import { RunMyDay } from "@/components/RunMyDay";
import { useReflectionDigest, type ReflectionSummary } from "@/hooks/useReflectionDigest";

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
  calendarLoading: boolean;
  onCardClick: (card: BrainCard) => void;
  onComplete: (id: string) => void;
  onOpenCamera: () => void;
  onOpenBrainDump: () => void;
  onReorder: () => void;
  reordering: boolean;
  reorderMessage?: string | null;
  readOnly?: boolean;
  viewerBanner?: string | null;
  dailyPlan?: string[] | null;
  dailyPlanLoading?: boolean;
}

export function HomeView({ cards, cardsLoading, calendarLoading, onCardClick, onComplete, onOpenCamera, onOpenBrainDump, onReorder, reordering, reorderMessage, readOnly, viewerBanner, dailyPlan, dailyPlanLoading }: Props) {
  const [meditativeIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_LINES.length)
  );
  const [meditativeDismissed, setMeditativeDismissed] = useState(false);

  // All non-completed, non-parsing items in one list
  const allItems = useMemo(
    () => cards.filter((c) =>
      c.status === "active" &&
      c.body !== "@@PARSING@@" &&
      c.body !== "@@PARSE_FAILED@@"
    ),
    [cards]
  );
  const parsing = useMemo(() => cards.filter((c) => c.body === "@@PARSING@@"), [cards]);

  const restingSectionRef = useRef<HTMLDivElement>(null);

  if (cardsLoading || !meditativeDismissed) {
    return (
      <main className="px-4 pb-4 flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="flex flex-col items-center gap-6 animate-fade-in max-w-[300px]">
          {cardsLoading && (
            <div className="w-8 h-8 rounded-full border-2 animate-spin border-divider-color/20 border-t-text-muted-color" />
          )}
          <p
            key={meditativeIndex}
            className="text-caption text-center italic animate-fade-in text-text-muted-color leading-relaxed"
          >
            {LOADING_LINES[meditativeIndex]}
          </p>
          {!cardsLoading && (
            <button
              onClick={() => setMeditativeDismissed(true)}
              className="mt-2 flex items-center gap-1.5 text-micro tracking-wider uppercase transition-opacity active:opacity-60 text-text-muted-color"
            >
              <span>Continue</span>
              <span className="text-xs">→</span>
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 space-y-6 pb-4">
      {/* ── Viewer banner ── */}
      {readOnly && viewerBanner && (
        <div className="rounded-xl px-4 py-3 bg-surface-color/60 text-center">
          <p className="text-caption italic text-text-muted-color">{viewerBanner}</p>
        </div>
      )}

      {/* ── Action buttons ── */}
      {!readOnly && (
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
      )}

      {/* ── Run My Day — AI-generated daily plan ── */}
      <RunMyDay plan={dailyPlan ?? null} loading={dailyPlanLoading ?? false} />


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

      {/* ── Help me get organized (above the list) ── */}
      {!readOnly && allItems.length >= 2 && (
        <>
          <button
            onClick={onReorder}
            disabled={reordering}
            className="sanctuary-btn w-full flex items-center justify-center gap-2 py-3 text-button font-medium"
          >
            {reordering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>✦</span>
            )}
            {reordering ? "Organizing…" : "Help me get organized"}
          </button>
          {reorderMessage && (
            <p className="text-caption italic text-text-muted-color text-center mt-1.5 px-2">
              {reorderMessage}
            </p>
          )}
        </>
      )}

      {/* ── Resting here — single merged list ── */}
      {allItems.length > 0 && (
        <CollapsibleSection
          title={readOnly ? "They're holding" : "Resting here"}
          count={allItems.length}
          sectionRef={restingSectionRef}
        >
          {allItems.map((card) => (
            <ItemRow
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onComplete={readOnly ? undefined : () => onComplete(card.id)}
            />
          ))}
        </CollapsibleSection>
      )}

      {cards.length === 0 && !calendarLoading && (
        <p className="text-caption text-center py-12 text-text-muted-color">
          Nothing resting here yet.
        </p>
      )}
    </main>
  );
}

/* ── Collapsible Section ── */
function CollapsibleSection({ title, count, children, sectionRef }: { title: string; count: number; children: React.ReactNode; sectionRef?: React.RefObject<HTMLDivElement> }) {
  const [open, setOpen] = useState(true);

  return (
    <div ref={sectionRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-1 group"
      >
        <h2 className="text-label uppercase tracking-wider text-text-muted-color">
          {title}
        </h2>
        <ChevronDown className={`w-4 h-4 text-text-muted-color transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full sanctuary-card px-3 py-3 text-left"
        >
          <p className="text-caption italic text-text-muted-color">
            I'll hold {count === 1 ? "this" : `these ${count} items`} for you. Tap to open.
          </p>
        </button>
      ) : (
        <div className="sanctuary-card">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Item Row ── */
function ItemRow({
  card,
  onClick,
  onComplete,
}: {
  card: BrainCard;
  onClick: () => void;
  onComplete?: () => void;
}) {
  const typeLabel = card.type === "ongoing" ? "ongoing" : card.type === "event" ? "event" : "";
  const dateStr = card.dueAt ? format(parseISO(card.dueAt), "MMM d") : "";

  return (
    <div className="item-row">
      {onComplete && (
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(); }}
          className="w-5 h-5 rounded-full border shrink-0 transition-colors hover:border-foreground/40 border-divider-color/40 flex items-center justify-center group"
          title="Mark complete"
        >
          <Check className="w-3 h-3 text-transparent group-hover:text-foreground/40 transition-colors" />
        </button>
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
    </div>
  );
}
