import type { BrainCard } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";

interface Props {
  cards: BrainCard[];
  onClick: (card: BrainCard) => void;
  onUngroup?: (groupId: string) => void;
}

export function GroupedCard({ cards, onClick, onUngroup }: Props) {
  if (cards.length === 0) return null;

  const groupId = cards[0].groupId;

  return (
    <div className="glass-card rounded-2xl p-3 space-y-1 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">
          {cards.length} notes grouped
        </span>
        {groupId && onUngroup && (
          <button
            onClick={(e) => { e.stopPropagation(); onUngroup(groupId); }}
            className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            Ungroup
          </button>
        )}
      </div>
      {cards.map((card) => {
        const cat = CATEGORY_CONFIG[card.category];
        const preview = card.body.split("\n")[0].substring(0, 80);
        return (
          <button
            key={card.id}
            onClick={() => onClick(card)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors flex items-center gap-2"
          >
            <span className="text-sm shrink-0">{cat.emoji}</span>
            <p className="text-xs text-foreground/80 truncate flex-1">{preview || "Empty note"}</p>
          </button>
        );
      })}
    </div>
  );
}
