import { useState } from "react";
import type { BrainCard, CardCategory } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  card: BrainCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Pick<BrainCard, "title" | "body" | "category">>) => void;
  onDelete: (id: string) => void;
}

export function CardDetailSheet({ card, open, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<CardCategory>("finance");

  // Sync local state when card changes
  const currentCardId = card?.id;
  const [lastId, setLastId] = useState<string | null>(null);
  if (currentCardId && currentCardId !== lastId) {
    setLastId(currentCardId);
    setTitle(card!.title);
    setBody(card!.body);
    setCategory(card!.category);
  }

  if (!card) return null;

  const handleSave = () => {
    onUpdate(card.id, { title, body, category });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-lg">Edit Card</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {card.imageUrl && (
            <div className="rounded-xl overflow-hidden aspect-video bg-muted">
              <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="font-display text-lg border-none bg-secondary/50 focus-visible:ring-primary/30"
          />

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[200px] border-none bg-secondary/50 resize-none focus-visible:ring-primary/30"
          />

          <div>
            <p className="text-sm text-muted-foreground mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_CONFIG) as CardCategory[]).map((key) => {
                const cat = CATEGORY_CONFIG[key];
                return (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`category-pill ${
                      category === key
                        ? "bg-primary text-primary-foreground"
                        : `${cat.color} text-foreground/70`
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              onDelete(card.id);
              onClose();
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
