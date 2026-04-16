import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ConnectionProvider =
  | "google_calendar"
  | "apple_calendar"
  | "whoop"
  | "oura"
  | "apple_health"
  | "strava";

export interface UserConnection {
  id: string;
  provider: ConnectionProvider;
  status: "active" | "inactive" | "error";
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

export function useConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<ConnectionProvider | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_connections")
      .select("id, provider, status, last_synced_at, last_sync_error, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error && data) setConnections(data as UserConnection[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const isConnected = useCallback(
    (provider: ConnectionProvider) =>
      connections.some((c) => c.provider === provider && c.status === "active"),
    [connections]
  );

  const getConnection = useCallback(
    (provider: ConnectionProvider) =>
      connections.find((c) => c.provider === provider) || null,
    [connections]
  );

  /** Start OAuth or native flow for a provider. Returns auth URL when applicable. */
  const connect = useCallback(
    async (provider: ConnectionProvider): Promise<{ url?: string; error?: string }> => {
      setBusyProvider(provider);
      try {
        const { data, error } = await supabase.functions.invoke("connect-provider", {
          body: { provider, origin: window.location.origin },
        });
        if (error) return { error: error.message };
        return { url: data?.url };
      } catch (e: any) {
        return { error: e.message };
      } finally {
        setBusyProvider(null);
      }
    },
    []
  );

  const disconnect = useCallback(
    async (provider: ConnectionProvider) => {
      setBusyProvider(provider);
      try {
        await supabase.functions.invoke("disconnect-provider", { body: { provider } });
        await fetchConnections();
      } finally {
        setBusyProvider(null);
      }
    },
    [fetchConnections]
  );

  const syncNow = useCallback(
    async (provider: ConnectionProvider) => {
      setBusyProvider(provider);
      try {
        await supabase.functions.invoke("sync-provider", { body: { provider } });
        await fetchConnections();
      } finally {
        setBusyProvider(null);
      }
    },
    [fetchConnections]
  );

  return {
    connections,
    loading,
    busyProvider,
    isConnected,
    getConnection,
    connect,
    disconnect,
    syncNow,
    refresh: fetchConnections,
  };
}
