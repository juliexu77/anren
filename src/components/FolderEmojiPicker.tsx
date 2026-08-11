import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  FOLDER_GLYPHS,
  FOLDER_GLYPH_KEYS,
  FolderGlyph,
  FolderMark,
  GLYPH_PREFIX,
  isGlyphValue,
} from "@/components/folder-glyphs";

export function FolderEmojiPicker({
  name,
  emoji,
  onSelect,
  className,
  size = "sm",
}: {
  name: string;
  emoji: string | null;
  onSelect: (emoji: string) => void;
  className?: string;
  size?: "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!open || suggested.length) return;
    let cancelled = false;
    supabase.functions
      .invoke("suggest-folder-emoji", { body: { name } })
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const list: string[] = [];
        if (data?.emoji) list.push(String(data.emoji));
        if (Array.isArray(data?.alternates)) list.push(...data.alternates.map(String));
        setSuggested([...new Set(list.filter(isGlyphValue))].slice(0, 4));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, name, suggested.length]);

  const pickGlyph = (key: string) => {
    onSelect(`${GLYPH_PREFIX}${key}`);
    setCustom("");
    setOpen(false);
  };

  const pickCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    onSelect([...trimmed][0] ?? trimmed);
    setCustom("");
    setOpen(false);
  };

  const iconSize = size === "lg" ? 24 : 17;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change mark for ${name}`}
          onClick={(e) => {
            // The mark can sit inside a folder link — stop navigation, toggle by hand.
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={cn(
            "shrink-0 inline-flex items-center justify-center leading-none transition-colors",
            "text-primary/80 hover:text-primary",
            size === "lg" ? "w-7 h-7" : "w-[19px] h-[19px]",
            className,
          )}
        >
          <FolderMark value={emoji} size={iconSize} className="text-current" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        {suggested.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              Suggested
            </p>
            <div className="flex gap-1">
              {suggested.map((value) => {
                const key = value.slice(GLYPH_PREFIX.length);
                return (
                  <button
                    key={value}
                    onClick={() => pickGlyph(key)}
                    aria-label={FOLDER_GLYPHS[key]?.label ?? key}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-primary/85 hover:bg-paper-sunk hover:text-primary transition-colors"
                  >
                    <FolderGlyph glyph={key} size={19} className="text-current" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mb-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/70">
          Choose a mark
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {FOLDER_GLYPH_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => pickGlyph(key)}
              aria-label={FOLDER_GLYPHS[key].label}
              className={cn(
                "h-8 w-8 inline-flex items-center justify-center rounded-md text-primary/75 hover:bg-paper-sunk hover:text-primary transition-colors",
                emoji === `${GLYPH_PREFIX}${key}` && "bg-paper-sunk text-primary",
              )}
            >
              <FolderGlyph glyph={key} size={18} className="text-current" />
            </button>
          ))}
        </div>

        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") pickCustom();
          }}
          placeholder="Or paste any emoji"
          className="mt-3 w-full border-b border-hairline bg-transparent pb-1.5 text-[0.85rem] outline-none placeholder:text-muted-foreground/50"
        />
      </PopoverContent>
    </Popover>
  );
}
