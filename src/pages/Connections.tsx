import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Heart, Activity, Watch, Zap, Check, Loader2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useConnections, type ConnectionProvider } from "@/hooks/useConnections";
import { useAppleHealth } from "@/hooks/useAppleHealth";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ProviderDef {
  id: ConnectionProvider;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iosOnly?: boolean;
  comingSoon?: boolean;
}

const PROVIDERS: ProviderDef[] = [
  { id: "google_calendar", name: "Google Calendar", description: "See your day in context", icon: Calendar },
  { id: "apple_calendar", name: "Apple Calendar", description: "Native iOS calendar events", icon: Calendar, iosOnly: true, comingSoon: true },
  { id: "whoop", name: "WHOOP", description: "Recovery, strain, and sleep", icon: Activity },
  { id: "oura", name: "Oura", description: "Sleep, readiness, and HRV", icon: Watch },
  { id: "apple_health", name: "Apple Health", description: "Steps, sleep, and workouts", icon: Heart, iosOnly: true },
  { id: "strava", name: "Strava", description: "Runs, rides, and workouts", icon: Zap },
];

export default function Connections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connections, loading, busyProvider, isConnected, getConnection, connect, disconnect, refresh } = useConnections();
  const isNative = Capacitor.isNativePlatform();
  const appleHealth = useAppleHealth();

  // Auto-sync Apple Health on foreground when connected
  appleHealth.useAutoSyncOnForeground(isConnected("apple_health"));

  // Handle return from OAuth flow (?connected=... or ?error=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) {
      toast.success(`Connected to ${connected.replace("_", " ")}`);
      window.history.replaceState({}, "", "/connections");
    }
    if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, "", "/connections");
    }
  }, []);

  const handleAppleHealthToggle = async (currentlyOn: boolean) => {
    if (!user) return;
    if (currentlyOn) {
      // Soft disconnect: mark inactive, keep historical signals
      await supabase
        .from("user_connections")
        .update({ status: "inactive" })
        .eq("user_id", user.id)
        .eq("provider", "apple_health");
      await refresh();
      toast("Disconnected");
      return;
    }
    const ok = await appleHealth.requestAuthorization();
    if (!ok) return;
    const result = await appleHealth.syncNow();
    if (result) {
      toast.success(`Apple Health connected · ${result.count} samples`);
      await refresh();
    }
  };

  const handleToggle = async (provider: ProviderDef, currentlyOn: boolean) => {
    if (provider.comingSoon) {
      toast("Coming soon");
      return;
    }
    if (provider.iosOnly && !isNative) {
      toast("Available on the iOS app");
      return;
    }
    if (provider.id === "apple_health") {
      await handleAppleHealthToggle(currentlyOn);
      return;
    }
    if (currentlyOn) {
      await disconnect(provider.id);
      toast("Disconnected");
    } else {
      const { url, error } = await connect(provider.id);
      if (error) {
        toast.error(error);
        return;
      }
      if (url) {
        window.location.href = url;
      }
    }
  };

  const activeCount = connections.filter((c) => c.status === "active").length;

  return (
    <main className="min-h-screen px-5 pb-12 pt-6 max-w-2xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-foreground/5"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
        <div>
          <h1 className="text-display text-text-primary font-serif">Connections</h1>
          <p className="text-xs text-text-muted-color mt-0.5">
            {activeCount} of {PROVIDERS.length} active
          </p>
        </div>
      </header>

      <p className="text-sm text-text-muted-color mb-6 leading-relaxed">
        Connect the tools that already know how you're moving through your week.
        Anren weaves them into your weekly review—no dashboards, just context.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted-color" />
        </div>
      ) : (
        <ul className="space-y-2">
          {PROVIDERS.map((p) => {
            const conn = getConnection(p.id);
            const on = isConnected(p.id);
            const busy = busyProvider === p.id || (p.id === "apple_health" && appleHealth.busy);
            const Icon = p.icon;
            const lastSync = conn?.last_synced_at
              ? formatDistanceToNow(new Date(conn.last_synced_at), { addSuffix: true })
              : null;

            return (
              <li
                key={p.id}
                className="rounded-2xl border border-divider-color/25 p-4 flex items-center gap-4 bg-card-bg-color/40"
              >
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-text-muted-color" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                    {on && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-text-muted-color truncate">
                    {p.comingSoon
                      ? "Coming soon"
                      : p.iosOnly && !isNative
                      ? "Available on the iOS app"
                      : conn?.last_sync_error
                      ? "Sync error — tap to retry"
                      : lastSync
                      ? `Last synced ${lastSync}`
                      : p.description}
                  </p>
                </div>
                {busy ? (
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted-color shrink-0" />
                ) : conn?.last_sync_error ? (
                  <AlertCircle className="w-5 h-5 text-text-muted-color shrink-0" />
                ) : (
                  <Switch
                    checked={on}
                    onCheckedChange={() => handleToggle(p, on)}
                    disabled={p.comingSoon || (p.iosOnly && !isNative)}
                    aria-label={`Toggle ${p.name}`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-text-muted-color mt-8 leading-relaxed">
        Connections sync every few minutes in the background. Apple Health syncs when you open the app.
        Disconnecting stops syncing but keeps the data we already have.
      </p>
    </main>
  );
}
