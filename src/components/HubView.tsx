import { Home, Users } from "lucide-react";

interface Props {
  onNavigate: (view: "home" | "people") => void;
}

export function HubView({ onNavigate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-8" style={{ minHeight: "60vh" }}>
      <div className="w-full max-w-sm space-y-4">
        {/* Home card */}
        <button
          onClick={() => onNavigate("home")}
          className="w-full rounded-xl p-6 text-left transition-all duration-200 active:scale-[0.98]"
          style={{
            background: "hsl(var(--card-bg))",
            border: "1px solid hsl(var(--card-border))",
            boxShadow: "0 1px 3px var(--card-shadow), 0 4px 12px var(--card-shadow)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "hsl(var(--accent-1) / 0.12)",
              }}
            >
              <Home className="w-5 h-5" style={{ color: "hsl(var(--accent-1))" }} />
            </div>
            <div>
              <h2 className="text-h3 font-display text-foreground">Home</h2>
              <p className="text-caption text-muted-foreground mt-0.5">
                Your mental load, organized
              </p>
            </div>
          </div>
        </button>

        {/* People card */}
        <button
          onClick={() => onNavigate("people")}
          className="w-full rounded-xl p-6 text-left transition-all duration-200 active:scale-[0.98]"
          style={{
            background: "hsl(var(--card-bg))",
            border: "1px solid hsl(var(--card-border))",
            boxShadow: "0 1px 3px var(--card-shadow), 0 4px 12px var(--card-shadow)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "hsl(var(--secondary) / 0.12)",
              }}
            >
              <Users className="w-5 h-5" style={{ color: "hsl(var(--secondary))" }} />
            </div>
            <div>
              <h2 className="text-h3 font-display text-foreground">People</h2>
              <p className="text-caption text-muted-foreground mt-0.5">
                Tend your circle
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
