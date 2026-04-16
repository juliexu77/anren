import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * OAuth callback handler. Exchanges code for tokens for any supported provider,
 * stores tokens in user_connections, kicks off an initial sync, then redirects
 * the browser back to /connections with a status flag.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const APP_ORIGIN_DEFAULT = "https://anren.app";
  const redirectBack = (origin: string, qs: string) =>
    Response.redirect(`${origin}/connections?${qs}`, 302);

  if (error) return redirectBack(APP_ORIGIN_DEFAULT, `error=${encodeURIComponent(error)}`);
  if (!code || !stateRaw) return redirectBack(APP_ORIGIN_DEFAULT, "error=missing_code");

  let state: { provider: string; user_id: string; origin?: string };
  try {
    state = JSON.parse(stateRaw);
  } catch {
    return redirectBack(APP_ORIGIN_DEFAULT, "error=invalid_state");
  }
  const appOrigin = state.origin || APP_ORIGIN_DEFAULT;

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const callbackUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/connections-callback`;

    type TokenExchange = {
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      extraBody?: Record<string, string>;
      authHeader?: boolean; // some providers want client creds in Basic auth
    };

    let cfg: TokenExchange | null = null;

    switch (state.provider) {
      case "google_calendar":
        cfg = {
          tokenUrl: "https://oauth2.googleapis.com/token",
          clientId: Deno.env.get("GOOGLE_CLIENT_ID")!,
          clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        };
        break;
      case "whoop":
        cfg = {
          tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
          clientId: Deno.env.get("WHOOP_CLIENT_ID")!,
          clientSecret: Deno.env.get("WHOOP_CLIENT_SECRET")!,
        };
        break;
      case "oura":
        cfg = {
          tokenUrl: "https://api.ouraring.com/oauth/token",
          clientId: Deno.env.get("OURA_CLIENT_ID")!,
          clientSecret: Deno.env.get("OURA_CLIENT_SECRET")!,
        };
        break;
      case "strava":
        cfg = {
          tokenUrl: "https://www.strava.com/api/v3/oauth/token",
          clientId: Deno.env.get("STRAVA_CLIENT_ID")!,
          clientSecret: Deno.env.get("STRAVA_CLIENT_SECRET")!,
        };
        break;
      default:
        return redirectBack(appOrigin, `error=${encodeURIComponent("unsupported_provider")}`);
    }

    const body: Record<string, string> = {
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: callbackUri,
      grant_type: "authorization_code",
      ...(cfg.extraBody || {}),
    };

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.error(`${state.provider} token exchange failed:`, t);
      return redirectBack(appOrigin, `error=${encodeURIComponent("token_exchange_failed")}`);
    }
    const tokens = await tokenRes.json();

    // Strava returns expires_at (epoch seconds) instead of expires_in
    const expiresAt = tokens.expires_at
      ? new Date(tokens.expires_at * 1000).toISOString()
      : new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    await service.from("user_connections").upsert(
      {
        user_id: state.user_id,
        provider: state.provider,
        status: "active",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt,
        last_sync_error: null,
      },
      { onConflict: "user_id,provider" }
    );

    // Fire-and-forget initial sync
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-provider`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ provider: state.provider, user_id: state.user_id }),
    }).catch((e) => console.error("initial sync dispatch failed:", e));

    return redirectBack(appOrigin, `connected=${state.provider}`);
  } catch (e: any) {
    console.error("connections-callback error:", e);
    return redirectBack(appOrigin, `error=${encodeURIComponent(e.message)}`);
  }
});
