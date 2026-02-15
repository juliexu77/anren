import type { CardCategory } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

interface Props {
  active: CardCategory | "all";
  onChange: (cat: CardCategory | "all") => void;
}

export function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
      <button
        onClick={() => onChange("all")}
        className={cn(
          "category-pill whitespace-nowrap flex items-center gap-1.5",
          active === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5" /> All
      </button>
      {(Object.keys(CATEGORY_CONFIG) as CardCategory[]).map((key) => {
        const cat = CATEGORY_CONFIG[key];
        const Icon = cat.icon;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              "category-pill whitespace-nowrap flex items-center gap-1.5",
              active === key
                ? "bg-primary text-primary-foreground"
                : `${cat.color} text-foreground/70`
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {cat.label}
          </button>
        );
      })}
    </div>
  );
}
