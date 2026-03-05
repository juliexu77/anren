import { useEffect } from "react";
import { useColorTheme } from "@/contexts/ColorThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useGoogleCalendarList } from "@/hooks/useGoogleCalendarList";
import { cn } from "@/lib/utils";
import { Check, LogOut, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMemo, useCallback, useState } from "react";

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
  const { currentTheme, setTheme, themes } = useColorTheme();
  const { user, signOut } = useAuth();
  const { settings, settingsLoaded, updateSettings } = useDailyBrief();
  const { calendars, loading: calendarsLoading, fetchCalendarList } = useGoogleCalendarList();
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  useEffect(() => {
    if (showCalendarPicker && calendars.length === 0) {
      fetchCalendarList();
    }
  }, [showCalendarPicker, calendars.length, fetchCalendarList]);

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

  const toggleCalendar = useCallback(
    (calId: string) => {
      const current = settings.calendars;
      const next = current.includes(calId)
        ? current.filter((c) => c !== calId)
        : [...current, calId];
      if (next.length === 0) return;
      updateSettings({ calendars: next });
    },
    [settings.calendars, updateSettings]
  );

  return (
    <main className="px-5 pb-8 space-y-8">
      {/* Account */}
      <section>
        <h2 className="text-section-header text-muted-foreground mb-4">Account</h2>
        <div className="rounded-2xl border border-border p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Signed in with Google</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign out
          </Button>
        </div>
      </section>

      {/* Daily Brief */}
      {settingsLoaded && (
        <section>
          <h2 className="text-section-header text-muted-foreground mb-4">Daily Brief</h2>
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
              <>
                {/* Delivery time */}
                <div className="space-y-2">
                  <label className="text-label text-text-muted-color">
                    Delivery time
                  </label>
                  <select
                    value={settings.delivery_time}
                    onChange={handleTimeChange}
                    className="w-full rounded-lg px-3 py-2.5 text-caption appearance-none"
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

                {/* Calendar picker */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCalendarPicker(!showCalendarPicker)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <label className="text-label text-text-muted-color">
                      Calendars
                    </label>
                    <ChevronDown
                      className={cn("w-3.5 h-3.5 transition-transform text-text-muted-color", showCalendarPicker && "rotate-180")}
                    />
                  </button>

                  {!showCalendarPicker && (
                    <p className="text-micro text-text-muted-color">
                      {settings.calendars.includes("primary")
                        ? "Primary calendar"
                        : `${settings.calendars.length} calendar${settings.calendars.length > 1 ? "s" : ""}`}
                    </p>
                  )}

                  {showCalendarPicker && (
                    <div className="space-y-1.5">
                      {calendarsLoading ? (
                        <p className="text-micro py-2 text-text-muted-color">
                          Loading calendars…
                        </p>
                      ) : (
                        <>
                          {calendars.map((cal) => {
                            const isSelected = settings.calendars.includes(cal.id) ||
                              (cal.primary && settings.calendars.includes("primary"));
                            return (
                              <button
                                key={cal.id}
                                onClick={() => toggleCalendar(cal.id)}
                                className={cn(
                                  "flex items-center gap-2.5 w-full py-1.5 px-2 rounded-lg transition-colors",
                                  isSelected ? "bg-surface-color/60" : "bg-transparent"
                                )}
                              >
                                {cal.backgroundColor && (
                                  <div
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ background: cal.backgroundColor }}
                                  />
                                )}
                                <span className="text-caption flex-1 text-left truncate text-text-primary">
                                  {cal.summary}
                                  {cal.primary && (
                                    <span className="text-micro ml-1.5 text-text-muted-color">
                                      (primary)
                                    </span>
                                  )}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 shrink-0 text-accent-1" />
                                )}
                              </button>
                            );
                          })}
                          {settings.calendars.length > 1 && (
                            <p className="text-micro pt-1 text-accent-1">
                              One calendar keeps the brief focused.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Theme */}
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
