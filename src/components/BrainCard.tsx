import type { BrainCard as BrainCardType } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";

interface Props {
  card: BrainCardType;
  onClick: () => void;
  index: number;
}

export function BrainCardComponent({ card, onClick, index }: Props) {
  const cat = CATEGORY_CONFIG[card.category];
  const Icon = cat.icon;
  const isParsing = card.body === "@@PARSING@@";
  const preview = isParsing ? "" : card.body.split("\n")[0].substring(0, 80);

  return (
    <button
      onClick={onClick}
      className="relative w-full text-left rounded-lg p-3 animate-fade-in transition-shadow hover:shadow-lg"
      style={{
        background: 'hsl(var(--card-bg) / 0.6)',
        border: '1px solid hsl(var(--divider) / 0.3)',
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
          {cat.label}
        </span>
      </div>

      {isParsing ? (
        <p className="text-xs text-muted-foreground/60 italic animate-pulse">Transcribing…</p>
      ) : (
        <p className="text-xs text-foreground/85 line-clamp-3 leading-relaxed">
          {preview || "Empty note"}
        </p>
      )}
    </button>
  );
}
