import { useState } from "react";
import type { BrainCard, CardCategory } from "@/types/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const [body, setBody] = useState("");

  const currentCardId = card?.id;
  const [lastId, setLastId] = useState<string | null>(null);
  if (currentCardId && currentCardId !== lastId) {
    setLastId(currentCardId);
    setBody(card!.body);
  }

  if (!card) return null;

  const handleSave = () => {
    onUpdate(card.id, { body });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-lg">Edit Note</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[250px] border-none bg-transparent resize-none focus-visible:ring-primary/30 text-base"
          />
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
