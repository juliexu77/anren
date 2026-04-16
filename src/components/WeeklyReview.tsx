import { useMemo } from "react";
import { format, parseISO, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useReflections } from "@/hooks/useReflections";
import { useReflectionDigest } from "@/hooks/useReflectionDigest";
import type { BrainCard } from "@/types/card";

interface Props {
  cards: BrainCard[];
  cardsLoading: boolean;
}

export function WeeklyReview({ cards, cardsLoading }: Props) {
  const { reflections, loading: reflLoading } = useReflections();
  const { weeklyDigest, monthlyDigest } = useReflectionDigest();

  const data = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const last7 = subDays(now, 7);

    const inWeek = (d: string) => {
      try {
        return isWithinInterval(parseISO(d), { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    };

    const completedThisWeek = cards.filter(
      (c) => c.status === "complete" && inWeek(c.updatedAt || c.createdAt)
    );
    const activeNow = cards.filter(
      (c) =>
        c.status === "active" &&
        c.body !== "@@PARSING@@" &&
        c.body !== "@@PARSE_FAILED@@"
    );
    const overdueOrSoon = activeNow.filter((c) => {
      if (!c.dueAt) return false;
      const due = parseISO(c.dueAt);
      return due <= subDays(now, -2); // due today or in next 2 days, or overdue
    });

    const recentReflections = reflections.filter((r) => {
      try {
        return parseISO(r.reflection_date) >= last7;
      } catch {
        return false;
      }
    });

    // Aggregate energy signals
    const givers = recentReflections.flatMap((r) => r.energy_givers || []);
    const drainers = recentReflections.flatMap((r) => r.energy_drainers || []);
    const threads = recentReflections.flatMap((r) => r.unresolved_threads || []);
    const textures = recentReflections.map((r) => ({
      date: r.reflection_date,
      texture: r.texture,
      why: r.texture_why,
    }));

    return {
      weekStart,
      weekEnd,
      completedThisWeek,
      activeNow,
      overdueOrSoon,
      recentReflections,
      givers,
      drainers,
      threads,
      textures,
    };
  }, [cards, reflections]);

  const loading = cardsLoading || reflLoading;
  const digest = monthlyDigest || weeklyDigest;

  if (loading) {
    return (
      <main className="px-4 pb-4 flex flex-col items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin border-divider-color/20 border-t-text-muted-color" />
      </main>
    );
  }

  const hasAnything =
    data.completedThisWeek.length > 0 ||
    data.recentReflections.length > 0 ||
    data.activeNow.length > 0;

  if (!hasAnything) {
    return (
      <main className="px-4 pb-12 pt-6">
        <p className="text-caption italic text-text-muted-color text-center py-16">
          Your week will take shape here as you move through it.
        </p>
      </main>
    );
  }

  const dateRange = `${format(data.weekStart, "MMM d")}–${format(data.weekEnd, "MMM d")}`;

  return (
    <main className="px-5 pb-16 pt-2 space-y-10 max-w-xl mx-auto">
      {/* Title */}
      <header className="space-y-1">
        <p className="text-micro uppercase tracking-[0.25em] text-text-muted-color">
          Weekly life review
        </p>
        <h2 className="font-display text-3xl text-text-primary">{dateRange}</h2>
      </header>

      {/* The arc */}
      {(digest || data.textures.length > 1) && (
        <section className="space-y-3">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">The arc</h3>
          {digest ? (
            <p className="font-display text-lg italic text-text-primary leading-relaxed">
              "{digest.texture}"
            </p>
          ) : null}
          {digest?.what_created_it && (
            <p className="text-body text-text-secondary-color leading-relaxed">
              {digest.what_created_it}
            </p>
          )}
          {!digest && data.textures.length > 1 && (
            <div className="space-y-2">
              {data.textures.slice(0, 5).map((t, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-micro text-text-muted-color w-14 shrink-0 pt-0.5">
                    {format(parseISO(t.date), "EEE MMM d")}
                  </span>
                  <p className="text-caption italic text-text-secondary-color flex-1">
                    "{t.texture}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* What's working */}
      {(data.givers.length > 0 || data.completedThisWeek.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">What's working</h3>
          {data.givers.length > 0 && (
            <div className="space-y-1.5">
              {dedupe(data.givers).slice(0, 6).map((g, i) => (
                <p key={i} className="text-body text-text-secondary-color leading-relaxed">
                  <span className="text-text-muted-color">+ </span>{g}
                </p>
              ))}
            </div>
          )}
          {data.completedThisWeek.length > 0 && (
            <p className="text-caption italic text-text-muted-color pt-1">
              You moved {data.completedThisWeek.length} {data.completedThisWeek.length === 1 ? "thing" : "things"} through this week.
            </p>
          )}
        </section>
      )}

      {/* The friction points */}
      {(data.drainers.length > 0 || data.overdueOrSoon.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">
            The friction points
          </h3>
          {data.drainers.length > 0 && (
            <div className="space-y-1.5">
              {dedupe(data.drainers).slice(0, 6).map((d, i) => (
                <p key={i} className="text-body text-text-secondary-color leading-relaxed">
                  <span className="text-text-muted-color">− </span>{d}
                </p>
              ))}
            </div>
          )}
          {data.overdueOrSoon.length > 0 && (
            <p className="text-caption italic text-text-muted-color pt-1">
              {data.overdueOrSoon.length} {data.overdueOrSoon.length === 1 ? "thread is" : "threads are"} pressing on you right now.
            </p>
          )}
        </section>
      )}

      {/* The pattern underneath */}
      {(digest?.recurring_patterns || data.threads.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">
            The pattern underneath
          </h3>
          {digest?.recurring_patterns && (
            <p className="text-body text-text-secondary-color leading-relaxed">
              {digest.recurring_patterns}
            </p>
          )}
          {!digest?.recurring_patterns && data.threads.length > 0 && (
            <div className="space-y-1.5">
              {dedupe(data.threads).slice(0, 5).map((t, i) => (
                <p key={i} className="text-body text-text-secondary-color leading-relaxed">
                  • {t}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* What this reveals */}
      {digest?.what_this_reveals && (
        <section className="space-y-3">
          <h3 className="text-label uppercase tracking-wider text-text-muted-color">
            What this reveals
          </h3>
          <p className="font-display text-lg italic text-text-primary leading-relaxed">
            {digest.what_this_reveals}
          </p>
        </section>
      )}

      {/* Closing */}
      <p className="text-caption italic text-text-muted-color text-center pt-4">
        You're carrying a lot, and doing it with more intention than you probably give yourself credit for.
      </p>
    </main>
  );
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const k = s.toLowerCase().trim();
    if (!seen.has(k) && k.length > 0) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}
