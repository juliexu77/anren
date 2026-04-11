import { useState, useRef } from "react";
import type { BrainCard } from "@/types/card";
import { Trash2, ChevronLeft, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  card: BrainCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Pick<BrainCard, "title" | "summary" | "body">>) => void;
  onDelete: (id: string) => void;
  onComplete?: (id: string) => void;
  suggestion?: string;
  onResearch?: (cardId: string, title: string, body: string, type: string | null) => void;
  researching?: boolean;
}

export function CardDetailSheet({ card, open, onClose, onUpdate, onDelete, onComplete, suggestion, onResearch, researching }: Props) {
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

  const handleTapToEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = () => {
    onUpdate(card.id, { body });
    setIsEditing(false);
    onClose();
  };

  const handleClose = () => {
    if (body !== card.body) {
      onUpdate(card.id, { body });
    }
    onClose();
  };

  const typeLabel = card.type === "task" ? "Task" : card.type === "ongoing" ? "Ongoing" : card.type === "event" ? "Event" : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-in fade-in slide-in-from-right duration-200 bg-bg-color">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={handleClose} className="flex items-center gap-1 text-text-primary/70 active:text-text-primary">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
        {typeLabel && (
          <span className="text-xs text-text-muted-color/60 font-medium uppercase tracking-wider">
            {typeLabel}
          </span>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { onComplete?.(card.id); onClose(); }}
            className="text-green-500/70 active:text-green-500 p-1"
            title="Mark complete"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => { onDelete(card.id); onClose(); }}
            className="text-text-muted-color/70 active:text-text-muted-color p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      {card.title && (
        <div className="px-5 pt-2">
          <h2 className="text-h3 text-text-primary">{card.title}</h2>
        </div>
      )}

      {/* Attached image */}
      {card.imageUrl && (
        <div className="px-5 pt-2">
          <img
            src={card.imageUrl}
            alt="Attachment"
            className="w-full rounded-xl border border-border/30 max-h-72 object-contain bg-black/5"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pt-4 pb-8 overflow-y-auto" onClick={!isEditing ? handleTapToEdit : undefined}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-full bg-transparent border-none outline-none resize-none text-base leading-relaxed text-text-primary/90 placeholder:text-text-muted-color/40"
            placeholder="Tap to write…"
          />
        ) : (
          <p className="text-base leading-relaxed text-text-primary/90 whitespace-pre-wrap">
            {body || <span className="text-text-muted-color/40 italic">Tap to write…</span>}
          </p>
        )}
      </div>

      {/* AI Suggestion */}
      {suggestion && (
        <div className="mx-5 mb-3 sanctuary-card px-4 py-3">
          <p className="text-xs font-medium mb-1 text-text-muted-color">
            ✦ Thinking partner
          </p>
          <p className="text-sm leading-relaxed text-text-secondary-color">
            {suggestion}
          </p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="px-5 pb-6 pt-2 space-y-2">
        {isEditing && (
          <Button className="w-full" onClick={handleSave}>Save</Button>
        )}
        <button
          onClick={() => card && onResearch?.(card.id, card.title, body || card.body, card.type)}
          disabled={researching}
          className="sanctuary-btn w-full flex items-center justify-center gap-2 py-3 text-sm text-text-primary/70"
        >
          {researching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {researching ? "Thinking…" : "What's my next step?"}
        </button>
      </div>
    </div>
  );
}
