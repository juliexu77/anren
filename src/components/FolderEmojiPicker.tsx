import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const COMMON = [
  "📁", "🏡", "🫂", "💼", "💰", "🌿", "🏃", "💡",
  "📖", "✈️", "🍳", "🎧", "🎨", "🎓", "🧭", "🪴",
  "☕", "🌙", "🔑", "🧩", "🕰️", "🗺️", "🌊", "🔖",
];

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
  const [alternates, setAlternates] = useState<string[]>([]);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!open || alternates.length) return;
    let cancelled = false;
    supabase.functions
      .invoke("suggest-folder-emoji", { body: { name } })
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const list: string[] = [];
        if (data?.emoji) list.push(String(data.emoji));
        if (Array.isArray(data?.alternates)) list.push(...data.alternates.map(String));
        setAlternates([...new Set(list)].slice(0, 4));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, name, alternates.length]);

  const pick = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSelect([...trimmed][0] ?? trimmed);
    setCustom("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change icon for ${name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={cn(
            "shrink-0 leading-none text-center transition-opacity hover:opacity-70",
            size === "lg" ? "text-[1.5rem] w-8" : "text-[0.95rem] w-[17px]",
            !emoji && "text-muted-foreground/60",
            className,
          )}
        >
          {emoji ?? "·"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        {alternates.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/70">
              Suggested
            </p>
            <div className="flex gap-1">
              {alternates.map((a) => (
                <button
                  key={a}
                  onClick={() => pick(a)}
                  className="h-8 w-8 rounded-md text-[1.05rem] leading-none hover:bg-paper-sunk transition-colors"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mb-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/70">
          Choose
        </p>
        <div className="grid grid-cols-8 gap-0.5">
          {COMMON.map((c) => (
            <button
              key={c}
              onClick={() => pick(c)}
              className={cn(
                "h-7 w-7 rounded-md text-[0.95rem] leading-none hover:bg-paper-sunk transition-colors",
                c === emoji && "bg-paper-sunk",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") pick(custom);
          }}
          placeholder="Or paste any emoji"
          className="mt-3 w-full border-b border-hairline bg-transparent pb-1.5 text-[0.85rem] outline-none placeholder:text-muted-foreground/50"
        />
      </PopoverContent>
    </Popover>
  );
}
