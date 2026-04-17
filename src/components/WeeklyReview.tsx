import { useMemo } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useLifeReview } from "@/hooks/useLifeReview";
import type { BrainCard } from "@/types/card";

interface Props {
  cards: BrainCard[];
  cardsLoading: boolean;
}

export function WeeklyReview({ cards, cardsLoading }: Props) {
  const { review, loading, generating, regenerate } = useLifeReview();

  const dateRange = useMemo(() => {
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    return `${format(ws, "MMM d")}–${format(we, "MMM d")}`;
  }, []);

  if (loading || cardsLoading) {
    return (
      <main
        className="px-4 pb-4 flex flex-col items-center justify-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="w-8 h-8 rounded-full border-2 animate-spin border-divider-color/20 border-t-text-muted-color" />
        {generating && (
          <p className="text-caption italic text-text-muted-color mt-6 max-w-xs text-center">
            Reading your week…
          </p>
        )}
      </main>
    );
  }

  if (!review) {
    return (
      <main className="px-4 pb-12 pt-6">
        <p className="text-caption italic text-text-muted-color text-center py-16">
          Your week will take shape here as you move through it.
        </p>
      </main>
    );
  }

  return (
    <main className="px-5 pb-16 pt-2 space-y-10 max-w-xl mx-auto">
      {/* Title */}
      <header className="space-y-1 flex items-start justify-between gap-3">
        <div>
          <p className="text-micro uppercase tracking-[0.25em] text-text-muted-color">
            Weekly life review
          </p>
          <h2 className="font-display text-3xl text-text-primary">{dateRange}</h2>
        </div>
        <button
          onClick={regenerate}
          disabled={generating}
          aria-label="Regenerate review"
          className="text-text-muted-color hover:text-text-primary transition-colors p-1.5 -mr-1.5 mt-1"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
        </button>
      </header>

      {/* Arc */}
      {review.arc && (
        <section>
          <p className="text-body-reading text-text-primary leading-relaxed">
            {review.arc}
          </p>
        </section>
      )}

      {/* Themes */}
      {review.themes?.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">
            What's alive this week
          </h3>
          {review.themes.map((t, i) => (
            <div key={i} className="space-y-2">
              <h4 className="font-display text-xl text-text-primary leading-snug">
                {t.title}
              </h4>
              <p className="text-body text-text-secondary-color leading-relaxed">
                {t.body}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Friction */}
      {review.friction?.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">
            Where the friction is
          </h3>
          {review.friction.map((f, i) => (
            <div key={i} className="space-y-2">
              <h4 className="font-display text-xl text-text-primary leading-snug">
                {f.title}
              </h4>
              <p className="text-body text-text-secondary-color leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Pattern */}
      {review.pattern && (
        <section className="space-y-3">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">
            The pattern underneath
          </h3>
          <p className="text-body text-text-secondary-color leading-relaxed">
            {review.pattern}
          </p>
        </section>
      )}

      {/* Reveals */}
      {review.reveals && (
        <section className="space-y-3">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">
            What this reveals
          </h3>
          <p className="text-body-reading text-text-primary leading-relaxed">
            {review.reveals}
          </p>
        </section>
      )}

      {/* Closing */}
      {review.closing && (
        <p className="text-caption italic text-text-muted-color text-center pt-4 leading-relaxed">
          {review.closing}
        </p>
      )}
    </main>
  );
}
