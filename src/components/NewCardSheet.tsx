import { useState, useRef, useEffect } from "react";
import type { CardCategory, CardSource } from "@/types/card";
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
import { FileText, Loader2, Sparkles } from "lucide-react";
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
  }) => void;
}

export function NewCardSheet({ open, onClose, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<CardCategory>("finance");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didPickRef = useRef(false);

  // When parent says "open", trigger file picker immediately
  useEffect(() => {
    if (open && !sheetOpen) {
      didPickRef.current = false;
      fileInputRef.current?.click();
    }
  }, [open, sheetOpen]);

  const reset = () => {
    setTitle("");
    setBody("");
    setCategory("finance");
    setImageUrl(undefined);
    setIsParsing(false);
  };

  const parseImageWithAI = async (base64: string) => {
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-image", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.title) setTitle(data.title);
      if (data.body) setBody(data.body);
      if (data.category && data.category in CATEGORY_CONFIG) {
        setCategory(data.category as CardCategory);
      }
      toast.success("Image parsed! ✨");
    } catch (e: any) {
      console.error("AI parse error:", e);
      toast.error(e.message || "Failed to parse image");
      setBody("📸 Photo captured — could not parse automatically.");
    } finally {
      setIsParsing(false);
    }
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
      setImageUrl(base64);
      setSheetOpen(true);
      // Trigger AI parsing
      parseImageWithAI(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const openAsText = () => {
    didPickRef.current = true;
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!body.trim() && !imageUrl) return;
    onAdd({
      title: title.trim(),
      body: body.trim(),
      category,
      source: imageUrl ? "screenshot" : "text",
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
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-secondary text-secondary-foreground shadow-lg backdrop-blur-sm"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Or type a note instead</span>
          </button>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) handleSheetClose(); }}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">
              {isParsing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <Sparkles className="w-4 h-4" />
                  Analyzing image…
                </span>
              ) : (
                "New Note"
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {imageUrl && (
              <div className="rounded-xl overflow-hidden aspect-video bg-muted relative">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                {isParsing && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm text-foreground font-medium">AI is reading…</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="font-display text-lg border-none bg-secondary/50 focus-visible:ring-primary/30"
              disabled={isParsing}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={isParsing ? "Extracting info from image…" : "Add a note..."}
              className="min-h-[120px] border-none bg-secondary/50 resize-none focus-visible:ring-primary/30"
              autoFocus={!imageUrl}
              disabled={isParsing}
            />

            <div>
              <p className="text-sm text-muted-foreground mb-2">Workstream</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_CONFIG) as CardCategory[]).map((key) => {
                  const cat = CATEGORY_CONFIG[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      disabled={isParsing}
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

          <div className="pt-4 border-t border-border">
            <Button onClick={handleSubmit} className="w-full" disabled={isParsing || (!body.trim() && !imageUrl)}>
              {isParsing ? "Parsing…" : "Save Note"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
