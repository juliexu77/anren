import { useColorTheme } from "@/contexts/ColorThemeContext";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function SettingsPage() {
  const { currentTheme, setTheme, themes } = useColorTheme();

  return (
    <main className="px-5 pb-8">
      <section>
        <h2 className="text-section-header text-muted-foreground mb-4">Theme</h2>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => {
            const isActive = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={cn(
                  "relative rounded-2xl p-4 text-left transition-all duration-200",
                  "border",
                  isActive
                    ? "border-primary/40 shadow-md"
                    : "border-border hover:border-primary/20 hover:shadow-sm"
                )}
                style={{
                  background: `hsl(${theme.cardBg})`,
                }}
              >
                {/* Color preview */}
                <div className="flex gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full border border-black/5"
                    style={{ background: `hsl(${theme.bgPrimary})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ background: `hsl(${theme.accent1})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ background: `hsl(${theme.accent2})` }}
                  />
                </div>

                <p className="text-sm font-medium" style={{ color: `hsl(${theme.textPrimary})` }}>{theme.name}</p>
                <p className="text-xs mt-0.5" style={{ color: `hsl(${theme.textMuted})` }}>{theme.description}</p>

                {isActive && (
                  <div className="absolute top-3 right-3">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
