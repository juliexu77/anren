import { ArrowLeft } from "lucide-react";
import { CATEGORY_CONFIG } from "@/types/card";
import { BrainCardComponent } from "@/components/BrainCard";
import type { BrainCard, CardCategory } from "@/types/card";

interface Props {
  category: CardCategory;
  cards: BrainCard[];
  onBack: () => void;
  onCardClick: (card: BrainCard) => void;
}

export function CategoryCardList({ category, cards, onBack, onCardClick }: Props) {
  const cat = CATEGORY_CONFIG[category];
  const Icon = cat.icon;

  return (
    <div className="px-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-caption">Back</span>
      </button>

      <div className="flex items-center gap-3 mb-5">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-h3 text-foreground">{cat.label}</h2>
        <span className="text-caption text-muted-foreground">({cards.length})</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <BrainCardComponent
            key={card.id}
            card={card}
            index={i}
            onClick={() => onCardClick(card)}
          />
        ))}
      </div>
    </div>
  );
}
