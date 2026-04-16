import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Refresh Google access token using refresh_token. Returns new access token. */
async function refreshGoogleToken(
  service: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${await res.text()}`);
  const data = await res.json();
  await service
    .from("user_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      ).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google_calendar");
  return data.access_token;
}

async function syncGoogleCalendar(
  service: SupabaseClient,
  userId: string,
  conn: any
): Promise<{ count: number }> {
  let accessToken = conn.access_token;
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  if (!expiresAt || expiresAt.getTime() < Date.now() + 60_000) {
    if (!conn.refresh_token) throw new Error("token expired, no refresh token");
    accessToken = await refreshGoogleToken(service, userId, conn.refresh_token);
  }

  const timeMin = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
    `&singleEvents=true&orderBy=startTime&maxResults=250`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google calendar fetch failed: ${await res.text()}`);
  const data = await res.json();
  const events = (data.items || []) as any[];

  if (events.length === 0) return { count: 0 };

  const rows = events
    .filter((e) => e.start?.dateTime || e.start?.date)
    .map((e) => ({
      user_id: userId,
      provider: "google_calendar",
      signal_type: "calendar_event",
      external_id: e.id,
      recorded_at: e.start.dateTime || `${e.start.date}T00:00:00Z`,
      value: {
        title: e.summary || "(untitled)",
        start: e.start.dateTime || e.start.date,
        end: e.end?.dateTime || e.end?.date || null,
        location: e.location || null,
        all_day: !e.start.dateTime,
      },
    }));

  const { error } = await service
    .from("health_signals")
    .upsert(rows, { onConflict: "user_id,provider,signal_type,external_id" });
  if (error) throw error;
  return { count: rows.length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    let { provider, user_id } = body as { provider: string; user_id?: string };

    // If user_id not in body (called from client), resolve from auth header
    if (!user_id) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No auth header");
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      user_id = user.id;
    }

    const { data: conn, error: connErr } = await service
      .from("user_connections")
      .select("*")
      .eq("user_id", user_id)
      .eq("provider", provider)
      .eq("status", "active")
      .maybeSingle();
    if (connErr) throw connErr;
    if (!conn) throw new Error("no active connection");

    let result: { count: number };
    try {
      switch (provider) {
        case "google_calendar":
          result = await syncGoogleCalendar(service, user_id, conn);
          break;
        default:
          throw new Error(`sync not implemented for ${provider}`);
      }

      await service
        .from("user_connections")
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq("user_id", user_id)
        .eq("provider", provider);

      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (syncErr: any) {
      await service
        .from("user_connections")
        .update({ last_sync_error: syncErr.message?.slice(0, 500) || "unknown error" })
        .eq("user_id", user_id)
        .eq("provider", provider);
      throw syncErr;
    }
  } catch (e: any) {
    console.error("sync-provider error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
