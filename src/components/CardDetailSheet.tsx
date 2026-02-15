import { useState, useRef } from "react";
import type { BrainCard, CardCategory } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronLeft } from "lucide-react";

interface Props {
  card: BrainCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Pick<BrainCard, "title" | "body" | "category">>) => void;
  onDelete: (id: string) => void;
}

export function CardDetailSheet({ card, open, onClose, onUpdate, onDelete }: Props) {
  const [body, setBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentCardId = card?.id;
  const [lastId, setLastId] = useState<string | null>(null);
  if (currentCardId && currentCardId !== lastId) {
    setLastId(currentCardId);
    setBody(card!.body);
    setIsEditing(false);
  }

  if (!card || !open) return null;

  const cat = CATEGORY_CONFIG[card.category];
  const Icon = cat.icon;

  const handleTapToEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = () => {
    onUpdate(card.id, { body });
    setIsEditing(false);
  };

  const handleClose = () => {
    if (body !== card.body) {
      onUpdate(card.id, { body });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-in fade-in slide-in-from-right duration-200"
      style={{ background: 'hsl(var(--bg))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleClose} className="flex items-center gap-1 text-foreground/70 active:text-foreground">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">
            {cat.label}
          </span>
        </div>
        <button
          onClick={() => { onDelete(card.id); onClose(); }}
          className="text-destructive/70 active:text-destructive p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content — tap to edit, no container */}
      <div className="flex-1 px-5 pt-4 pb-8 overflow-y-auto" onClick={!isEditing ? handleTapToEdit : undefined}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={handleSave}
            className="w-full h-full bg-transparent border-none outline-none resize-none text-base leading-relaxed text-foreground/90 placeholder:text-muted-foreground/40"
            placeholder="Tap to write…"
          />
        ) : (
          <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {body || <span className="text-muted-foreground/40 italic">Tap to write…</span>}
          </p>
        )}
      </div>
    </div>
  );
}
