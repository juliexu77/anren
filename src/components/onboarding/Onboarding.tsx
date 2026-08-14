import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDS = 5;

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Walks a demo through timed beats. `key` restarts it; with reduced motion it
 * lands on the last beat immediately.
 */
function useStages(delays: number[], key: number) {
  const reduced = useMemo(prefersReducedMotion, []);
  const [stage, setStage] = useState(reduced ? delays.length : 0);

  useEffect(() => {
    if (reduced) {
      setStage(delays.length);
      return;
    }
    setStage(0);
    const timers = delays.map((at, i) => window.setTimeout(() => setStage(i + 1), at));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  return { stage, reduced };
}

/** Types text out the way a live transcript arrives. */
function Typed({
  text,
  active,
  speed = 26,
  className,
}: {
  text: string;
  active: boolean;
  speed?: number;
  className?: string;
}) {
  const reduced = useMemo(prefersReducedMotion, []);
  const [shown, setShown] = useState(reduced ? text.length : 0);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, active, speed, reduced]);

  if (!active) return null;
  return <span className={className}>{text.slice(0, shown)}</span>;
}

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full rounded-[20px] border border-hairline bg-paper/80 px-5 py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Pill({ label, delay }: { label: string; delay: number }) {
  return (
    <span
      className="rounded-full border border-hairline bg-paper/70 px-3 py-1.5 text-[0.78rem] leading-none text-muted-foreground animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {label}
    </span>
  );
}

/* ---------- Card 2: capture → write-up ---------- */

const SPOKEN = [
  "I keep circling the same thing about the move —",
  "it's not the flat, it's leaving the morning walk.",
  "Told Sam I'd decide by Sunday.",
];

function CaptureDemo({ runKey }: { runKey: number }) {
  const { stage } = useStages([200, 2600, 5200, 6400], runKey);

  return (
    <Frame>
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {stage >= 1 && stage < 3 && (
            <span className="absolute inset-0 animate-ripple rounded-full bg-primary/25" />
          )}
          {stage >= 1 && stage < 3 ? (
            <Square className="relative h-3.5 w-3.5" strokeWidth={2} fill="currentColor" />
          ) : (
            <Mic className="relative h-[18px] w-[18px]" strokeWidth={1.6} />
          )}
        </span>
        <p className="text-[0.85rem] tabular-nums text-muted-foreground">
          {stage >= 1 && stage < 3 ? "0:14" : "listening"}
        </p>
      </div>

      <div className="mt-4 min-h-[86px] text-[0.9rem] leading-[1.6] text-muted-foreground">
        {stage >= 1 && (
          <p>
            <Typed text={SPOKEN[0]} active={stage >= 1} />{" "}
            <Typed text={SPOKEN[1]} active={stage >= 2} />{" "}
            <Typed text={SPOKEN[2]} active={stage >= 3} />
          </p>
        )}
      </div>

      {stage === 3 && (
        <p className="mt-2 text-[0.82rem] italic text-muted-foreground/70">anren is writing it up…</p>
      )}

      {stage >= 4 && (
        <div className="mt-4 border-t border-hairline pt-4 animate-fade-up">
          <h4 className="font-editorial text-[1.15rem] leading-snug">Deciding about the move</h4>
          <p className="mt-2 text-[0.9rem] leading-[1.6] text-muted-foreground">
            The flat isn't the question. What you'd be giving up is the morning walk — and you've
            given yourself until Sunday to answer it.
          </p>
        </div>
      )}
    </Frame>
  );
}

/* ---------- Card 3: filing → folder reading ---------- */

const ROWS = ["Deciding about the move", "Walk, Tuesday morning", "Call with Sam"];

function FolderDemo({ runKey }: { runKey: number }) {
  const { stage } = useStages([200, 1800, 3000, 4200, 5400], runKey);

  return (
    <Frame>
      <div className="flex flex-col">
        {ROWS.map((row, i) => (
          <p
            key={row}
            className={cn(
              "border-b border-hairline py-2.5 text-[0.9rem] transition-all duration-500 last:border-b-0",
              stage >= 3 + i ? "translate-x-3 text-muted-foreground/50" : "text-foreground",
            )}
          >
            {row}
          </p>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={cn(
            "text-[1rem] transition-opacity duration-700",
            stage >= 2 ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          ✦
        </span>
        <p className="text-[0.9rem]">
          <Typed text="The move" active={stage >= 1} speed={70} />
        </p>
      </div>

      {stage >= 5 && (
        <div className="mt-4 border-t border-hairline pt-4 animate-fade-up">
          <p className="font-editorial text-[1.08rem] leading-[1.6]">
            Across these three, the decision keeps turning on a small daily thing rather than the
            big one you keep naming.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["quiet mornings", "deferred", "loyal to Sam", "almost decided"].map((label, i) => (
              <Pill key={label} label={label} delay={200 + i * 240} />
            ))}
          </div>
        </div>
      )}
    </Frame>
  );
}

/* ---------- Card 4: the weekly reading ---------- */

function ReflectDemo({ runKey }: { runKey: number }) {
  const { stage } = useStages([300, 2800], runKey);

  return (
    <Frame>
      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground/70">
        This week
      </p>
      <div className="mt-3 min-h-[92px] font-editorial text-[1.08rem] leading-[1.6]">
        <Typed
          text="You spent the week talking yourself toward one answer and then setting it back down. The hesitation isn't doubt — it's care."
          active={stage >= 1}
          speed={18}
        />
      </div>
      {stage >= 2 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {["circling", "tender", "nearly there", "held back"].map((label, i) => (
            <Pill key={label} label={label} delay={i * 260} />
          ))}
        </div>
      )}
    </Frame>
  );
}

/* ---------- The overlay ---------- */

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [card, setCard] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const closed = useRef(false);

  const done = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    onDone();
  }, [onDone]);

  const next = () => {
    if (card >= CARDS - 1) {
      done();
      return;
    }
    setCard((c) => c + 1);
    setRunKey((k) => k + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") done();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done]);

  const replayable = card === 1 || card === 2 || card === 3;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: CARDS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-[3px] w-6 rounded-full transition-colors",
                i <= card ? "bg-foreground/40" : "bg-foreground/10",
              )}
            />
          ))}
        </div>
        <button
          onClick={done}
          className="text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground"
        >
          skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-[26rem]">
          {card === 0 && (
            <div className="text-center animate-fade-up">
              <h1 className="font-editorial text-[2.4rem] leading-none tracking-[-0.01em]">anren</h1>
              <p className="mt-3 font-editorial text-[1.15rem] leading-snug text-muted-foreground">
                where the mental load rests
              </p>
              <p className="mt-6 text-[0.94rem] leading-[1.65] text-muted-foreground">
                You talk. anren keeps the thought — and later, tells you what you've been circling.
              </p>
            </div>
          )}

          {card === 1 && (
            <div className="animate-fade-up">
              <h2 className="font-editorial text-[1.5rem] leading-snug">Say it once</h2>
              <p className="mb-5 mt-2 text-[0.92rem] leading-[1.6] text-muted-foreground">
                Press the mic and speak plainly. anren transcribes it and writes it up for you.
              </p>
              <CaptureDemo runKey={runKey} />
            </div>
          )}

          {card === 2 && (
            <div className="animate-fade-up">
              <h2 className="font-editorial text-[1.5rem] leading-snug">Put a few together</h2>
              <p className="mb-5 mt-2 text-[0.92rem] leading-[1.6] text-muted-foreground">
                Projects emerge as you talk — anren notices what your notes belong to and reads across them to tell you what they have
                in common.
              </p>
              <FolderDemo runKey={runKey} />
            </div>
          )}

          {card === 3 && (
            <div className="animate-fade-up">
              <h2 className="font-editorial text-[1.5rem] leading-snug">Watch it take shape</h2>
              <p className="mb-5 mt-2 text-[0.92rem] leading-[1.6] text-muted-foreground">
                When you keep circling something, anren says so on your home screen — and you decide
                whether it's a project worth keeping.
              </p>
              <ReflectDemo runKey={runKey} />
            </div>
          )}


          {card === 4 && (
            <div className="text-center animate-fade-up">
              <h2 className="font-editorial text-[1.9rem] leading-tight">Say something when you're ready.</h2>
              <p className="mt-3 text-[0.94rem] leading-[1.65] text-muted-foreground">
                Nothing to set up. Home is a blank page with the mic waiting in the middle.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {replayable ? (
          <button
            onClick={() => setRunKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            play it again
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={next}
          className="rounded-full bg-primary px-6 py-3 text-[0.9rem] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {card === CARDS - 1 ? "Start" : "Next"}
        </button>
      </div>
    </div>
  );
}
