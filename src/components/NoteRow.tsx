import type { BrainCard } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { GripVertical, Loader2 } from "lucide-react";

interface Props {
  card: BrainCard;
  onClick: () => void;
  index: number;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, card: BrainCard) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetCard: BrainCard) => void;
}

export function NoteRow({
  card,
  onClick,
  index,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  const cat = CATEGORY_CONFIG[card.category];
  const Icon = cat.icon;
  const isParsing = card.body === "@@PARSING@@";
  const preview = isParsing ? "" : card.body.split("\n")[0].substring(0, 100);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, card)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }}
      onDragLeave={(e) => onDragLeave?.(e)}
      onDrop={(e) => { e.preventDefault(); onDrop?.(e, card); }}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer animate-fade-in
        ${isDragOver ? "ring-2 ring-primary bg-primary/10 scale-[1.02]" : "hover:bg-secondary/30"}
      `}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
      {isParsing ? (
        <Loader2 className="w-4 h-4 text-muted-foreground/60 shrink-0 animate-spin" />
      ) : (
        <Icon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      )}
      {isParsing ? (
        <div className="flex-1 flex items-center gap-2">
          <div className="h-3 rounded-full bg-muted-foreground/15 animate-pulse" style={{ width: '60%' }} />
        </div>
      ) : (
        <p className="text-sm text-foreground/90 truncate flex-1">{preview || "Empty note"}</p>
      )}
    </div>
  );
}
