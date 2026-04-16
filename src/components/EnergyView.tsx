import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useReflections, type Reflection } from "@/hooks/useReflections";

export function EnergyView() {
  const { reflections, loading } = useReflections();

  return (
    <main className="px-4 pb-8 max-w-xl mx-auto">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 animate-spin border-divider-color/20 border-t-text-muted-color" />
        </div>
      ) : reflections.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-caption italic text-text-muted-color">
            No reflections yet.
          </p>
          <p className="text-micro text-text-muted-color mt-2">
            Use "Clear your mind" to start.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reflections.map((r) => (
            <ReflectionEntry key={r.id} reflection={r} />
          ))}
        </div>
      )}
    </main>
  );
}

function ReflectionEntry({ reflection }: { reflection: Reflection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left sanctuary-card px-4 py-3 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-micro text-text-muted-color">
            {format(parseISO(reflection.reflection_date), "EEEE, MMM d")}
          </span>
          <p className="text-caption font-medium text-text-primary mt-0.5 italic">
            "{reflection.texture}"
          </p>
          <p className="text-micro text-text-secondary-color mt-0.5 line-clamp-1">
            {reflection.texture_why}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-muted-color shrink-0 mt-1 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-divider-color/20 space-y-3 animate-fade-in">
          <div>
            <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">
              What this reveals
            </h4>
            <p className="text-caption text-text-secondary-color italic">
              {reflection.what_this_reveals}
            </p>
          </div>

          {reflection.energy_givers.length > 0 && (
            <div>
              <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">
                Energy givers
              </h4>
              <ul className="space-y-0.5">
                {reflection.energy_givers.map((g, i) => (
                  <li key={i} className="text-caption text-text-secondary-color">
                    + {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reflection.energy_drainers.length > 0 && (
            <div>
              <h4 className="text-micro uppercase tracking-wider text-text-muted-color mb-1">
                Energy drainers
              </h4>
              <ul className="space-y-0.5">
                {reflection.energy_drainers.map((d, i) => (
                  <li key={i} className="text-caption text-text-secondary-color">
                    − {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
