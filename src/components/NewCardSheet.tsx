import { useRef, useEffect } from "react";
import type { CardSource } from "@/types/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    title: string;
    body: string;
    source?: CardSource;
    imageUrl?: string;
  }) => Promise<string> | string | void;
  onUpdateCard?: (id: string, updates: { title?: string; body?: string; summary?: string }) => void;
}

async function uploadImageToStorage(userId: string, base64: string): Promise<string | null> {
  try {
    const match = base64.match(/^data:(image\/(\w+));base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const ext = match[2];
    const raw = match[3];

    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("card-images")
      .upload(fileName, bytes, { contentType: mimeType });

    if (error) {
      console.error("Image upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from("card-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.error("Image upload failed:", e);
    return null;
  }
}

export function NewCardSheet({ open, onClose, onAdd, onUpdateCard }: Props) {
  const { user } = useAuth();
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
        if (onUpdateCard) onUpdateCard(cardId, { body: "@@PARSE_FAILED@@" });
        return;
      }
      if (onUpdateCard) {
        onUpdateCard(cardId, {
          ...(data.title ? { title: data.title } : {}),
          body: data.body || "",
          summary: data.summary || "",
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
      let imageUrl: string | undefined;
      if (user) {
        const url = await uploadImageToStorage(user.id, base64);
        if (url) imageUrl = url;
      }
      const cardId = await onAdd({
        title: "",
        body: "@@PARSING@@",
        source: "screenshot",
        imageUrl,
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
