import { Loader2 } from "lucide-react";

interface Props {
  plan: string[] | null;
  loading: boolean;
}

export function RunMyDay({ plan, loading }: Props) {
  if (loading) {
    return (
      <div className="orientation-card flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-text-muted-color" />
        <span className="text-caption italic text-text-muted-color">
          Thinking about your day…
        </span>
      </div>
    );
  }

  if (!plan || plan.length === 0) return null;

  return (
    <div className="orientation-card">
      <div className="space-y-2">
        {plan.map((line, i) => (
          <p key={i} className="text-caption font-sans text-text-secondary-color leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
