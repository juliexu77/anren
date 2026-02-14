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
                  "relative rounded-xl p-4 text-left transition-all duration-200",
                  "border",
                  isActive
                    ? "border-[var(--glass-border)] shadow-[0_0_20px_var(--glass-shadow)]"
                    : "border-[var(--glass-border-subtle)] hover:border-[var(--glass-border)]"
                )}
                style={{
                  background: 'linear-gradient(180deg, var(--glass-overlay-start), var(--glass-overlay-end))',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {/* Color preview */}
                <div className="flex gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ background: `hsl(${theme.bgPrimary})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ background: `hsl(${theme.accentHsl})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ background: `hsl(${theme.secondaryHsl})` }}
                  />
                </div>

                <p className="text-sm font-semibold text-foreground">{theme.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>

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
