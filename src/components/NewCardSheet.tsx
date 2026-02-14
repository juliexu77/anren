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
import { FileText } from "lucide-react";

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
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // User cancelled file picker — close
      if (!didPickRef.current) onClose();
      return;
    }
    didPickRef.current = true;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
      setBody("📸 Photo captured — AI parsing coming soon!");
      setSheetOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
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
      imageUrl,
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
      {/* Hidden file input — always rendered */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Floating "Free text" button when file picker is open but sheet isn't */}
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
            <SheetTitle className="font-display text-lg">New Note</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {imageUrl && (
              <div className="rounded-xl overflow-hidden aspect-video bg-muted">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
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
              placeholder="Add a note..."
              className="min-h-[120px] border-none bg-secondary/50 resize-none focus-visible:ring-primary/30"
              autoFocus={!imageUrl}
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
            <Button onClick={handleSubmit} className="w-full" disabled={!body.trim() && !imageUrl}>
              Save Note
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
