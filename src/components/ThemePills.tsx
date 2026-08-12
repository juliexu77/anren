import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface ThemePill {
  label: string;
  detail?: string;
  noteIds?: string[];
}

/** A wrapping row of quiet pills; tapping one reveals its grounding beneath. */
export function ThemePills({
  items,
  titleById,
}: {
  items: ThemePill[];
  titleById?: Map<string, string>;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (!items.length) return null;

  const current = active === null ? null : items[active];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <button
            key={`${item.label}-${i}`}
            onClick={() => setActive((prev) => (prev === i ? null : i))}
            className={cn(
              "rounded-full border border-hairline px-3 py-1.5 text-[0.8rem] leading-none transition-colors",
              active === i
                ? "bg-foreground/[0.06] text-foreground"
                : "bg-paper/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {current && (current.detail || !!current.noteIds?.length) && (
        <div className="mt-3.5">
          {current.detail && (
            <p className="text-[0.9rem] leading-[1.7] text-muted-foreground">{current.detail}</p>
          )}
          {!!current.noteIds?.length && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {current.noteIds.map((id) => (
                <Link
                  key={id}
                  to={`/note/${id}`}
                  className="text-[0.78rem] text-muted-foreground/80 underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground"
                >
                  {titleById?.get(id) ?? "Note"}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
