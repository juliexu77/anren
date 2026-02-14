import type { BrainCard as BrainCardType } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { Camera, Mic, FileText } from "lucide-react";

const sourceIcons: Record<string, React.ReactNode> = {
  screenshot: <Camera className="w-3 h-3" />,
  voice: <Mic className="w-3 h-3" />,
  text: <FileText className="w-3 h-3" />,
};

interface Props {
  card: BrainCardType;
  onClick: () => void;
  index: number;
}

export function BrainCardComponent({ card, onClick, index }: Props) {
  const cat = CATEGORY_CONFIG[card.category];

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-2xl p-3 text-left w-full animate-fade-in hover:shadow-xl transition-shadow"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {card.imageUrl && (
        <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-muted">
          <img
            src={card.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <span
          className={`category-pill ${cat.color} text-foreground/80`}
        >
          {cat.emoji} {cat.label}
        </span>
        <span className="text-muted-foreground ml-auto flex items-center gap-1">
          {sourceIcons[card.source]}
        </span>
      </div>

      {card.title && (
        <h3 className="font-display text-sm font-semibold leading-snug mb-1 text-foreground">
          {card.title}
        </h3>
      )}

      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
        {card.body}
      </p>
    </button>
  );
}
