import { AlertTriangle } from "lucide-react";
import type { BrainCard as BrainCardType } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";

interface Props {
  card: BrainCardType;
  onClick: () => void;
  index: number;
}

export function BrainCardComponent({ card, onClick, index }: Props) {
  const cat = CATEGORY_CONFIG[card.category];
  const isParsing = card.body === "@@PARSING@@";
  const isFailed = card.body === "@@PARSE_FAILED@@";
  const preview = (isParsing || isFailed) ? "" : (card.summary || card.body.split("\n")[0]).substring(0, 60);

  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-lg p-3 animate-fade-in transition-shadow hover:shadow-lg overflow-hidden"
      style={{
        background: 'hsl(var(--card-bg) / 0.6)',
        border: `1px solid ${isFailed ? 'hsl(0 60% 50% / 0.4)' : 'hsl(var(--divider) / 0.3)'}`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      {isParsing ? (
        <p className="text-xs text-muted-foreground/60 italic animate-pulse">Transcribing…</p>
      ) : isFailed ? (
        <div className="space-y-2">
          {card.imageUrl && (
            <img src={card.imageUrl} alt="Uploaded" className="w-full h-16 object-cover rounded opacity-70" />
          )}
          <p className="text-xs text-destructive/80 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Parse failed — tap to delete
          </p>
        </div>
      ) : (
        <p className="text-xs text-foreground/85 line-clamp-2 leading-relaxed">
          {card.title && <><span className="font-bold">{card.title}</span>{" "}</>}
          {preview || "Empty note"}
        </p>
      )}
    </button>
  );
}
