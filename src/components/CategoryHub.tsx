import { ChevronRight, Calendar } from "lucide-react";
import { CATEGORY_CONFIG } from "@/types/card";
import type { CardCategory, BrainCard } from "@/types/card";

interface Props {
  cards: BrainCard[];
  onSelectCategory: (category: CardCategory) => void;
  onSelectCalendar: () => void;
}

export function CategoryHub({ cards, onSelectCategory, onSelectCalendar }: Props) {
  // Count cards per category
  const counts: Partial<Record<CardCategory, number>> = {};
  cards.forEach((c) => {
    counts[c.category] = (counts[c.category] || 0) + 1;
  });

  const categories = (Object.keys(CATEGORY_CONFIG) as CardCategory[]).filter(
    (key) => (counts[key] || 0) > 0
  );

  return (
    <div className="px-4 space-y-2">
      {/* Calendar row */}
      <button
        onClick={onSelectCalendar}
        className="w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-colors"
        style={{
          background: 'hsl(var(--card-bg) / 0.6)',
          border: '1px solid hsl(var(--divider) / 0.3)',
        }}
      >
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <span className="text-list-title text-foreground flex-1 text-left">Calendar</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      </button>

      {/* Category rows */}
      {categories.map((key) => {
        const cat = CATEGORY_CONFIG[key];
        const Icon = cat.icon;
        const count = counts[key] || 0;
        return (
          <button
            key={key}
            onClick={() => onSelectCategory(key)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-colors"
            style={{
              background: 'hsl(var(--card-bg) / 0.6)',
              border: '1px solid hsl(var(--divider) / 0.3)',
            }}
          >
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span className="text-list-title text-foreground flex-1 text-left">{cat.label}</span>
            <span className="text-caption text-muted-foreground mr-1">{count}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>
        );
      })}
    </div>
  );
}
