import { useRef, useEffect } from "react";
import type { CardCategory, CardSource } from "@/types/card";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didPickRef = useRef(false);

  useEffect(() => {
    if (open) {
      didPickRef.current = false;
      fileInputRef.current?.click();
    }
  }, [open]);

  const parseImageInBackground = (base64: string, cardId: string) => {
    supabase.functions.invoke("parse-image", {
      body: { imageBase64: base64 },
    }).then(({ data, error }) => {
      if (error || data?.error) {
        console.error("Background parse error:", error || data?.error);
        toast.error("Couldn't parse image — edit the note manually");
        if (onUpdateCard) {
          onUpdateCard(cardId, { body: "Failed to parse image" });
        }
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
    if (!file) {
      if (!didPickRef.current) onClose();
      return;
    }
    didPickRef.current = true;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const cardId = await onAdd({
        title: "",
        body: "@@PARSING@@",
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

  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleImageUpload}
    />
  );
}
