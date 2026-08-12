import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLookBack } from "@/hooks/useLookBack";
import { ThemePills } from "@/components/ThemePills";

const OnMyMind = () => {
  const { digest, loading, generating, weekStart, generate, readyForFirst } = useLookBack();

  const weekLabel = new Date(`${weekStart}T00:00:00`).toLocaleDateString([], {
    month: "long",
    day: "numeric",
  });

  const readBackOn = digest
    ? new Date(digest.updatedAt).toLocaleDateString([], { weekday: "long" })
    : null;

  const lookAgain = async () => {
    try {
      await generate();
    } catch {
      toast("Couldn't look back just now.");
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">On my mind</h1>
        <div className="mt-1.5 flex items-center gap-3 text-[0.9rem] text-muted-foreground">
          <span>Week of {weekLabel}</span>
          {digest && !generating && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <button
                onClick={lookAgain}
                className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground/80 hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                Look again
              </button>
            </>
          )}
        </div>
        {readBackOn && !generating && (
          <p className="mt-1 text-[0.8rem] text-muted-foreground/60">Read back {readBackOn}</p>
        )}
      </header>

      {loading ? (
        <p className="text-[0.9rem] text-muted-foreground">Looking back over the week…</p>
      ) : generating ? (
        <p className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Reading back your week…
        </p>
      ) : !digest ? (
        <div className="rounded-[20px] border border-hairline bg-paper/70 px-6 py-10 text-center">
          <p className="font-editorial text-[1.2rem] leading-snug">Nothing pulled together yet.</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
            {readyForFirst
              ? "anren will read this week back shortly."
              : "Once you've left a few notes this week, anren reads them back on its own and suggests what keeps coming up."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="font-editorial text-[1.15rem] leading-[1.6]">{digest.narrative}</p>

          <ThemePills
            items={digest.themes.map((theme) => ({
              label: theme.title,
              detail: theme.detail,
            }))}
          />
        </div>


      )}
    </div>
  );
};

export default OnMyMind;
