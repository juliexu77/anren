import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * OAuth callback handler. Receives ?code=...&state=... from the provider,
 * exchanges code for tokens, stores them in user_connections, and redirects
 * the user back to /connections with a success/error flag.
 *
 * This function is called by the browser (no JWT) — auth is bound to state.user_id
 * which is signed-back via the OAuth provider after we set it in the auth URL.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // App origin to redirect back to. Default to production; can be overridden via state.origin.
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

    if (state.provider === "google_calendar") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          redirect_uri: callbackUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) {
        const t = await tokenRes.text();
        console.error("Google token exchange failed:", t);
        return redirectBack(`error=${encodeURIComponent("token_exchange_failed")}`);
      }
      const tokens = await tokenRes.json();

      await service.from("user_connections").upsert(
        {
          user_id: state.user_id,
          provider: "google_calendar",
          status: "active",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: new Date(
            Date.now() + (tokens.expires_in || 3600) * 1000
          ).toISOString(),
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
        body: JSON.stringify({ provider: "google_calendar", user_id: state.user_id }),
      }).catch((e) => console.error("initial sync dispatch failed:", e));

      return redirectBack(`connected=google_calendar`);
    }

    return redirectBack(`error=${encodeURIComponent("unsupported_provider")}`);
  } catch (e: any) {
    console.error("connections-callback error:", e);
    return redirectBack(`error=${encodeURIComponent(e.message)}`);
  }
});
