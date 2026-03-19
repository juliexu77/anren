import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  onDismiss: () => void;
}

export function DailyBriefOverlay({ onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 60_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 animate-in fade-in duration-700 bg-bg-color">
      <button
        onClick={onDismiss}
        className="absolute top-14 right-5 p-2 rounded-lg transition-colors text-text-muted-color"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-sm w-full space-y-6">
        <h1
          className="text-h2 text-center text-text-primary"
          style={{ fontFamily: "var(--font-serif)", fontWeight: 400 }}
        >
          Your day
        </h1>

        <div className="sanctuary-card px-5 py-4 bg-card-bg-color/60">
          <p className="text-body-sm font-sans text-text-secondary-color leading-relaxed">
            Take a breath. You're here.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="sanctuary-btn w-full py-3 text-button bg-surface-color/70"
        >
          I'm ready
        </button>
      </div>
    </div>
  );
}
