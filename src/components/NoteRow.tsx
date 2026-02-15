import { useState, useRef } from "react";
import type { BrainCard } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { GripVertical, Trash2 } from "lucide-react";

interface Props {
  card: BrainCard;
  onClick: () => void;
  index: number;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, card: BrainCard) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetCard: BrainCard) => void;
  onDelete?: (id: string) => void;
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
  onDelete,
}: Props) {
  const cat = CATEGORY_CONFIG[card.category];
  const Icon = cat.icon;
  const isParsing = card.body === "@@PARSING@@";
  const preview = isParsing ? "" : card.body.split("\n")[0].substring(0, 100);

  const [offsetX, setOffsetX] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const startX = useRef(0);
  const swiping = useRef(false);

  const THRESHOLD = -80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    swiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return;
    const diff = e.touches[0].clientX - startX.current;
    // Only allow left swipe
    if (diff < 0) {
      setOffsetX(Math.max(diff, -120));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    swiping.current = false;
    if (offsetX < THRESHOLD) {
      setShowConfirm(true);
      setOffsetX(-100);
    } else {
      setOffsetX(0);
      setShowConfirm(false);
    }
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(card.id);
  };

  const handleCancelSwipe = () => {
    setOffsetX(0);
    setShowConfirm(false);
  };

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ animationDelay: `${index * 30}ms` }}>
      {/* Delete button behind */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end"
        style={{ width: 100 }}
      >
        <button
          onClick={showConfirm ? handleConfirmDelete : undefined}
          className="h-full w-full flex items-center justify-center gap-1.5 text-white text-xs font-semibold transition-colors"
          style={{
            background: showConfirm ? 'hsl(0 72% 51%)' : 'hsl(0 72% 61%)',
          }}
        >
          <Trash2 className="w-4 h-4" />
          {showConfirm ? "Confirm" : "Delete"}
        </button>
      </div>

      {/* Swipeable foreground */}
      <div
        draggable={!showConfirm}
        onDragStart={(e) => onDragStart?.(e, card)}
        onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }}
        onDragLeave={(e) => onDragLeave?.(e)}
        onDrop={(e) => { e.preventDefault(); onDrop?.(e, card); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={showConfirm ? handleCancelSwipe : onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer animate-fade-in relative
          ${isDragOver ? "ring-2 ring-primary bg-primary/10 scale-[1.02]" : "hover:bg-secondary/30"}
        `}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping.current ? 'none' : 'transform 0.3s ease',
          background: 'hsl(var(--bg))',
        }}
      >
        {!isParsing && (
          <>
            <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
            <Icon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          </>
        )}
        {isParsing ? (
          <p className="text-xs text-muted-foreground/60 italic flex-1 animate-pulse">Transcribing details…</p>
        ) : (
          <p className="text-sm text-foreground/90 truncate flex-1">{preview || "Empty note"}</p>
        )}
      </div>
    </div>
  );
}
