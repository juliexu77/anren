import { useState, useRef, useEffect } from "react";
import type { CardCategory, CardSource } from "@/types/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didPickRef = useRef(false);

  useEffect(() => {
    if (open && !sheetOpen) {
      didPickRef.current = false;
      fileInputRef.current?.click();
    }
  }, [open, sheetOpen]);

  const reset = () => {
    setBody("");
    setImagePreview(undefined);
  };

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
      toast.success("Image parsed! ✨");
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (!didPickRef.current) onClose();
      return;
    }
    didPickRef.current = true;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      // Save immediately with placeholder, parse in background
      const cardId = onAdd({
        title: "",
        body: "📷 Parsing image…",
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

  const openAsText = () => {
    didPickRef.current = true;
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!body.trim()) return;
    onAdd({
      title: "",
      body: body.trim(),
      source: "text",
    });
    reset();
    setSheetOpen(false);
    onClose();
  };

  const handleSheetClose = () => {
    reset();
    setSheetOpen(false);
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

      {open && !sheetOpen && (
        <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center animate-fade-in">
          <button
            onClick={openAsText}
            className="flex items-center gap-2 px-5 py-3 rounded-lg bg-secondary text-secondary-foreground shadow-lg backdrop-blur-sm"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Or type a note instead</span>
          </button>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) handleSheetClose(); }}>
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
