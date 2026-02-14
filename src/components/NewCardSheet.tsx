import { useState } from "react";
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
import { Camera, Mic, FileText } from "lucide-react";

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
  const [mode, setMode] = useState<CardSource>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<CardCategory>("general");
  const [imageUrl, setImageUrl] = useState<string | undefined>();

  const reset = () => {
    setTitle("");
    setBody("");
    setCategory("general");
    setMode("text");
    setImageUrl(undefined);
  };

  const handleSubmit = () => {
    if (!body.trim() && !imageUrl) return;
    onAdd({
      title: title.trim(),
      body: body.trim(),
      category,
      source: mode,
      imageUrl,
    });
    reset();
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
      setMode("screenshot");
      // In v2, this would send to AI for parsing
      setBody("📸 Screenshot captured — AI parsing coming soon!");
    };
    reader.readAsDataURL(file);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[80vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-lg">Brain Dump</SheetTitle>
        </SheetHeader>

        {/* Source selector */}
        <div className="flex gap-2 mt-3">
          {([
            { key: "text" as const, icon: FileText, label: "Note" },
            { key: "screenshot" as const, icon: Camera, label: "Screenshot" },
            { key: "voice" as const, icon: Mic, label: "Voice" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key === "screenshot") {
                  document.getElementById("screenshot-input")?.click();
                } else {
                  setMode(key);
                }
              }}
              className={`category-pill flex items-center gap-1.5 ${
                mode === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          <input
            id="screenshot-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {imageUrl && (
            <div className="rounded-xl overflow-hidden aspect-video bg-muted">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {mode === "voice" ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mic className="w-12 h-12 mb-3 text-primary/40" />
              <p className="text-sm">Voice memos coming soon!</p>
              <p className="text-xs mt-1">Tap Note to type instead</p>
            </div>
          ) : (
            <>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="font-display text-lg border-none bg-secondary/50 focus-visible:ring-primary/30"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What's on your mind? Just dump it here..."
                className="min-h-[150px] border-none bg-secondary/50 resize-none focus-visible:ring-primary/30"
                autoFocus
              />
            </>
          )}

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

        <div className="pt-4 border-t border-border">
          <Button onClick={handleSubmit} className="w-full" disabled={!body.trim() && !imageUrl}>
            Save Card
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
