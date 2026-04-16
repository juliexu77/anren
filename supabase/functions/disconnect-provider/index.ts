import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { provider } = await req.json();

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch tokens to attempt revocation (best effort)
    const { data: conn } = await service
      .from("user_connections")
      .select("access_token, refresh_token")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();

    if (provider === "google_calendar" && conn?.access_token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${conn.access_token}`, {
        method: "POST",
      }).catch(() => {});
    }

    // Mark inactive and clear tokens (keep cached health_signals per design)
    await service
      .from("user_connections")
      .update({
        status: "inactive",
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
      })
      .eq("user_id", user.id)
      .eq("provider", provider);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("disconnect-provider error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
