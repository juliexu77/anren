import { useState, useRef } from "react";
import type { BrainCard as BrainCardType } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { Trash2 } from "lucide-react";

interface Props {
  card: BrainCardType;
  onClick: () => void;
  index: number;
  onDelete?: (id: string) => void;
}

export function BrainCardComponent({ card, onClick, index, onDelete }: Props) {
  const cat = CATEGORY_CONFIG[card.category];
  const Icon = cat.icon;
  const isParsing = card.body === "@@PARSING@@";
  const preview = isParsing ? "" : card.body.split("\n")[0].substring(0, 80);

  const [offsetX, setOffsetX] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const startX = useRef(0);
  const swiping = useRef(false);
  const THRESHOLD = -60;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    swiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) setOffsetX(Math.max(diff, -80));
    else setOffsetX(0);
  };

  const handleTouchEnd = () => {
    swiping.current = false;
    if (offsetX < THRESHOLD) {
      setShowConfirm(true);
      setOffsetX(-70);
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
    <div
      className="relative overflow-hidden rounded-lg animate-fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Delete behind */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end" style={{ width: 70 }}>
        <button
          onClick={showConfirm ? handleConfirmDelete : undefined}
          className="h-full w-full flex items-center justify-center gap-1 text-white text-[10px] font-semibold rounded-r-lg"
          style={{ background: showConfirm ? 'hsl(0 72% 51%)' : 'hsl(0 72% 61%)' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {showConfirm ? "OK" : ""}
        </button>
      </div>

      {/* Card foreground */}
      <button
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={showConfirm ? handleCancelSwipe : onClick}
        className="relative w-full text-left rounded-lg p-3 transition-transform"
        style={{
          background: 'hsl(var(--card-bg) / 0.6)',
          border: '1px solid hsl(var(--divider) / 0.3)',
          transform: `translateX(${offsetX}px)`,
          transition: swiping.current ? 'none' : 'transform 0.3s ease',
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
    </div>
  );
}
