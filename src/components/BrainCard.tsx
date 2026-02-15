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
  const Icon = cat.icon;

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-lg p-3 text-left w-full animate-fade-in hover:shadow-xl transition-shadow"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`category-pill ${cat.color} text-foreground/80 flex items-center gap-1.5`}>
          <Icon className="w-3.5 h-3.5" /> {cat.label}
        </span>
        <span className="text-muted-foreground ml-auto flex items-center gap-1">
          {sourceIcons[card.source]}
        </span>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
        {card.body}
      </p>
    </button>
  );
}
