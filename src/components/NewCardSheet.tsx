import { useState, useRef } from "react";
import type { CardCategory, CardSource } from "@/types/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, FileText, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    title: string;
    body: string;
    category?: CardCategory;
    source?: CardSource;
    imageUrl?: string;
  }) => Promise<string> | string | void;
  onUpdateCard?: (id: string, updates: { body?: string; category?: CardCategory }) => void;
}

export function NewCardSheet({ open, onClose, onAdd, onUpdateCard }: Props) {
  const [body, setBody] = useState("");
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => setBody("");

  const parseImageInBackground = (base64: string, cardId: string) => {
    supabase.functions.invoke("parse-image", {
      body: { imageBase64: base64 },
    }).then(({ data, error }) => {
      if (error || data?.error) {
        console.error("Background parse error:", error || data?.error);
        toast.error("Couldn't parse image — edit the note manually");
        return;
      }
      const parts: string[] = [];
      if (data.title) parts.push(data.title);
      if (data.body) parts.push(data.body);
      const parsedBody = parts.join("\n\n");

      if (onUpdateCard) {
        onUpdateCard(cardId, {
          body: parsedBody,
          ...(data.category ? { category: data.category } : {}),
        });
      }
      toast.success("Image parsed!");
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const cardId = await onAdd({
        title: "",
        body: "Parsing image...",
        source: "screenshot",
      });
      if (cardId && typeof cardId === "string") {
        parseImageInBackground(base64, cardId);
      }
      onClose();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleVoice = () => {
    toast("Voice capture coming soon");
    onClose();
  };

  const handleSubmit = () => {
    if (!body.trim()) return;
    onAdd({
      title: "",
      body: body.trim(),
      source: "text",
    });
    reset();
    setTextSheetOpen(false);
    onClose();
  };

  const handleSheetClose = () => {
    reset();
    setTextSheetOpen(false);
    onClose();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Capture method picker */}
      <Sheet open={open && !textSheetOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent side="bottom" className="rounded-t-xl pb-10">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">New note</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 py-5 rounded-lg transition-colors"
              style={{ background: 'hsl(var(--surface))' }}
            >
              <Camera className="w-6 h-6 text-foreground/70" />
              <span className="text-xs font-medium text-muted-foreground">Photo</span>
            </button>
            <button
              onClick={() => { setTextSheetOpen(true); }}
              className="flex flex-col items-center gap-2 py-5 rounded-lg transition-colors"
              style={{ background: 'hsl(var(--surface))' }}
            >
              <FileText className="w-6 h-6 text-foreground/70" />
              <span className="text-xs font-medium text-muted-foreground">Type</span>
            </button>
            <button
              onClick={handleVoice}
              className="flex flex-col items-center gap-2 py-5 rounded-lg transition-colors"
              style={{ background: 'hsl(var(--surface))' }}
            >
              <Mic className="w-6 h-6 text-foreground/70" />
              <span className="text-xs font-medium text-muted-foreground">Voice</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Text entry sheet */}
      <Sheet open={textSheetOpen} onOpenChange={(o) => { if (!o) handleSheetClose(); }}>
        <SheetContent side="bottom" className="rounded-t-xl h-[60vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Brain dump</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Jot it down — incomplete is fine…"
              className="min-h-[160px] border-none bg-secondary/50 resize-none focus-visible:ring-primary/30 text-base"
              autoFocus
            />
          </div>

          <div className="pt-4 border-t border-border">
            <Button onClick={handleSubmit} className="w-full" disabled={!body.trim()}>
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
