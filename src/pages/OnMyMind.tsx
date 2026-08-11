import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Theme {
  title: string;
  detail: string;
}

interface Digest {
  id: string;
  weekStart: string;
  narrative: string;
  themes: Theme[];
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const OnMyMind = () => {
  const { user } = useAuth();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("weekly_digests")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", startOfWeek())
      .maybeSingle();

    setDigest(
      data
        ? {
            id: data.id,
            weekStart: data.week_start,
            narrative: data.narrative,
            themes: Array.isArray(data.themes) ? (data.themes as unknown as Theme[]) : [],
          }
        : null,
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    const { error } = await supabase.functions.invoke("weekly-digest", { body: {} });
    setGenerating(false);
    if (error) {
      toast.error("Couldn't look back just now.");
      return;
    }
    load();
  };

  const weekLabel = new Date(`${startOfWeek()}T00:00:00`).toLocaleDateString([], {
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">On my mind</h1>
          <p className="mt-1.5 text-[0.9rem] text-muted-foreground">Week of {weekLabel}</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 rounded-full border border-hairline bg-paper px-4 py-2 text-[0.82rem] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />}
          {digest ? "Look back" : "Look back"}
        </button>
      </header>

      {loading ? (
        <p className="text-[0.9rem] text-muted-foreground">Looking back over the week…</p>
      ) : !digest ? (
        <div className="rounded-[20px] border border-hairline bg-paper/70 px-6 py-10 text-center">
          <p className="font-editorial text-[1.2rem] leading-snug">Nothing pulled together yet.</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
            Once you've left a few notes this week, anren can read them back and suggest what keeps coming up.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <p className="whitespace-pre-line font-editorial text-[1.08rem] leading-[1.75]">
            {digest.narrative}
          </p>

          {digest.themes.length > 0 && (
            <section>
              <h2 className="mb-4 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                What kept coming up
              </h2>
              <div className="flex flex-col gap-5">
                {digest.themes.map((theme) => (
                  <div key={theme.title}>
                    <h3 className="note-title">{theme.title}</h3>
                    <p className="mt-1.5 text-[0.93rem] leading-[1.7] text-muted-foreground">{theme.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default OnMyMind;
