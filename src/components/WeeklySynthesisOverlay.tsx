import { X } from "lucide-react";
import type { WeeklySynthesis } from "@/hooks/useWeeklySynthesis";

interface Props {
  synthesis: WeeklySynthesis;
  onDismiss: () => void;
}

export function WeeklySynthesisOverlay({ synthesis, onDismiss }: Props) {
  const maxDomain = synthesis.domains[0];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 animate-in fade-in duration-700 bg-bg-color overflow-y-auto">
      <button
        onClick={onDismiss}
        className="absolute top-14 right-5 p-2 rounded-lg transition-colors text-text-muted-color"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-sm w-full space-y-5 py-16">
        <h1
          className="text-h2 text-center text-text-primary"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}
        >
          Your week
        </h1>

        {/* Narrative */}
        <div className="sanctuary-card px-5 py-4 bg-card-bg-color/60">
          <p className="text-body-sm text-text-secondary-color leading-relaxed">
            {synthesis.narrative}
          </p>
        </div>

        {/* Domain breakdown */}
        <div className="sanctuary-card px-5 py-4 bg-card-bg-color/60 space-y-3">
          <p className="text-label text-text-muted-color">Where your energy went</p>
          {synthesis.domains.map((d) => (
            <div key={d.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-primary">{d.name}</span>
                <span className="text-micro text-text-muted-color">
                  {d.percentage}% · {d.count} item{d.count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-color overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-1 transition-all duration-700"
                  style={{ width: `${d.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stale nudges */}
        {synthesis.stale_items.length > 0 && (
          <div className="sanctuary-card px-5 py-4 bg-card-bg-color/60 space-y-3">
            <p className="text-label text-text-muted-color">Sitting a while</p>
            {synthesis.stale_items.map((item, i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-caption text-text-primary">{item.title}</p>
                <p className="text-micro text-text-muted-color">
                  {item.days_old} days · {item.nudge}
                </p>
              </div>
            ))}
            <p className="text-micro text-accent-1 pt-1">
              Try "What's my next step?" on any card to lighten the load.
            </p>
          </div>
        )}

        <p className="text-center text-micro text-text-muted-color">
          {synthesis.total_cards_analyzed} items analyzed
        </p>

        <button
          onClick={onDismiss}
          className="sanctuary-btn w-full py-3 text-button bg-surface-color/70"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
