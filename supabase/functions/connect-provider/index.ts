import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED = ["google_calendar", "whoop", "oura", "strava"] as const;
type Provider = typeof SUPPORTED[number];

function callbackUri() {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/connections-callback`;
}

function googleCalendarUrl(userId: string, appOrigin: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent",
    state: JSON.stringify({ provider: "google_calendar", user_id: userId, origin: appOrigin }),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function whoopUrl(userId: string, appOrigin: string) {
  const clientId = Deno.env.get("WHOOP_CLIENT_ID");
  if (!clientId) throw new Error("WHOOP_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUri(),
    response_type: "code",
    scope: "read:recovery read:cycles read:sleep read:workout read:profile offline",
    state: JSON.stringify({ provider: "whoop", user_id: userId, origin: appOrigin }),
  });
  return `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;
}

function ouraUrl(userId: string, appOrigin: string) {
  const clientId = Deno.env.get("OURA_CLIENT_ID");
  if (!clientId) throw new Error("OURA_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUri(),
    response_type: "code",
    scope: "personal daily heartrate workout session",
    state: JSON.stringify({ provider: "oura", user_id: userId, origin: appOrigin }),
  });
  return `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`;
}

function stravaUrl(userId: string, appOrigin: string) {
  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  if (!clientId) throw new Error("STRAVA_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUri(),
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state: JSON.stringify({ provider: "strava", user_id: userId, origin: appOrigin }),
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { provider, origin } = await req.json();
    const appOrigin = origin || "https://anren.app";
    if (!SUPPORTED.includes(provider)) {
      return new Response(
        JSON.stringify({ error: `Provider ${provider} not yet supported` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let url: string;
    switch (provider as Provider) {
      case "google_calendar":
        url = googleCalendarUrl(user.id, appOrigin);
        break;
      case "whoop":
        url = whoopUrl(user.id, appOrigin);
        break;
      case "oura":
        url = ouraUrl(user.id, appOrigin);
        break;
      case "strava":
        url = stravaUrl(user.id, appOrigin);
        break;
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("connect-provider error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
