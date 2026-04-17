import { useColorTheme } from "@/contexts/ColorThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { cn } from "@/lib/utils";
import { Check, LogOut, Bell, BookUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsPartnerSection } from "@/components/SettingsPartnerSection";

/** Convert "HH:MM:SS" → display "h:mm AM/PM" */
function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Generate all 15-min slots */
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`);
    }
  }
  return slots;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { currentTheme, setTheme, themes } = useColorTheme();
  const { user, signOut } = useAuth();
  const { settings, settingsLoaded, updateSettings } = useDailyBrief();

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateSettings({ delivery_time: e.target.value });
    },
    [updateSettings]
  );

  const handleToggle = useCallback(
    (enabled: boolean) => {
      updateSettings({ enabled });
    },
    [updateSettings]
  );

  return (
    <main className="px-5 pb-8 space-y-8">
      {/* Account */}
      <section>
        <h2 className="text-section-header text-text-muted-color mb-4">Account</h2>
        <div className="rounded-2xl border border-divider-color/25 p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.email}</p>
            <p className="text-xs text-text-muted-color">Signed in with Google</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign out
          </Button>
        </div>
      </section>

      {/* Address Book */}
      <section>
        <h2 className="text-section-header text-text-muted-color mb-4">Address Book</h2>
        <button
          onClick={() => navigate("/address-book")}
          className="w-full rounded-2xl border border-divider-color/25 p-4 flex items-center gap-3 hover:bg-foreground/5 transition-colors"
        >
          <BookUser className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Manage Address Book</p>
            <p className="text-xs text-muted-foreground">Import, edit, and export for Minted</p>
          </div>
        </button>
      </section>


      {/* Partner */}
      <SettingsPartnerSection />

      {/* Daily Brief */}
      {settingsLoaded && (
        <section>
          <h2 className="text-section-header text-text-muted-color mb-4">Daily Brief</h2>
          <div className="rounded-2xl border border-divider-color/25 p-4 space-y-4 bg-card-bg-color/50">
            {/* Enable / disable */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-text-muted-color" />
                <span className="text-caption text-text-primary">
                  Morning brief
                </span>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={handleToggle} />
            </div>

            {settings.enabled && (
              <div className="space-y-2">
                <label className="text-label text-text-muted-color">
                  Delivery time
                </label>
                <select
                  value={settings.delivery_time}
                  onChange={handleTimeChange}
                  className="w-full rounded-lg px-3 py-2.5 text-caption appearance-none bg-surface-color text-text-primary border border-divider-color/25"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatTime(slot)}
                    </option>
                  ))}
                </select>
                <p className="text-micro text-text-muted-color">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Theme */}
      <section>
        <h2 className="text-section-header text-text-muted-color mb-4">Theme</h2>
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
                style={{ background: `hsl(${theme.cardBg})` }}
              >
                <div className="flex gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full border border-black/5" style={{ background: `hsl(${theme.bgPrimary})` }} />
                  <div className="w-8 h-8 rounded-full" style={{ background: `hsl(${theme.accent1})` }} />
                  <div className="w-8 h-8 rounded-full" style={{ background: `hsl(${theme.accent2})` }} />
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
