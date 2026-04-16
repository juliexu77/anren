import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Iterates active connections and triggers per-provider sync.
 * Called by pg_cron every 5 minutes. No JWT required (cron uses service role).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: connections, error } = await service
    .from("user_connections")
    .select("user_id, provider, last_synced_at")
    .eq("status", "active");

  if (error) {
    console.error("sync-all-active fetch error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Throttle: skip if synced within the last 4 minutes (cron is 5min cadence)
  const cutoff = Date.now() - 4 * 60 * 1000;
  const due = (connections || []).filter(
    (c) => !c.last_synced_at || new Date(c.last_synced_at).getTime() < cutoff
  );

  console.log(`sync-all-active: ${due.length} due of ${connections?.length || 0}`);

  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const results = await Promise.allSettled(
    due.map((c) =>
      fetch(`${baseUrl}/functions/v1/sync-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ provider: c.provider, user_id: c.user_id }),
      })
    )
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - ok;

  return new Response(JSON.stringify({ dispatched: results.length, ok, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
